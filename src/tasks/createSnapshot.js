import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { AwsCliError } from "../helpers/errorHandlers.js";
import { getVolumes } from "../helpers/awsHelpers.js";
import { $, question } from "zx";

export default async function createSnapshot() {
  console.log(chalk.cyan("\n=== Create EBS Snapshot ==="));

  try {
    // List EBS Volumes
    const volumes = await getVolumes();
    if (volumes.length === 0) {
      console.log(chalk.red("No EBS Volumes found."));
      return;
    }

    // Prompt user to select a volume
    const { volumeId } = await inquirer.prompt([
      {
        type: "list",
        name: "volumeId",
        message: chalk.yellow("Select an EBS Volume to snapshot:"),
        choices: volumes.map((vol) => ({
          name: `${vol.Name || "Unnamed Volume"} (${vol.VolumeId}, ${
            vol.Size
          } GiB)`,
          value: vol.VolumeId,
        })),
      },
    ]);

    // Prompt for Snapshot Name
    const { snapshotName } = await inquirer.prompt([
      {
        type: "input",
        name: "snapshotName",
        message: chalk.yellow("Enter a name for the Snapshot:"),
        validate: (input) => (input ? true : "Snapshot name cannot be empty."),
      },
    ]);

    // Create Snapshot
    const spinner = ora("Creating a Snapshot of the EBS Volume...").start();
    let snapshotId = await $`aws ec2 create-snapshot \
        --volume-id ${volumeId} \
        --description "Snapshot of volume ${volumeId}" \
        --query 'SnapshotId' \
        --output text`;
    snapshotId = snapshotId.stdout.trim();
    spinner.succeed(chalk.green(`Snapshot ID: ${snapshotId}`));

    // Tag the Snapshot
    await $`aws ec2 create-tags --resources ${snapshotId} --tags Key=Name,Value=${snapshotName}`;
    console.log(chalk.green(`Snapshot '${snapshotName}' tagged successfully.`));
  } catch (error) {
    throw new AwsCliError(
      "Error creating Snapshot",
      error.stderr || error.message
    );
  }
}
