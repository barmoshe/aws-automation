import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import {
  $,
  AwsCliError,
  getVPCs,
  getSubnets,
  getKeyPairs,
  getSecurityGroups,
  getLatestAmiIdForOs,
} from "../utils/awsHelpers.mjs";

export async function createEC2Instance() {
  console.log(chalk.bold.cyan("\n=== 🚀 Create EC2 Instance ===\n"));

  try {
    // Display a spinner while fetching VPCs
    const vpcSpinner = ora(
      chalk.yellowBright("Fetching available VPCs...")
    ).start();

    // List available VPCs
    let vpcs = await getVPCs();

    if (vpcs.length === 0) {
      vpcSpinner.fail(chalk.red("No VPCs found. Please create a VPC first."));
      return;
    } else {
      vpcSpinner.succeed(chalk.green("VPCs fetched successfully."));
    }

    // Prompt user to select a VPC
    const { vpcId } = await inquirer.prompt([
      {
        type: "list",
        name: "vpcId",
        message: chalk.cyanBright("Select a VPC:"),
        choices: vpcs.map((vpc) => ({
          name: `${vpc.Name || "Unnamed VPC"} (${vpc.VpcId})`,
          value: vpc.VpcId,
        })),
      },
    ]);

    // Display a spinner while fetching subnets
    const subnetSpinner = ora(
      chalk.yellowBright("Fetching subnets in the selected VPC...")
    ).start();

    // List subnets in the selected VPC
    let subnets = await getSubnets(vpcId);

    if (subnets.length === 0) {
      subnetSpinner.fail(
        chalk.red("No subnets found in this VPC. Please create a subnet first.")
      );
      return;
    } else {
      subnetSpinner.succeed(chalk.green("Subnets fetched successfully."));
    }

    // Prompt user to select a subnet
    const { subnetId } = await inquirer.prompt([
      {
        type: "list",
        name: "subnetId",
        message: chalk.cyanBright("Select a Subnet:"),
        choices: subnets.map((subnet) => ({
          name: `${subnet.Name || "Unnamed Subnet"} (${subnet.SubnetId})`,
          value: subnet.SubnetId,
        })),
      },
    ]);

    // Prompt for Key Pair
    const keyPairSpinner = ora(
      chalk.yellowBright("Fetching available Key Pairs...")
    ).start();
    const keyPairs = await getKeyPairs();

    if (keyPairs.length === 0) {
      keyPairSpinner.fail(
        chalk.red("No Key Pairs found. Please create a Key Pair first.")
      );
      return;
    } else {
      keyPairSpinner.succeed(chalk.green("Key Pairs fetched successfully."));
    }

    const { keyName } = await inquirer.prompt([
      {
        type: "list",
        name: "keyName",
        message: chalk.cyanBright("Select a Key Pair:"),
        choices: keyPairs.map((key) => ({
          name: key,
          value: key,
        })),
      },
    ]);

    // Prompt for AMI Selection
    const { amiChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "amiChoice",
        message: chalk.cyanBright("Select an AMI:"),
        choices: [
          {
            name: "🐧  Amazon Linux 2",
            value: "Amazon Linux 2",
          },
          {
            name: "🟠  Ubuntu Server 20.04 LTS",
            value: "Ubuntu Server 20.04 LTS",
          },
          {
            name: "🟠  Ubuntu Server 22.04 LTS",
            value: "Ubuntu Server 22.04 LTS",
          },
          {
            name: "🔧  Custom AMI ID",
            value: "Custom AMI ID",
          },
        ],
      },
    ]);

    let amiId;

    if (amiChoice === "Custom AMI ID") {
      const { customAmiId } = await inquirer.prompt([
        {
          type: "input",
          name: "customAmiId",
          message: chalk.cyanBright("Enter the AMI ID:"),
          validate: (input) => (input ? true : "AMI ID cannot be empty."),
        },
      ]);
      amiId = customAmiId;
    } else {
      const amiSpinner = ora(
        chalk.yellowBright(`Fetching the latest AMI ID for ${amiChoice}...`)
      ).start();
      amiId = await getLatestAmiIdForOs(amiChoice);
      if (!amiId) {
        amiSpinner.fail(
          chalk.red(`Could not retrieve the AMI ID for ${amiChoice}.`)
        );
        return;
      } else {
        amiSpinner.succeed(
          chalk.green(`Latest AMI ID for ${amiChoice} fetched successfully.`)
        );
      }
    }

    // Prompt for Security Group
    const sgSpinner = ora(
      chalk.yellowBright("Fetching available Security Groups...")
    ).start();
    const securityGroups = await getSecurityGroups(vpcId);

    if (securityGroups.length === 0) {
      sgSpinner.fail(
        chalk.red(
          "No Security Groups found. Please create a Security Group first."
        )
      );
      return;
    } else {
      sgSpinner.succeed(chalk.green("Security Groups fetched successfully."));
    }

    const { securityGroupId } = await inquirer.prompt([
      {
        type: "list",
        name: "securityGroupId",
        message: chalk.cyanBright("Select a Security Group:"),
        choices: securityGroups.map((sg) => ({
          name: `${sg.GroupName} (${sg.GroupId})`,
          value: sg.GroupId,
        })),
      },
    ]);

    // Prompt for Instance Name
    const { instanceName } = await inquirer.prompt([
      {
        type: "input",
        name: "instanceName",
        message: chalk.cyanBright("Enter a name for the EC2 instance:"),
        validate: (input) => (input ? true : "Instance name cannot be empty."),
      },
    ]);

    // Launch EC2 Instance with public IP address
    const launchSpinner = ora(
      chalk.yellowBright("Launching EC2 Instance...")
    ).start();

    let instanceIdResult = await $`aws ec2 run-instances \
      --image-id ${amiId} \
      --count 1 \
      --instance-type t2.micro \
      --key-name ${keyName} \
      --security-group-ids ${securityGroupId} \
      --subnet-id ${subnetId} \
      --associate-public-ip-address \
      --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=${instanceName}}]' \
      --query 'Instances[0].InstanceId' \
      --output text`;
    let instanceId = instanceIdResult.stdout.trim();

    if (instanceId) {
      launchSpinner.succeed(
        chalk.green(
          `Instance launched successfully. Instance ID: ${instanceId}`
        )
      );
    } else {
      launchSpinner.fail(chalk.red("Failed to launch EC2 Instance."));
      return;
    }

    const waitSpinner = ora(
      chalk.yellowBright(
        "Waiting for the instance to enter the running state..."
      )
    ).start();
    await $`aws ec2 wait instance-running --instance-ids ${instanceId}`;
    waitSpinner.succeed(chalk.green("Instance is now running."));

    // Retrieve and display the public IP address
    const ipSpinner = ora(
      chalk.yellowBright("Retrieving the public IP address...")
    ).start();
    let publicIpResult = await $`aws ec2 describe-instances \
      --instance-ids ${instanceId} \
      --query 'Reservations[0].Instances[0].PublicIpAddress' \
      --output text`;
    let publicIp = publicIpResult.stdout.trim();

    if (publicIp && publicIp !== "None") {
      ipSpinner.succeed(chalk.green(`Public IP Address: ${publicIp}`));
      console.log(chalk.cyanBright(`\nYou can SSH into the instance using:`));
      console.log(
        chalk.greenBright(
          `ssh -i "/path/to/${keyName}.pem" ec2-user@${publicIp}\n`
        )
      );
    } else {
      ipSpinner.fail(chalk.red("Failed to retrieve the public IP address."));
    }
  } catch (error) {
    handleError(error);
  }
}
