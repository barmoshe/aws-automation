import inquirer from 'inquirer';
import { $, AwsCliError, getVPCs } from '../utils/awsHelpers.mjs';
import { isValidCIDR } from '../utils/validators.mjs';

export async function configureSecurityGroup() {
  console.log("\n=== Configure Security Group ===");

  try {
    // List available VPCs
    let vpcs = await getVPCs();

    if (vpcs.length === 0) {
      console.log("No VPCs found. Please create a VPC first.");
      return;
    }

    // Prompt user to select a VPC
    const { vpcId } = await inquirer.prompt([
      {
        type: "list",
        name: "vpcId",
        message: "Select a VPC:",
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
        message: "Enter the Security Group name:",
        validate: (input) =>
          input ? true : "Security Group name cannot be empty.",
      },
    ]);

    // Prompt for Home and Campus IP CIDRs
    const { homeIpCidr, campusIpCidr } = await inquirer.prompt([
      {
        type: "input",
        name: "homeIpCidr",
        message: "Enter your Home IP CIDR (e.g., 203.0.113.0/32):",
        validate: (input) =>
          isValidCIDR(input)
            ? true
            : "Please enter a valid CIDR notation (e.g., 203.0.113.0/32).",
      },
      {
        type: "input",
        name: "campusIpCidr",
        message: "Enter your Campus IP CIDR (e.g., 198.51.100.0/32):",
        validate: (input) =>
          isValidCIDR(input)
            ? true
            : "Please enter a valid CIDR notation (e.g., 198.51.100.0/32).",
      },
    ]);

    // Create Security Group
    console.log("\nCreating Security Group...");
    let securityGroupIdResult = await $`aws ec2 create-security-group \
      --group-name ${securityGroupName} \
      --description "SSH access from home and campus" \
      --vpc-id ${vpcId} \
      --query 'GroupId' \
      --output text`;
    let securityGroupId = securityGroupIdResult.stdout.trim();
    console.log(`Security Group ID: ${securityGroupId}`);

    console.log("\nAuthorizing inbound SSH access...");

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

    console.log("Inbound SSH access authorized for specified IPs.");
  } catch (error) {
    throw new AwsCliError("Error configuring Security Group", error.stderr || error.message);
  }
}
