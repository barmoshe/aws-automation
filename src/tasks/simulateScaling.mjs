import inquirer from "inquirer";
import { $, AwsCliError, getRunningInstances } from "../utils/awsHelpers.mjs";
import { sshIntoMachine } from "./sshIntoMachine.mjs";

export async function simulateScaling() {
  try {
    console.log("\n=== Simulate Scaling Down/UP ===");

    // List running EC2 instances (only ASG instances will be returned)
    const instances = await getRunningInstances();
    if (instances.length === 0) {
      console.log("No running EC2 instances in Auto Scaling Groups found.");
      return;
    }

    // Filter instances with Public IPs
    const instancesWithPublicIp = instances.filter(
      (inst) => inst.PublicIpAddress
    );

    if (instancesWithPublicIp.length === 0) {
      console.log("No running EC2 instances with public IP addresses found.");
      return;
    }

    // Prompt user to select an instance
    const { instanceId } = await inquirer.prompt([
      {
        type: "list",
        name: "instanceId",
        message: "Select an EC2 Instance to simulate scaling on:",
        choices: instancesWithPublicIp.map((inst) => ({
          name: `${inst.InstanceId} (${inst.PublicIpAddress})`,
          value: inst.InstanceId,
        })),
      },
    ]);

    // Get selected instance details
    const instance = instancesWithPublicIp.find(
      (inst) => inst.InstanceId === instanceId
    );
    const publicIp = instance.PublicIpAddress;

    // Prompt user to choose scaling simulation (up/down)
    const { simulationType } = await inquirer.prompt([
      {
        type: "list",
        name: "simulationType",
        message: "Do you want to simulate Scaling Up or Scaling Down?",
        choices: [
          { name: "Simulate Scaling Up (Generate High CPU Load)", value: "up" },
          { name: "Simulate Scaling Down (Stop CPU Load)", value: "down" },
        ],
      },
    ]);

    if (simulationType === "up") {
      console.log("\nSimulating Scaling Up by generating CPU load...");
      await sshIntoMachine(publicIp, instance.KeyName, "stress --cpu 4 --timeout 300");
    } else {
      console.log("\nSimulating Scaling Down by stopping CPU load...");
      await sshIntoMachine(publicIp, instance.KeyName, "pkill stress");
    }
  } catch (error) {
    throw new AwsCliError("Error simulating scaling", error.message);
  }
}
