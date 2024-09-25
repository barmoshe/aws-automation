import inquirer from "inquirer";
import { $, AwsCliError, getAutoScalingGroups } from "../utils/awsHelpers.mjs";

export async function setupCloudWatchAlarms() {
  try {
    console.log("\n=== Set up CloudWatch Alarms ===");

    // Get AWS Account ID
    const accountIdResult =
      await $`aws sts get-caller-identity --query Account --output text`;
    const accountId = accountIdResult.stdout.trim();

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

    // Prompt for CPU Utilization thresholds
    const { scaleUpThreshold, scaleDownThreshold } = await inquirer.prompt([
      {
        type: "input",
        name: "scaleUpThreshold",
        message:
          "Enter the CPU utilization threshold for scaling up (required, %):",
        validate: (input) =>
          isNaN(input) ? "Please enter a valid number." : true,
      },
      {
        type: "input",
        name: "scaleDownThreshold",
        message:
          "Enter the CPU utilization threshold for scaling down (required, %):",
        validate: (input) =>
          isNaN(input) ? "Please enter a valid number." : true,
      },
    ]);

    const region = "eu-west-1"; // Set your desired region here

    // Alarm for CPU > Scale Up Threshold
    await $`aws cloudwatch put-metric-alarm \
      --alarm-name ScaleUpAlarm-${groupName} \
      --metric-name CPUUtilization \
      --namespace AWS/EC2 \
      --statistic Average \
      --period 300 \
      --threshold ${scaleUpThreshold} \
      --comparison-operator GreaterThanThreshold \
      --dimensions "Name=AutoScalingGroupName,Value=${groupName}" \
      --evaluation-periods 2 \
      --alarm-actions arn:aws:autoscaling:${region}:${accountId}:scalingPolicy:policy-id:autoScalingGroupName/${groupName}:policyName/ScaleUpPolicy \
      --region ${region}`;

    // Alarm for CPU < Scale Down Threshold
    await $`aws cloudwatch put-metric-alarm \
      --alarm-name ScaleDownAlarm-${groupName} \
      --metric-name CPUUtilization \
      --namespace AWS/EC2 \
      --statistic Average \
      --period 300 \
      --threshold ${scaleDownThreshold} \
      --comparison-operator LessThanThreshold \
      --dimensions "Name=AutoScalingGroupName,Value=${groupName}" \
      --evaluation-periods 2 \
      --alarm-actions arn:aws:autoscaling:${region}:${accountId}:scalingPolicy:policy-id:autoScalingGroupName/${groupName}:policyName/ScaleDownPolicy \
      --region ${region}`;

    console.log("CloudWatch Alarms set up successfully.");
  } catch (error) {
    throw new AwsCliError(
      "Error setting up CloudWatch Alarms",
      error.stderr || error.message
    );
  }
}
