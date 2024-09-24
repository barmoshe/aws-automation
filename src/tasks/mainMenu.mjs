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
import { $, AwsCliError } from "../utils/awsHelpers.mjs";  // Assuming $ is from zx for shell commands

export async function mainMenu() {
  try {
    // Initial prompt to ask if user wants to configure AWS
    const { runAwsConfigure } = await inquirer.prompt([
      {
        type: "confirm",
        name: "runAwsConfigure",
        message: "Do you want to configure AWS credentials now?",
        default: false,
      },
    ]);

    // Run `aws configure` if the user chooses to
    if (runAwsConfigure) {
      try {
        await $`aws configure`;
        console.log("AWS configuration completed.");
      } catch (error) {
        throw new AwsCliError("Error running aws configure", error.stderr || error.message);
      }
    }

    // Modify the choices to include "AWS Configure" before the exit option
    const menuChoices = [...choices];
    menuChoices.splice(menuChoices.length - 1, 0, "Configure AWS Credentials"); // Add above the last option (Exit)

    // Main menu prompt
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
      case "Configure AWS Credentials":
        try {
          await $`aws configure`;  // Run aws configure if selected from the menu
          console.log("AWS configuration completed.");
        } catch (error) {
          throw new AwsCliError("Error running aws configure", error.stderr || error.message);
        }
        break;

      default:
        console.log("Exiting...");
        process.exit(0);
    }

    // Return to main menu after task completion
    await mainMenu();
  } catch (error) {
    handleError(error);
    await mainMenu();
  }
}
