import inquirer from "inquirer";
import {
  $,
  AwsCliError,
  getRunningInstances,
  getLaunchTemplates,
} from "../utils/awsHelpers.mjs";

export async function attachEBSVolume() {
  console.log("\n=== Attach EBS Volume ===");

  try {
    // Ask if the user wants to attach the EBS volume to an instance or a launch template
    const { attachOption } = await inquirer.prompt([
      {
        type: "list",
        name: "attachOption",
        message:
          "Do you want to attach the EBS Volume to an instance or a launch template?",
        choices: [
          { name: "Instance", value: "instance" },
          { name: "Launch Template", value: "launchTemplate" },
        ],
      },
    ]);

    if (attachOption === "instance") {
      // Attach EBS to an EC2 instance
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
            name: `${inst.Name || "Unnamed Instance"} (${inst.InstanceId}, ${
              inst.PublicIpAddress || "No Public IP"
            })`,
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
      let volumeIdResult;
      try {
        volumeIdResult = await $`aws ec2 create-volume \
          --availability-zone ${availabilityZone} \
          --size ${volumeSize} \
          --volume-type ${volumeType} \
          --query 'VolumeId' \
          --output text`;
      } catch (createVolumeError) {
        console.error(
          "Error creating the volume:",
          createVolumeError.stderr || createVolumeError.message
        );
        return;
      }

      let volumeId = volumeIdResult.stdout.trim();
      console.log(`Volume ID: ${volumeId}`);

      // Tag the EBS Volume
      try {
        await $`aws ec2 create-tags --resources ${volumeId} --tags Key=Name,Value=${volumeName}`;
        console.log(`EBS Volume '${volumeName}' tagged successfully.`);
      } catch (tagError) {
        console.error(
          "Error tagging the volume:",
          tagError.stderr || tagError.message
        );
        return;
      }

      console.log("\nWaiting for the volume to become available...");
      try {
        await $`aws ec2 wait volume-available --volume-ids ${volumeId}`;
        console.log("Volume is now available.");
      } catch (waitError) {
        console.error(
          "Error waiting for the volume to become available:",
          waitError.stderr || waitError.message
        );
        return;
      }

      console.log("\nAttaching EBS Volume to the instance...");
      try {
        await $`aws ec2 attach-volume \
          --volume-id ${volumeId} \
          --instance-id ${instanceId} \
          --device /dev/sdf`;
        console.log("Volume attached successfully.");
      } catch (attachError) {
        console.error(
          "Error attaching the volume to the instance:",
          attachError.stderr || attachError.message
        );
      }
    } else if (attachOption === "launchTemplate") {
      // Attach EBS to a Launch Template
      const launchTemplates = await getLaunchTemplates();
      if (launchTemplates.length === 0) {
        console.log("No launch templates found.");
        return;
      }

      // Prompt user to select a launch template
      const { launchTemplateId } = await inquirer.prompt([
        {
          type: "list",
          name: "launchTemplateId",
          message: "Select a Launch Template to modify:",
          choices: launchTemplates.map((lt) => ({
            name: `${lt.LaunchTemplateName} (Version: ${lt.LatestVersionNumber})`,
            value: lt.LaunchTemplateId,
          })),
        },
      ]);

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

      console.log(
        "\nCreating a new version of the Launch Template with the new EBS Volume..."
      );
      try {
        await $`aws ec2 create-launch-template-version \
          --launch-template-id ${launchTemplateId} \
          --source-version '$Latest' \
          --launch-template-data '{
            "BlockDeviceMappings": [
              {
                "DeviceName": "/dev/sdf",
                "Ebs": {
                  "VolumeSize": ${volumeSize},
                  "VolumeType": "${volumeType}",
                  "DeleteOnTermination": true
                }
              }
            ]
          }'`;
        console.log(
          "New version of the Launch Template created successfully with the added EBS Volume."
        );
      } catch (templateError) {
        console.error(
          "Error creating new launch template version:",
          templateError.stderr || templateError.message
        );
      }
    }
  } catch (error) {
    throw new AwsCliError(
      "Error attaching EBS Volume",
      error.stderr || error.message
    );
  }
}
