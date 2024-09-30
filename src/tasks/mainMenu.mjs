import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";
import ora from "ora";
import { createKeyPair } from "./createKeyPair.mjs";
import { createEC2Instance } from "./createEC2Instance.mjs";
import { configureSecurityGroup } from "./configureSecurityGroup.mjs";
import { sshIntoMachine } from "./sshIntoMachine.mjs";
import { attachEBSVolume } from "./attachEBSVolume.mjs";
import { createSnapshot } from "./createSnapshot.mjs";
import { createLaunchTemplate } from "./createLaunchTemplate.mjs";
import { createAutoScalingGroup } from "./createAutoScalingGroup.mjs";
import { createScalingPolicy } from "./createScalingPolicy.mjs";
import { setupCloudWatchAlarms } from "./setupCloudWatchAlarms.mjs";
import { handleError } from "../utils/errorHandlers.mjs";
import { $, AwsCliError } from "../utils/awsHelpers.mjs"; // Assuming $ is from zx for shell commands

// Function to display the banner
function displayBanner() {
  const msg = "AWS CLI Tool";
  const banner = figlet.textSync(msg, {
    font: "Big", // More readable font
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Apply gradient to the banner text only
  const gradientBanner = gradient.pastel.multiline(banner);

  // Place the gradient banner inside the box
  console.log(
    boxen(gradientBanner, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "magenta",
    })
  );
  console.log(chalk.bold.magenta("Your One-Stop AWS Automation Tool\n"));
}

export async function mainMenu() {
  try {
    // Display the banner
    displayBanner();

    // Define the menu choices with emojis and color coding
    const menuChoices = [
      new inquirer.Separator(chalk.cyan("=== Basic Operations ===")),
      {
        name: `${chalk.blue("🔑  Create Key Pair")}`,
        value: "createKeyPair",
        short: "Create Key Pair",
      },
      {
        name: `${chalk.blue("🚀  Launch EC2 Instance")}`,
        value: "createEC2Instance",
        short: "Launch EC2 Instance",
      },
      {
        name: `${chalk.blue("🔒  Configure Security Group")}`,
        value: "configureSecurityGroup",
        short: "Configure Security Group",
      },
      {
        name: `${chalk.blue("🔗  SSH into Machine")}`,
        value: "sshIntoMachine",
        short: "SSH into Machine",
      },
      {
        name: `${chalk.blue("💾  Attach EBS Volume")}`,
        value: "attachEBSVolume",
        short: "Attach EBS Volume",
      },
      {
        name: `${chalk.blue("📸  Create Snapshot")}`,
        value: "createSnapshot",
        short: "Create Snapshot",
      },
      new inquirer.Separator(chalk.cyan("=== Advanced Operations ===")),
      {
        name: `${chalk.yellow("📄  Create Launch Template")}`,
        value: "createLaunchTemplate",
        short: "Create Launch Template",
      },
      {
        name: `${chalk.yellow("📈  Setup Auto Scaling Group")}`,
        value: "createAutoScalingGroup",
        short: "Setup Auto Scaling Group",
      },
      {
        name: `${chalk.yellow("⚖️  Create Scaling Policy")}`,
        value: "createScalingPolicy",
        short: "Create Scaling Policy",
      },
      {
        name: `${chalk.yellow("🔔  Setup CloudWatch Alarms")}`,
        value: "setupCloudWatchAlarms",
        short: "Setup CloudWatch Alarms",
      },
      new inquirer.Separator(chalk.cyan("=== Utilities ===")),
      {
        name: `${chalk.green("⚙️  Configure AWS Credentials")}`,
        value: "configureAWSCredentials",
        short: "Configure AWS Credentials",
      },
      {
        name: `${chalk.green("📝  View AWS Resources")}`,
        value: "viewAWSResources",
        short: "View AWS Resources",
      },
      new inquirer.Separator(),
      {
        name: `${chalk.red("❌  Exit")}`,
        value: "exit",
        short: "Exit",
      },
    ];

    // Prompt the user with the menu
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: chalk.bold.cyan("What would you like to do?"),
        choices: menuChoices,
        pageSize: 15,
      },
    ]);

    // Handle the user's selection
    switch (answer.task) {
      case "createKeyPair":
        await createKeyPair();
        break;
      case "createEC2Instance":
        await createEC2Instance();
        break;
      case "configureSecurityGroup":
        await configureSecurityGroup();
        break;
      case "sshIntoMachine":
        await sshIntoMachine();
        break;
      case "attachEBSVolume":
        await attachEBSVolume();
        break;
      case "createSnapshot":
        await createSnapshot();
        break;
      case "createLaunchTemplate":
        await createLaunchTemplate();
        break;
      case "createAutoScalingGroup":
        await createAutoScalingGroup();
        break;
      case "createScalingPolicy":
        await createScalingPolicy();
        break;
      case "setupCloudWatchAlarms":
        await setupCloudWatchAlarms();
        break;
      case "configureAWSCredentials":
        await configureAWSCredentials();
        break;
      case "viewAWSResources":
        await viewAWSResources();
        break;
      case "exit":
        const exitConfirmation = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmExit",
            message: chalk.yellow("Are you sure you want to exit?"),
            default: false,
          },
        ]);
        if (exitConfirmation.confirmExit) {
          console.log(chalk.green("Goodbye!"));
          process.exit(0);
        } else {
          await mainMenu();
        }
        return;
      default:
        console.log(chalk.red("Invalid option selected."));
    }

    // Pause before returning to the menu
    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: chalk.cyan("\nPress Enter to return to the main menu..."),
      },
    ]);

    // Return to the main menu
    await mainMenu();
  } catch (error) {
    // Handle errors with color-coded messages
    handleError(error);

    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: chalk.red("\nPress Enter to return to the main menu..."),
      },
    ]);

    // Return to the main menu after error handling
    await mainMenu();
  }
}

// New utility functions
async function configureAWSCredentials() {
  try {
    const spinner = ora(chalk.yellow("Configuring AWS credentials...")).start();
    await $`aws configure`;
    spinner.succeed(chalk.green("AWS configuration completed."));
  } catch (error) {
    throw new AwsCliError(
      "Error running aws configure",
      error.stderr || error.message
    );
  }
}

async function viewAWSResources() {
  // Placeholder function to view AWS resources
  console.log(chalk.blue("\nListing AWS Resources...\n"));
  // Implement the actual logic here
}
