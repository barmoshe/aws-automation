import inquirer from 'inquirer';
import { createKeyPair } from './createKeyPair.mjs';
import { createEC2Instance } from './createEC2Instance.mjs';
import { configureSecurityGroup } from './configureSecurityGroup.mjs';
import { sshIntoMachine } from './sshIntoMachine.mjs';
import { attachEBSVolume } from './attachEBSVolume.mjs';
import { createSnapshot } from './createSnapshot.mjs';
import { choices } from '../constants.mjs';
import { handleError } from '../utils/errorHandlers.mjs';

export async function mainMenu() {
  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: "Select a task to perform:",
        choices: choices,
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
