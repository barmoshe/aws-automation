import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { AwsCliError } from "../helpers/errorHandlers.js";
import { getRunningInstances } from "../helpers/awsHelpers.js";
import { $, question } from "zx";

export default async function attachEBSVolume() {
  console.log(chalk.cyan("\n=== Attach EBS Volume to EC2 Instance ==="));

  try {
    // List running EC2 instances
    const instances = await getRunningInstances();
    if (instances.length === 0) {
      console.log(chalk.red("No running EC2 instances found."));
      return;
    }

    // Prompt user to select an instance
    const { instanceId } = await inquirer.prompt([
      {
        type: "list",
        name: "instanceId",
        message: chalk.yellow(
          "Select an EC2 Instance to attach the EBS Volume:"
        ),
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
        message: chalk.yellow("Enter the EBS Volume size in GiB (e.g., 10):"),
        validate: (input) =>
          input && !isNaN(input) ? true : "Please enter a valid number.",
      },
      {
        type: "list",
        name: "volumeType",
        message: chalk.yellow("Select the EBS Volume type:"),
        choices: ["gp2", "gp3", "io1", "io2", "sc1", "st1"],
      },
      {
        type: "input",
        name: "volumeName",
        message: chalk.yellow("Enter a name for the EBS Volume:"),
        validate: (input) => (input ? true : "Volume name cannot be empty."),
      },
    ]);

    // Create EBS Volume
    const spinner = ora("Creating EBS Volume...").start();
    let volumeId = await $`aws ec2 create-volume \
        --availability-zone ${availabilityZone} \
        --size ${volumeSize} \
        --volume-type ${volumeType} \
        --query 'VolumeId' \
        --output text`;
    volumeId = volumeId.stdout.trim();
    spinner.succeed(chalk.green(`Volume ID: ${volumeId}`));

    // Tag the EBS Volume
    await $`aws ec2 create-tags --resources ${volumeId} --tags Key=Name,Value=${volumeName}`;
    console.log(chalk.green(`EBS Volume '${volumeName}' tagged successfully.`));

    const waitSpinner = ora(
      "Waiting for the volume to become available..."
    ).start();
    await $`aws ec2 wait volume-available --volume-ids ${volumeId}`;
    waitSpinner.succeed(chalk.green("Volume is now available."));

    const attachSpinner = ora(
      "Attaching EBS Volume to the instance..."
    ).start();
    await $`aws ec2 attach-volume \
        --volume-id ${volumeId} \
        --instance-id ${instanceId} \
        --device /dev/sdf`;
    attachSpinner.succeed(chalk.green("Volume attached successfully."));
  } catch (error) {
    throw new AwsCliError(
      "Error attaching EBS Volume",
      error.stderr || error.message
    );
  }
}
