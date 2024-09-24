import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import { AwsCliError } from "../helpers/errorHandlers.js";
import { getRunningInstances } from "../helpers/awsHelpers.js";
import { $, question } from "zx";

export default async function sshIntoMachine() {
  console.log(chalk.cyan("\n=== SSH into EC2 Instance ==="));

  try {
    // List running EC2 instances
    const instances = await getRunningInstances();
    if (instances.length === 0) {
      console.log(chalk.red("No running EC2 instances found."));
      return;
    }

    // Filter instances with Public IPs
    const instancesWithPublicIp = instances.filter(
      (inst) => inst.PublicIpAddress
    );

    if (instancesWithPublicIp.length === 0) {
      console.log(
        chalk.red("No running EC2 instances with public IP addresses found.")
      );
      return;
    }

    // Prompt user to select an instance
    const { instanceId } = await inquirer.prompt([
      {
        type: "list",
        name: "instanceId",
        message: chalk.yellow("Select an EC2 Instance to SSH into:"),
        choices: instancesWithPublicIp.map((inst) => ({
          name: `${inst.Name || "Unnamed Instance"} (${inst.InstanceId}, ${
            inst.PublicIpAddress
          })`,
          value: inst.InstanceId,
        })),
      },
    ]);

    // Get Key Pair name associated with the instance
    const instance = instancesWithPublicIp.find(
      (inst) => inst.InstanceId === instanceId
    );
    const keyName = instance.KeyName;

    // Check if Key Pair file exists
    if (!keyName || !fs.existsSync(`./${keyName}.pem`)) {
      console.log(
        chalk.red(
          `Key Pair file '${keyName}.pem' not found. Cannot SSH into the instance.`
        )
      );
      return;
    }

    // Get Public IP Address
    const publicIp = instance.PublicIpAddress;

    console.log(
      chalk.green(`\nSSH command: ssh -i ${keyName}.pem ec2-user@${publicIp}`)
    );

    // Optional: Execute SSH command (requires user interaction)
    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: chalk.yellow("Do you want to SSH into the instance now?"),
        default: false,
      },
    ]);

    if (proceed) {
      try {
        await $`ssh -i ${keyName}.pem ec2-user@${publicIp}`;
      } catch (error) {
        throw new Error(
          `Error during SSH session: ${error.stderr || error.message}`
        );
      }
    }
  } catch (error) {
    throw error;
  }
}
