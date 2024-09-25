import inquirer from "inquirer";
import {
  $,
  AwsCliError,
  getVPCs,
  getSubnets,
  getKeyPairs,
  getSecurityGroups,
  getLatestAmiIdForOs,
} from "../utils/awsHelpers.mjs";

export async function createLaunchTemplate() {
  try {
    console.log("\n=== Create Launch Template ===");

    // Prompt for Launch Template Name
    const { templateName } = await inquirer.prompt([
      {
        type: "input",
        name: "templateName",
        message: "Enter a name for the launch template (required):",
        validate: (input) =>
          input ? true : "Launch template name is required.",
      },
    ]);

    // Prompt for Template Version Description
    const { templateVersionDescription } = await inquirer.prompt([
      {
        type: "input",
        name: "templateVersionDescription",
        message: "Enter a description for this template version (optional):",
      },
    ]);

    // Select an AMI
    const { amiChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "amiChoice",
        message: "Select an AMI:",
        choices: [
          "Amazon Linux 2",
          "Ubuntu Server 20.04 LTS",
          "Ubuntu Server 22.04 LTS",
          "Custom AMI ID",
        ],
      },
    ]);

    let amiId;
    if (amiChoice === "Custom AMI ID") {
      const { customAmiId } = await inquirer.prompt([
        {
          type: "input",
          name: "customAmiId",
          message: "Enter the AMI ID:",
          validate: (input) => (input ? true : "AMI ID cannot be empty."),
        },
      ]);
      amiId = customAmiId;
    } else {
      amiId = await getLatestAmiIdForOs(amiChoice);
      if (!amiId) {
        console.log(`Could not retrieve the AMI ID for ${amiChoice}.`);
        return;
      }
    }

    // Select a Key Pair
    const keyPairs = await getKeyPairs();
    const { keyName } = await inquirer.prompt([
      {
        type: "list",
        name: "keyName",
        message: "Select a Key Pair:",
        choices: keyPairs,
      },
    ]);

    // Select a VPC
    const vpcs = await getVPCs();
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

    // Select a Subnet
    const subnets = await getSubnets(vpcId);
    const { subnetId } = await inquirer.prompt([
      {
        type: "list",
        name: "subnetId",
        message: "Select a Subnet:",
        choices: subnets.map((subnet) => ({
          name: `${subnet.Name || "Unnamed Subnet"} (${subnet.SubnetId})`,
          value: subnet.SubnetId,
        })),
      },
    ]);

    // Select a Security Group
    const securityGroups = await getSecurityGroups(vpcId);
    const { securityGroupId } = await inquirer.prompt([
      {
        type: "list",
        name: "securityGroupId",
        message: "Select a Security Group:",
        choices: securityGroups.map((sg) => ({
          name: `${sg.GroupName} (${sg.GroupId})`,
          value: sg.GroupId,
        })),
      },
    ]);

    // Prompt for EBS Volume (size, type, and delete on termination)
    const { addEbsVolume } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addEbsVolume",
        message: "Would you like to add an EBS volume to the template?",
        default: false,
      },
    ]);

    let ebsBlockDeviceMapping = '';
    if (addEbsVolume) {
      const { volumeSize, volumeType, deleteOnTermination } = await inquirer.prompt([
        {
          type: "input",
          name: "volumeSize",
          message: "Enter the size of the EBS volume (in GiB):",
          validate: (input) => input && !isNaN(input) ? true : "Please enter a valid number.",
        },
        {
          type: "list",
          name: "volumeType",
          message: "Select the EBS volume type:",
          choices: ["gp2", "gp3", "io1", "io2", "sc1", "st1"],
        },
        {
          type: "confirm",
          name: "deleteOnTermination",
          message: "Should the volume be deleted on instance termination?",
          default: true,
        },
      ]);

      // Properly format the BlockDeviceMappings JSON
      ebsBlockDeviceMapping = `
        "BlockDeviceMappings": [
          {
            "DeviceName": "/dev/sdh",
            "Ebs": {
              "VolumeSize": ${volumeSize},
              "VolumeType": "${volumeType}",
              "DeleteOnTermination": ${deleteOnTermination}
            }
          }
        ]`;
    }

    // Hard-coded instance type (t2.micro)
    const instanceType = "t2.micro";

    // Build the launch template data object
    const launchTemplateData = `
    {
      "ImageId": "${amiId}",
      "InstanceType": "${instanceType}",
      "KeyName": "${keyName}",
      "NetworkInterfaces": [
        {
          "DeviceIndex": 0,  
          "AssociatePublicIpAddress": true,
          "SubnetId": "${subnetId}",
          "Groups": ["${securityGroupId}"]
        }
      ]${ebsBlockDeviceMapping ? ',' + ebsBlockDeviceMapping : ''}
    }`;

    // Use AWS CLI to create the Launch Template
    console.log("\nCreating Launch Template...");
    await $`aws ec2 create-launch-template \
      --launch-template-name ${templateName} \
      --version-description ${templateVersionDescription || "Default version"} \
      --launch-template-data ${launchTemplateData}`;

    console.log(`Launch template "${templateName}" created successfully.`);
  } catch (error) {
    throw new AwsCliError(
      "Error creating launch template",
      error.stderr || error.message
    );
  }
}
