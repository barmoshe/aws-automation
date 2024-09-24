import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { AwsCliError, ValidationError } from "../helpers/errorHandlers.js";
import {
  getVPCs,
  getSubnets,
  getKeyPairs,
  getSecurityGroups,
  getLatestAmiIdForOs,
} from "../helpers/awsHelpers.js";
import { $, question } from "zx";

export default async function createEC2Instance() {
  console.log(chalk.cyan("\n=== Create EC2 Instance ==="));

  try {
    // List available VPCs
    let vpcs = await getVPCs();

    if (vpcs.length === 0) {
      console.log(chalk.red("No VPCs found. Please create a VPC first."));
      return;
    }

    // Prompt user to select a VPC
    const { vpcId } = await inquirer.prompt([
      {
        type: "list",
        name: "vpcId",
        message: chalk.yellow("Select a VPC:"),
        choices: vpcs.map((vpc) => ({
          name: `${vpc.Name || "Unnamed VPC"} (${vpc.VpcId})`,
          value: vpc.VpcId,
        })),
      },
    ]);

    // List subnets in the selected VPC
    let subnets = await getSubnets(vpcId);

    if (subnets.length === 0) {
      console.log(
        chalk.red("No subnets found in this VPC. Please create a subnet first.")
      );
      return;
    }

    // Prompt user to select a subnet
    const { subnetId } = await inquirer.prompt([
      {
        type: "list",
        name: "subnetId",
        message: chalk.yellow("Select a Subnet:"),
        choices: subnets.map((subnet) => ({
          name: `${subnet.Name || "Unnamed Subnet"} (${subnet.SubnetId})`,
          value: subnet.SubnetId,
        })),
      },
    ]);

    // Prompt for Key Pair
    const keyPairs = await getKeyPairs();
    if (keyPairs.length === 0) {
      console.log(
        chalk.red("No Key Pairs found. Please create a Key Pair first.")
      );
      return;
    }

    const { keyName } = await inquirer.prompt([
      {
        type: "list",
        name: "keyName",
        message: chalk.yellow("Select a Key Pair:"),
        choices: keyPairs,
      },
    ]);

    // Prompt for AMI Selection
    const { amiChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "amiChoice",
        message: chalk.yellow("Select an AMI:"),
        choices: [
          "Amazon Linux 2",
          "Ubuntu Server 20.04 LTS",
          "Ubuntu Server 22.04 LTS",
          "Custom AMI ID",
        ],
      },
    ]);

    let amiId;

    if (amiChoice === "Custom AMI ID") {
      const { customAmiId } = await inquirer.prompt([
        {
          type: "input",
          name: "customAmiId",
          message: chalk.yellow("Enter the AMI ID:"),
          validate: (input) => (input ? true : "AMI ID cannot be empty."),
        },
      ]);
      amiId = customAmiId;
    } else {
      const spinner = ora("Fetching latest AMI ID...").start();
      amiId = await getLatestAmiIdForOs(amiChoice);
      spinner.stop();
      if (!amiId) {
        console.log(
          chalk.red(`Could not retrieve the AMI ID for ${amiChoice}.`)
        );
        return;
      } else {
        console.log(chalk.green(`Using AMI ID: ${amiId}`));
      }
    }

    // Prompt for Security Group
    const securityGroups = await getSecurityGroups(vpcId);
    if (securityGroups.length === 0) {
      console.log(
        chalk.red(
          "No Security Groups found. Please create a Security Group first."
        )
      );
      return;
    }

    const { securityGroupId } = await inquirer.prompt([
      {
        type: "list",
        name: "securityGroupId",
        message: chalk.yellow("Select a Security Group:"),
        choices: securityGroups.map((sg) => ({
          name: `${sg.GroupName} (${sg.GroupId})`,
          value: sg.GroupId,
        })),
      },
    ]);

    // Prompt for Instance Name
    const { instanceName } = await inquirer.prompt([
      {
        type: "input",
        name: "instanceName",
        message: chalk.yellow("Enter a name for the EC2 instance:"),
        validate: (input) => (input ? true : "Instance name cannot be empty."),
      },
    ]);

    // Launch EC2 Instance with public IP address
    const spinner = ora("Launching EC2 Instance...").start();
    let instanceId = await $`aws ec2 run-instances \
      --image-id ${amiId} \
      --count 1 \
      --instance-type t2.micro \
      --key-name ${keyName} \
      --security-group-ids ${securityGroupId} \
      --subnet-id ${subnetId} \
      --associate-public-ip-address \
      --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=${instanceName}}]' \
      --query 'Instances[0].InstanceId' \
      --output text`;
    instanceId = instanceId.stdout.trim();
    spinner.succeed(chalk.green(`Instance ID: ${instanceId}`));

    const waitSpinner = ora(
      "Waiting for the instance to enter the running state..."
    ).start();
    await $`aws ec2 wait instance-running --instance-ids ${instanceId}`;
    waitSpinner.succeed(chalk.green("Instance is now running."));
  } catch (error) {
    throw new AwsCliError(
      "Error launching EC2 Instance",
      error.stderr || error.message
    );
  }
}
