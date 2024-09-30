// src/tasks/sshIntoMachine.mjs

import inquirer from "inquirer";
import fs from "fs";
import { spawn } from "child_process"; // Import spawn from child_process
import { AwsCliError, getRunningInstances } from "../utils/awsHelpers.mjs";

export async function sshIntoMachine() {
  console.log("\n=== SSH into the Machine ===");

  try {
    // List running EC2 instances
    const instances = await getRunningInstances();
    if (instances.length === 0) {
      console.log("No running EC2 instances found.");
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
        message: "Select an EC2 Instance to SSH into:",
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
        `Key Pair file '${keyName}.pem' not found. Cannot SSH into the instance.`
      );
      return;
    }

    // Get Public IP Address
    const publicIp = instance.PublicIpAddress;

    // Determine SSH Username Based on AMI
    // Common usernames:
    // - Amazon Linux 2: ec2-user
    // - Ubuntu: ubuntu
    // - CentOS: centos
    // - RHEL: ec2-user or root
    // Adjust accordingly or make it dynamic if needed
    let sshUsername = "ec2-user"; // Default for Amazon Linux 2

    console.log(
      `\nSSH command: ssh -i ${keyName}.pem ${sshUsername}@${publicIp}`
    );

    // Optional: Execute SSH command (requires user interaction)
    const { proceed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Do you want to SSH into the instance now?",
        default: false,
      },
    ]);

    if (proceed) {
      // Wrap the SSH process in a Promise to await it
      await new Promise((resolve, reject) => {
        // Spawn the SSH process with inherited stdio for interaction
        const sshProcess = spawn(
          "ssh",
          ["-i", `${keyName}.pem`, `${sshUsername}@${publicIp}`],
          {
            stdio: "inherit", // Inherit stdio to allow user interaction
          }
        );

        // Handle process exit
        sshProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`\nSSH process exited with code ${code}`);
            reject(new AwsCliError(`SSH exited with code ${code}`));
          } else {
            console.log(`\nSSH session ended successfully.`);
            resolve();
          }
        });

        // Handle errors
        sshProcess.on("error", (error) => {
          console.error(`\nFailed to start SSH process: ${error.message}`);
          reject(
            new AwsCliError(`Failed to start SSH process: ${error.message}`)
          );
        });
      });
    }
  } catch (error) {
    throw error;
  }
}
