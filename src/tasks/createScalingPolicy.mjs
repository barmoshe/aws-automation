import inquirer from "inquirer";
import { $, AwsCliError, getAutoScalingGroups } from "../utils/awsHelpers.mjs";

export async function createScalingPolicy() {
  try {
    console.log("\n=== Create Scaling Policies (up/down) ===");

    // Get Auto Scaling Groups
    const autoScalingGroups = await getAutoScalingGroups();
    if (!autoScalingGroups || autoScalingGroups.length === 0) {
      throw new AwsCliError("No Auto Scaling Groups found.");
    }

    // Prompt for Auto Scaling Group Name
    const { groupName } = await inquirer.prompt([
      {
        type: "list",
        name: "groupName",
        message: "Select an Auto Scaling Group:",
        choices: autoScalingGroups.map((asg) => ({
          name: asg.AutoScalingGroupName,
          value: asg.AutoScalingGroupName,
        })),
      },
    ]);

    // Prompt for Scaling Adjustment for "Scale Up"
    const { scaleUpAdjustment } = await inquirer.prompt([
      {
        type: "input",
        name: "scaleUpAdjustment",
        message: "Enter the adjustment value for scaling up (required):",
        validate: (input) =>
          isNaN(input) ? "Please enter a valid number." : true,
      },
    ]);

    // Prompt for Scaling Adjustment for "Scale Down"
    const { scaleDownAdjustment } = await inquirer.prompt([
      {
        type: "input",
        name: "scaleDownAdjustment",
        message: "Enter the adjustment value for scaling down (required):",
        validate: (input) =>
          isNaN(input) ? "Please enter a valid number." : true,
      },
    ]);

    // Scaling Up Policy
    await $`aws autoscaling put-scaling-policy \
      --auto-scaling-group-name ${groupName} \
      --policy-name ScaleUpPolicy \
      --scaling-adjustment ${scaleUpAdjustment} \
      --adjustment-type ChangeInCapacity \
      --cooldown 300`;

    // Scaling Down Policy
    await $`aws autoscaling put-scaling-policy \
      --auto-scaling-group-name ${groupName} \
      --policy-name ScaleDownPolicy \
      --scaling-adjustment ${scaleDownAdjustment} \
      --adjustment-type ChangeInCapacity \
      --cooldown 300`;

    console.log("Scaling policies created successfully.");
  } catch (error) {
    throw new AwsCliError(
      "Error creating Scaling Policies",
      error.stderr || error.message
    );
  }
}
