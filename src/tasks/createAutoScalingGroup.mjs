import inquirer from "inquirer";
import {
  $,
  AwsCliError,
  getVPCs,
  getSubnets,
  getLaunchTemplates,
} from "../utils/awsHelpers.mjs";

export async function createAutoScalingGroup() {
  try {
    console.log("\n=== Create Auto Scaling Group ===");

    // Prompt for Auto Scaling Group Name
    const { groupName } = await inquirer.prompt([
      {
        type: "input",
        name: "groupName",
        message: "Enter the Auto Scaling Group name (required):",
        validate: (input) =>
          input ? true : "Auto Scaling Group name cannot be empty.",
      },
    ]);

    // Get VPCs
    const vpcs = await getVPCs();
    if (!vpcs || vpcs.length === 0) {
      throw new AwsCliError("No VPCs found in your account.");
    }

    // Prompt for VPC
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

    // Get Subnets
    const subnets = await getSubnets(vpcId);
    if (!subnets || subnets.length === 0) {
      throw new AwsCliError(
        `No subnets found in VPC ${vpcId}. Please create a subnet first.`
      );
    }

    // Prompt for Subnet
    const { subnetId } = await inquirer.prompt([
      {
        type: "list",
        name: "subnetId",
        message: "Select a subnet for the Auto Scaling Group:",
        choices: subnets.map((subnet) => ({
          name: `${subnet.Name || "Unnamed Subnet"} (${subnet.SubnetId})`,
          value: subnet.SubnetId,
        })),
      },
    ]);

    // Get Launch Templates
    const launchTemplates = await getLaunchTemplates();
    if (!launchTemplates || launchTemplates.length === 0) {
      throw new AwsCliError(
        `No launch templates found. Please create one first.`
      );
    }

    // Prompt for Launch Template
    const { launchTemplateId } = await inquirer.prompt([
      {
        type: "list",
        name: "launchTemplateId",
        message: "Select a Launch Template:",
        choices: launchTemplates.map((lt) => ({
          name: `${lt.LaunchTemplateName} (Version: ${lt.LatestVersionNumber})`,
          value: lt.LaunchTemplateId,
        })),
      },
    ]);

    // Prompt for Min/Max/Desired size
    const { minSize, maxSize, desiredCapacity } = await inquirer.prompt([
      {
        type: "input",
        name: "minSize",
        message: "Enter the minimum number of instances (required):",
        validate: (input) =>
          isNaN(input) || input <= 0
            ? "Please enter a valid positive number."
            : true,
      },
      {
        type: "input",
        name: "maxSize",
        message: "Enter the maximum number of instances (required):",
        validate: (input) =>
          isNaN(input) || input <= 0
            ? "Please enter a valid positive number."
            : true,
      },
      {
        type: "input",
        name: "desiredCapacity",
        message: "Enter the desired number of instances (required):",
        validate: (input) =>
          isNaN(input) || input <= 0
            ? "Please enter a valid positive number."
            : true,
      },
    ]);

    console.log("\nCreating Auto Scaling Group...");
    //log the command to be executed
    console.log(`aws autoscaling create-auto-scaling-group \
      --auto-scaling-group-name ${groupName} \
      --min-size ${minSize} \
      --max-size ${maxSize} \
      --desired-capacity ${desiredCapacity} \
      --launch-template LaunchTemplateId=${launchTemplateId} \
      --vpc-zone-identifier ${subnetId}`);

    await $`aws autoscaling create-auto-scaling-group \
      --auto-scaling-group-name ${groupName} \
      --min-size ${minSize} \
      --max-size ${maxSize} \
      --desired-capacity ${desiredCapacity} \
      --launch-template LaunchTemplateId=${launchTemplateId} \
      --vpc-zone-identifier ${subnetId}`;
    console.log("Auto Scaling Group created successfully.");
  } catch (error) {
    throw new AwsCliError(
      "Error creating Auto Scaling Group",
      error.stderr || error.message
    );
  }
}
