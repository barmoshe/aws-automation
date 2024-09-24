import inquirer from "inquirer";
import fs from "fs";
import chalk from "chalk";
import ora from "ora";
import { $, question } from "zx";
import { AwsCliError } from "../helpers/errorHandlers.js";

export default async function createKeyPair() {
  console.log(chalk.cyan("\n=== Create Key Pair ==="));

  const { keyName } = await inquirer.prompt([
    {
      type: "input",
      name: "keyName",
      message: chalk.yellow("Enter the Key Pair name:"),
      validate: (input) => (input ? true : "Key Pair name cannot be empty."),
    },
  ]);

  try {
    if (fs.existsSync(`./${keyName}.pem`)) {
      console.log(chalk.red(`Key Pair file '${keyName}.pem' already exists.`));
      return;
    }

    const spinner = ora("Creating Key Pair...").start();

    await $`aws ec2 create-key-pair \
      --key-name ${keyName} \
      --query 'KeyMaterial' \
      --output text > ${keyName}.pem`;
    await $`chmod 400 ${keyName}.pem`;

    spinner.succeed(
      chalk.green(
        `Key Pair '${keyName}' created and saved as '${keyName}.pem'.`
      )
    );
  } catch (error) {
    throw new AwsCliError(
      "Error creating Key Pair",
      error.stderr || error.message
    );
  }
}
