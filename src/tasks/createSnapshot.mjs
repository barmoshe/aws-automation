import inquirer from 'inquirer';
import { $, AwsCliError, getVolumes } from '../utils/awsHelpers.mjs';

export async function createSnapshot() {
  console.log("\n=== Create a Snapshot ===");

  try {
    // List EBS Volumes
    const volumes = await getVolumes();
    if (volumes.length === 0) {
      console.log("No EBS Volumes found.");
      return;
    }

    // Prompt user to select a volume
    const { volumeId } = await inquirer.prompt([
      {
        type: "list",
        name: "volumeId",
        message: "Select an EBS Volume to snapshot:",
        choices: volumes.map((vol) => ({
          name: `${vol.Name || "Unnamed Volume"} (${vol.VolumeId}, ${vol.Size} GiB)`,
          value: vol.VolumeId,
        })),
      },
    ]);

    // Prompt for Snapshot Name
    const { snapshotName } = await inquirer.prompt([
      {
        type: "input",
        name: "snapshotName",
        message: "Enter a name for the Snapshot:",
        validate: (input) => (input ? true : "Snapshot name cannot be empty."),
      },
    ]);

    // Create Snapshot
    console.log("\nCreating a Snapshot of the EBS Volume...");
    let snapshotIdResult = await $`aws ec2 create-snapshot \
        --volume-id ${volumeId} \
        --description "Snapshot of volume ${volumeId}" \
        --query 'SnapshotId' \
        --output text`;
    let snapshotId = snapshotIdResult.stdout.trim();
    console.log(`Snapshot ID: ${snapshotId}`);

    // Tag the Snapshot
    await $`aws ec2 create-tags --resources ${snapshotId} --tags Key=Name,Value=${snapshotName}`;
    console.log(`Snapshot '${snapshotName}' tagged successfully.`);
  } catch (error) {
    throw new AwsCliError("Error creating Snapshot", error.stderr || error.message);
  }
}
