import inquirer from 'inquirer';
import fs from 'fs';
import { $, AwsCliError } from '../utils/awsHelpers.mjs';

export async function createKeyPair() {
  console.log("\n=== Create Key Pair ===");

  const { keyName } = await inquirer.prompt([
    {
      type: "input",
      name: "keyName",
      message: "Enter the Key Pair name:",
      validate: (input) => (input ? true : "Key Pair name cannot be empty."),
    },
  ]);

  try {
    if (fs.existsSync(`./${keyName}.pem`)) {
      console.log(`Key Pair file '${keyName}.pem' already exists.`);
      return;
    }

    await $`aws ec2 create-key-pair \
      --key-name ${keyName} \
      --query 'KeyMaterial' \
      --output text > ${keyName}.pem`;
    await $`chmod 400 ${keyName}.pem`;
    console.log(`Key Pair '${keyName}' created and saved as '${keyName}.pem'.`);
  } catch (error) {
    throw new AwsCliError("Error creating Key Pair", error.stderr || error.message);
  }
}
