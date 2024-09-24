import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { AwsCliError } from "../helpers/errorHandlers.js";
import { getVPCs, getSecurityGroups } from "../helpers/awsHelpers.js";
import { $, question } from "zx";

export default async function configureSecurityGroup() {
  console.log(chalk.cyan("\n=== Configure Security Group ==="));

  try {
    // List available VPCs
    let vpcs = await getVPCs();

    if (vpcs.length === 0) {
      console.log(chalk.red("No VPCs found. Please create a VPC first."));
      return;
    }

    // Prompt user to select a VPC
    const { vpcId } = await inquirer.prompt([
      {
        type: "list",
        name: "vpcId",
        message: chalk.yellow("Select a VPC:"),
        choices: vpcs.map((vpc) => ({
          name: `${vpc.Name || "Unnamed VPC"} (${vpc.VpcId})`,
          value: vpc.VpcId,
        })),
      },
    ]);

    // Prompt for Security Group Name
    const { securityGroupName } = await inquirer.prompt([
      {
        type: "input",
        name: "securityGroupName",
        message: chalk.yellow("Enter the Security Group name:"),
        validate: (input) =>
          input ? true : "Security Group name cannot be empty.",
      },
    ]);

    // Prompt for Home and Campus IP CIDRs
    const { homeIpCidr, campusIpCidr } = await inquirer.prompt([
      {
        type: "input",
        name: "homeIpCidr",
        message: chalk.yellow(
          "Enter your Home IP CIDR (e.g., 203.0.113.0/32):"
        ),
        validate: (input) =>
          isValidCIDR(input)
            ? true
            : "Please enter a valid CIDR notation (e.g., 203.0.113.0/32).",
      },
      {
        type: "input",
        name: "campusIpCidr",
        message: chalk.yellow(
          "Enter your Campus IP CIDR (e.g., 198.51.100.0/32):"
        ),
        validate: (input) =>
          isValidCIDR(input)
            ? true
            : "Please enter a valid CIDR notation (e.g., 198.51.100.0/32).",
      },
    ]);

    // Create Security Group
    const spinner = ora("Creating Security Group...").start();
    let securityGroupId = await $`aws ec2 create-security-group \
      --group-name ${securityGroupName} \
      --description "SSH access from home and campus" \
      --vpc-id ${vpcId} \
      --query 'GroupId' \
      --output text`;
    securityGroupId = securityGroupId.stdout.trim();
    spinner.succeed(chalk.green(`Security Group ID: ${securityGroupId}`));

    console.log(chalk.yellow("\nAuthorizing inbound SSH access..."));

    // Authorize Home IP
    await $`aws ec2 authorize-security-group-ingress \
      --group-id ${securityGroupId} \
      --protocol tcp \
      --port 22 \
      --cidr ${homeIpCidr}`;

    // Authorize Campus IP
    await $`aws ec2 authorize-security-group-ingress \
      --group-id ${securityGroupId} \
      --protocol tcp \
      --port 22 \
      --cidr ${campusIpCidr}`;

    console.log(
      chalk.green("Inbound SSH access authorized for specified IPs.")
    );
  } catch (error) {
    throw new AwsCliError(
      "Error configuring Security Group",
      error.stderr || error.message
    );
  }
}

// Reuse the CIDR validation function
function isValidCIDR(cidr) {
  try {
    const [ip, prefix] = cidr.split("/");
    if (!prefix || isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    return net.isIP(ip) !== 0;
  } catch (error) {
    return false;
  }
}
