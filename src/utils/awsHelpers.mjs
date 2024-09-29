import { $, ProcessOutput } from "zx";

export { $ };

export class AwsCliError extends Error {
  constructor(message, stderr) {
    super(message);
    this.name = "AwsCliError";
    this.stderr = stderr;
  }
}
export async function getAutoScalingGroups() {
  try {
    const result =
      await $`aws autoscaling describe-auto-scaling-groups --query 'AutoScalingGroups[*].{AutoScalingGroupName:AutoScalingGroupName}' --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Auto Scaling Groups",
      error.stderr || error.message
    );
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
export async function getLaunchTemplates() {
  try {
    const result =
      await $`aws ec2 describe-launch-templates --query 'LaunchTemplates[*].{LaunchTemplateName:LaunchTemplateName,LaunchTemplateId:LaunchTemplateId,LatestVersionNumber:LatestVersionNumber}' --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Launch Templates",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get VPCs
export async function getVPCs() {
  try {
    const result =
      await $`aws ec2 describe-vpcs --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==\`Name\`]|[0].Value}' --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError("Error fetching VPCs", error.stderr || error.message);
  }
}

// Helper Function: Get Subnets
export async function getSubnets(vpcId) {
  try {
    const result = await $`aws ec2 describe-subnets \
      --filters Name=vpc-id,Values=${vpcId} \
      --query 'Subnets[*].{SubnetId:SubnetId,Name:Tags[?Key==\`Name\`]|[0].Value}' \
      --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Subnets",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Key Pairs
export async function getKeyPairs() {
  try {
    const result =
      await $`aws ec2 describe-key-pairs --query 'KeyPairs[*].KeyName' --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Key Pairs",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Security Groups
export async function getSecurityGroups(vpcId) {
  try {
    const result = await $`aws ec2 describe-security-groups \
      --filters Name=vpc-id,Values=${vpcId} \
      --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName}' \
      --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Security Groups",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Running Instances
export async function getRunningInstances() {
  try {
    const result = await $`aws ec2 describe-instances \
      --filters Name=instance-state-name,Values=running \
      --query 'Reservations[*].Instances[*].{InstanceId:InstanceId,PublicIpAddress:PublicIpAddress,KeyName:KeyName,Placement:Placement,Name:Tags[?Key==\`Name\`]|[0].Value}' \
      --output json`;
    return JSON.parse(result.stdout).flat();
  } catch (error) {
    throw new AwsCliError(
      "Error fetching EC2 Instances",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Volumes
export async function getVolumes() {
  try {
    const result = await $`aws ec2 describe-volumes \
      --query 'Volumes[*].{VolumeId:VolumeId,Size:Size,Name:Tags[?Key==\`Name\`]|[0].Value}' \
      --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching EBS Volumes",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Snapshots
export async function getSnapshots() {
  try {
    const result = await $`aws ec2 describe-snapshots \
      --owner-ids self \
      --query 'Snapshots[*].{SnapshotId:SnapshotId,StartTime:StartTime,Name:Tags[?Key==\`Name\`]|[0].Value}' \
      --output json`;
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new AwsCliError(
      "Error fetching Snapshots",
      error.stderr || error.message
    );
  }
}

// Helper Function: Get Latest AMI ID for OS
export async function getLatestAmiIdForOs(osChoice) {
  try {
    let amiNameFilter;
    switch (osChoice) {
      case "Amazon Linux 2":
        amiNameFilter = "amzn2-ami-hvm-*-x86_64-gp2";
        break;
      case "Ubuntu Server 20.04 LTS":
        amiNameFilter =
          "ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*";
        break;
      case "Ubuntu Server 22.04 LTS":
        amiNameFilter =
          "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*";
        break;
      default:
        return null;
    }

    let result = await $`aws ec2 describe-images \
        --owners amazon \
        --filters Name=name,Values=${amiNameFilter} Name=state,Values=available \
        --query 'Images[*].{ImageId:ImageId,CreationDate:CreationDate}' \
        --output json`;
    let images = JSON.parse(result.stdout);

    // Sort images by CreationDate descending
    images.sort((a, b) => new Date(b.CreationDate) - new Date(a.CreationDate));

    if (images.length > 0) {
      return images[0].ImageId;
    } else {
      return null;
    }
  } catch (error) {
    throw new AwsCliError(
      "Error fetching AMI ID",
      error.stderr || error.message
    );
  }
}
export async function getDefaultSecurityGroup(vpcId) {
  try {
    const result = await $`aws ec2 describe-security-groups \
      --filters Name=vpc-id,Values=${vpcId} Name=group-name,Values=default \
      --query 'SecurityGroups[0]' \
      --output json`;

    return JSON.parse(result.stdout);
  } catch (error) {
    console.error("Error fetching default Security Group:", error);
    return null;
  }
}
