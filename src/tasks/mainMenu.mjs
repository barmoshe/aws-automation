import inquirer from "inquirer";
import { createKeyPair } from "./createKeyPair.mjs";
import { createEC2Instance } from "./createEC2Instance.mjs";
import { configureSecurityGroup } from "./configureSecurityGroup.mjs";
import { sshIntoMachine } from "./sshIntoMachine.mjs";
import { attachEBSVolume } from "./attachEBSVolume.mjs";
import { createSnapshot } from "./createSnapshot.mjs";
import { createLaunchTemplate } from "./createLaunchTemplate.mjs";
import { choices } from "../constants.mjs";
import { handleError } from "../utils/errorHandlers.mjs";
import { $, AwsCliError } from "../utils/awsHelpers.mjs"; // Assuming $ is from zx for shell commands
import { createAutoScalingGroup } from "./createAutoScalingGroup.mjs";
import { createScalingPolicy } from "./createScalingPolicy.mjs";
import { setupCloudWatchAlarms } from "./setupCloudWatchAlarms.mjs";

export async function mainMenu() {
  try {
    const menuChoices = [...choices];
    menuChoices.splice(menuChoices.length - 1, 0, "Configure AWS Credentials");

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: "Select a task to perform:",
        choices: menuChoices,
      },
    ]);

    switch (answer.task) {
      case choices[0]:
        await createKeyPair();
        break;
      case choices[1]:
        await createEC2Instance();
        break;
      case choices[2]:
        await configureSecurityGroup();
        break;
      case choices[3]:
        await sshIntoMachine();
        break;
      case choices[4]:
        await attachEBSVolume();
        break;
      case choices[5]:
        await createSnapshot();
        break;
      case choices[6]:
        await createLaunchTemplate();
        break;
      case choices[7]:
        await createAutoScalingGroup();
        break;
      case choices[8]:
        await createScalingPolicy();
        break;
      case choices[9]:
        await setupCloudWatchAlarms();
        break;
      case "Configure AWS Credentials":
        try {
          await $`aws configure`;
          console.log("AWS configuration completed.");
        } catch (error) {
          throw new AwsCliError(
            "Error running aws configure",
            error.stderr || error.message
          );
        }
        break;
      default:
        console.log("Exiting...");
        process.exit(0);
    }

    await mainMenu();
  } catch (error) {
    handleError(error);
    await mainMenu();
  }
}
