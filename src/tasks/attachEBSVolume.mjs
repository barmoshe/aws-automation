import inquirer from 'inquirer';
import { $, AwsCliError, getRunningInstances, getVolumes } from '../utils/awsHelpers.mjs';

export async function attachEBSVolume() {
  console.log("\n=== Attach EBS Volume ===");

  try {
    // List running EC2 instances
    const instances = await getRunningInstances();
    if (instances.length === 0) {
      console.log("No running EC2 instances found.");
      return;
    }

    // Prompt user to select an instance
    const { instanceId } = await inquirer.prompt([
      {
        type: "list",
        name: "instanceId",
        message: "Select an EC2 Instance to attach the EBS Volume:",
        choices: instances.map((inst) => ({
          name: `${inst.Name || "Unnamed Instance"} (${inst.InstanceId}, ${inst.PublicIpAddress || "No Public IP"})`,
          value: inst.InstanceId,
        })),
      },
    ]);

    const instance = instances.find((inst) => inst.InstanceId === instanceId);

    // Get Availability Zone
    const availabilityZone = instance.Placement.AvailabilityZone;

    // Prompt for EBS Volume Size, Type, and Name
    const { volumeSize, volumeType, volumeName } = await inquirer.prompt([
      {
        type: "input",
        name: "volumeSize",
        message: "Enter the EBS Volume size in GiB (e.g., 10):",
        validate: (input) =>
          input && !isNaN(input) ? true : "Please enter a valid number.",
      },
      {
        type: "list",
        name: "volumeType",
        message: "Select the EBS Volume type:",
        choices: ["gp2", "gp3", "io1", "io2", "sc1", "st1"],
      },
      {
        type: "input",
        name: "volumeName",
        message: "Enter a name for the EBS Volume:",
        validate: (input) => (input ? true : "Volume name cannot be empty."),
      },
    ]);

    // Create EBS Volume
    console.log("\nCreating EBS Volume...");
    let volumeIdResult = await $`aws ec2 create-volume \
        --availability-zone ${availabilityZone} \
        --size ${volumeSize} \
        --volume-type ${volumeType} \
        --query 'VolumeId' \
        --output text`;
    let volumeId = volumeIdResult.stdout.trim();
    console.log(`Volume ID: ${volumeId}`);

    // Tag the EBS Volume
    await $`aws ec2 create-tags --resources ${volumeId} --tags Key=Name,Value=${volumeName}`;
    console.log(`EBS Volume '${volumeName}' tagged successfully.`);

    console.log("\nWaiting for the volume to become available...");
    await $`aws ec2 wait volume-available --volume-ids ${volumeId}`;
    console.log("Volume is now available.");

    console.log("\nAttaching EBS Volume to the instance...");
    await $`aws ec2 attach-volume \
        --volume-id ${volumeId} \
        --instance-id ${instanceId} \
        --device /dev/sdf`;
    console.log("Volume attached successfully.");
  } catch (error) {
    throw new AwsCliError("Error attaching EBS Volume", error.stderr || error.message);
  }
}
