#!/usr/bin/env zx

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import {
  createKeyPair,
  createEC2Instance,
  configureSecurityGroup,
  sshIntoMachine,
  attachEBSVolume,
  createSnapshot,
} from "./tasks/index.js";

// Main Menu Function
async function mainMenu() {
  const choices = [
    "1. Create Key Pair",
    "2. Create EC2 Instance",
    "3. Configure Security Group for SSH Access",
    "4. SSH into EC2 Instance",
    "5. Attach EBS Volume to EC2 Instance",
    "6. Create EBS Snapshot",
    "Exit",
  ];

  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: chalk.yellow("Select a task to perform:"),
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
        console.log(chalk.green("Thank you for using the AWS Automation Script. Goodbye!"));
        process.exit(0);
    }

    // Return to main menu after task completion
    await mainMenu();
  } catch (error) {
    handleError(error);
    await mainMenu();
  }
}

// Global Error Handler
function handleError(error) {
  if (error instanceof AwsCliError) {
    console.error(chalk.red(`\n${error.name}: ${error.message}`));
    if (error.stderr) {
      console.error(chalk.red(`Details: ${error.stderr}`));
    }
    suggestResolution(error.stderr);
  } else if (error instanceof ValidationError) {
    console.error(chalk.red(`\n${error.name}: ${error.message}`));
  } else {
    console.error(chalk.red(`\nAn unexpected error occurred: ${error.message}`));
  }
}

// Function to Suggest Resolutions
function suggestResolution(stderr) {
  if (!stderr) return;

  if (stderr.includes("AuthFailure") || stderr.includes("UnauthorizedOperation")) {
    console.error(chalk.yellow("\nSuggestion: Check your AWS credentials and permissions."));
  } else if (stderr.includes("InvalidParameterValue")) {
    console.error(chalk.yellow("\nSuggestion: Verify the parameters and try again."));
  } else if (stderr.includes("RequestLimitExceeded")) {
    console.error(
      chalk.yellow("\nSuggestion: You have exceeded AWS API request limits. Try again later.")
    );
  } else if (stderr.includes("OptInRequired")) {
    console.error(
      chalk.yellow(
        "\nSuggestion: The AWS service may not be available in your region or account. Ensure you have opted in to the service."
      )
    );
  } else {
    console.error(
      chalk.yellow("\nSuggestion: Review the error details and consult AWS documentation or support.")
    );
  }
}

// Start the application
console.log(chalk.blue.bold("Welcome to the AWS Automation Script"));
mainMenu();
