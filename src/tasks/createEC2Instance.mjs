import inquirer from 'inquirer';
import fs from 'fs';
import { $, AwsCliError, getVPCs, getSubnets, getKeyPairs, getSecurityGroups, getDefaultSecurityGroup, getLatestAmiIdForOs } from '../utils/awsHelpers.mjs';

export async function createEC2Instance() {
  console.log("\n=== Create EC2 Instance ===");

  try {
    // List available VPCs
    let vpcs = await getVPCs();

    if (vpcs.length === 0) {
      console.log("No VPCs found. Please create a VPC first.");
      return;
    }

    // Prompt user to select a VPC
    const { vpcId } = await inquirer.prompt([
      {
        type: "list",
        name: "vpcId",
        message: "Select a VPC:",
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
        "No subnets found in this VPC. Please create a subnet first."
      );
      return;
    }

    // Prompt user to select a subnet
    const { subnetId } = await inquirer.prompt([
      {
        type: "list",
        name: "subnetId",
        message: "Select a Subnet:",
        choices: subnets.map((subnet) => ({
          name: `${subnet.Name || "Unnamed Subnet"} (${subnet.SubnetId})`,
          value: subnet.SubnetId,
        })),
      },
    ]);

    // Prompt for Key Pair
    const keyPairs = await getKeyPairs();
    if (keyPairs.length === 0) {
      console.log("No Key Pairs found. Please create a Key Pair first.");
      return;
    }

    const { keyName } = await inquirer.prompt([
      {
        type: "list",
        name: "keyName",
        message: "Select a Key Pair:",
        choices: keyPairs,
      },
    ]);

    // Prompt for AMI Selection
    const { amiChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "amiChoice",
        message: "Select an AMI:",
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
          message: "Enter the AMI ID:",
          validate: (input) => (input ? true : "AMI ID cannot be empty."),
        },
      ]);
      amiId = customAmiId;
    } else {
      amiId = await getLatestAmiIdForOs(amiChoice);
      if (!amiId) {
        console.log(`Could not retrieve the AMI ID for ${amiChoice}.`);
        return;
      }
    }

    // Prompt to choose between custom or default Security Group
    const { useCustomSecurityGroup } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useCustomSecurityGroup",
        message: "Do you want to use a custom Security Group?",
        default: false,
      },
    ]);

    let securityGroupId;

    if (useCustomSecurityGroup) {
      // Prompt for Security Group if user wants to use a custom one
      const securityGroups = await getSecurityGroups(vpcId);
      if (securityGroups.length === 0) {
        console.log(
          "No Security Groups found. Please create a Security Group first."
        );
        return;
      }

      const { selectedSecurityGroupId } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedSecurityGroupId",
          message: "Select a Security Group:",
          choices: securityGroups.map((sg) => ({
            name: `${sg.GroupName} (${sg.GroupId})`,
            value: sg.GroupId,
          })),
        },
      ]);

      securityGroupId = selectedSecurityGroupId;
    } else {
      // Retrieve the default Security Group for the selected VPC
      const defaultSecurityGroup = await getDefaultSecurityGroup(vpcId);
      if (!defaultSecurityGroup) {
        console.log(
          "Default Security Group not found for this VPC. Please ensure a default Security Group exists."
        );
        return;
      }
      securityGroupId = defaultSecurityGroup.GroupId;
      console.log(`Using default Security Group: ${defaultSecurityGroup.GroupName} (${securityGroupId})`);
    }

    // Prompt for Instance Name
    const { instanceName } = await inquirer.prompt([
      {
        type: "input",
        name: "instanceName",
        message: "Enter a name for the EC2 instance:",
        validate: (input) => (input ? true : "Instance name cannot be empty."),
      },
    ]);

    // Launch EC2 Instance with public IP address
    console.log("\nLaunching EC2 Instance...");
    let instanceIdResult = await $`aws ec2 run-instances \
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
    let instanceId = instanceIdResult.stdout.trim();
    console.log(`Instance ID: ${instanceId}`);

    console.log("\nWaiting for the instance to enter the running state...");
    await $`aws ec2 wait instance-running --instance-ids ${instanceId}`;
    console.log("Instance is now running.");
  } catch (error) {
    throw new AwsCliError("Error launching EC2 Instance", error.stderr || error.message);
  }
}
