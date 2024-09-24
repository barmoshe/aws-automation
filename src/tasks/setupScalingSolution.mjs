import { $ } from "zx";
import { AwsCliError } from "../utils/errorHandlers.mjs";

/**
 * Create a scaling policy and associate it with a CloudWatch alarm
 * @param {string} scalingGroupName - Name of the Auto Scaling group
 * @param {string} policyName - Name of the scaling policy (e.g., ScaleUp or ScaleDown)
 * @param {number} cpuThreshold - CPU utilization percentage to trigger the scaling action
 * @param {string} adjustmentType - Type of adjustment ("Increase" or "Decrease")
 * @returns {Promise<string>} - ARN of the scaling policy
 */
export async function createScalingPolicy(
  scalingGroupName,
  policyName,
  cpuThreshold,
  adjustmentType
) {
  try {
    console.log(
      `Creating ${adjustmentType} policy for scaling ${policyName}...`
    );

    // Set the scaling adjustment value (positive for scaling up, negative for scaling down)
    const adjustmentValue = adjustmentType === "Increase" ? 1 : -1;

    // Create the scaling policy
    const scalingPolicyResult = await $`aws autoscaling put-scaling-policy \
      --auto-scaling-group-name ${scalingGroupName} \
      --policy-name ${policyName} \
      --scaling-adjustment ${adjustmentValue} \
      --adjustment-type ChangeInCapacity`;

    const scalingPolicyArn = scalingPolicyResult.stdout.trim();

    // Create the CloudWatch Alarm to monitor CPU usage
    console.log(`Creating CloudWatch Alarm for ${policyName}...`);
    await $`aws cloudwatch put-metric-alarm \
      --alarm-name EC2${policyName}Alarm \
      --metric-name CPUUtilization \
      --namespace AWS/EC2 \
      --statistic Average \
      --period 60 \
      --threshold ${cpuThreshold} \
      --comparison-operator ${
        adjustmentType === "Increase"
          ? "GreaterThanOrEqualToThreshold"
          : "LessThanOrEqualToThreshold"
      } \
      --evaluation-periods 1 \
      --alarm-actions ${scalingPolicyArn} \
      --dimensions Name=AutoScalingGroupName,Value=${scalingGroupName}`;

    console.log(
      `Scaling policy and alarm for ${policyName} successfully created.`
    );
    return scalingPolicyArn;
  } catch (error) {
    throw new AwsCliError(
      `Error creating scaling policy for ${policyName}`,
      error.stderr || error.message
    );
  }
}
