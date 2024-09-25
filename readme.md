# AWS Automation Script

Welcome to the **AWS Automation Script**, a Node.js CLI tool designed to streamline and automate common AWS tasks such as creating key pairs, launching EC2 instances, configuring security groups, attaching EBS volumes, creating snapshots, and managing Auto Scaling Groups, scaling policies, and CloudWatch alarms.

![ezgif-1-523b9b53bd](https://github.com/user-attachments/assets/c1a0e30b-6d28-422e-b9a9-edafc6dc7d20)

## Features

- **Create Key Pairs**: Generate AWS EC2 key pairs for secure SSH access.
- **Launch EC2 Instances**: Easily launch EC2 instances with customizable configurations.
- **Configure Security Groups**: Set up security groups to manage SSH access.
- **SSH into Instances**: Seamlessly connect to your EC2 instances via SSH.
- **Attach EBS Volumes**: Add additional storage to your EC2 instances with EBS volumes.
- **Create Snapshots**: Backup your EBS volumes by creating snapshots.
- **Create Launch Templates**: Define configurations to be reused for Auto Scaling Groups and other resources.
- **Create Auto Scaling Groups**: Automatically manage the number of EC2 instances in a group based on scaling policies.
- **Create Scaling Policies**: Define policies to scale EC2 instances based on CPU utilization or other metrics.
- **Set up CloudWatch Alarms**: Automatically trigger scaling actions based on CloudWatch alarms.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Make sure you have Node.js installed. You can download it from [here](https://nodejs.org/).
- **AWS CLI**: Install and configure the AWS CLI with your credentials. Instructions can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html).
- **AWS Credentials**: Ensure your AWS credentials are properly set up with the necessary permissions to perform EC2 and Auto Scaling operations.

## Installation

Follow these steps to set up the project locally:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/barmoshe/aws-automation.git
   cd aws-automation-script
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Make the CLI Executable**

   ```bash
   chmod +x bin/cli.mjs
   ```

## Usage

Run the CLI to start automating AWS tasks:

```bash
npm start
```

which will execute:

```bash
node bin/cli.mjs
```

Upon running, you will be presented with a menu to select the desired task:

1. **Create Key Pairs**
2. **Create an EC2 machine and attach key pairs**
3. **Configure security group for SSH access**
4. **SSH into the machine**
5. **Attach an EBS volume to the machine**
6. **Create a Snapshot**
7. **Create Launch Template**
8. **Create Auto Scaling Group**
9. **Create Scaling Policy (up/down)**
10. **Set up CloudWatch Alarms for Scaling**
11. **Configure AWS Credentials**
12. **Exit**

### Example: Creating a Key Pair

1. Select **Create Key Pairs** from the menu.
2. Enter a name for your key pair.
3. The key pair will be created and saved as a `.pem` file in your project directory.

```bash
aws ec2 create-key-pair --key-name MyKeyPair --query 'KeyMaterial' --output text > MyKeyPair.pem
chmod 400 MyKeyPair.pem
```

### Example: Creating an Auto Scaling Group

1. Select **Create Auto Scaling Group** from the menu.
2. Enter the Auto Scaling Group name and select the appropriate VPC, subnet, and Launch Template.
3. Set the minimum, maximum, and desired number of instances.

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name MyAutoScalingGroup \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --launch-template LaunchTemplateId=lt-xxxxxxxxxxxx \
  --vpc-zone-identifier subnet-xxxxxxxx
```

### Example: Creating Scaling Policies

1. Select **Create Scaling Policy (up/down)** from the menu.
2. Select the Auto Scaling Group and define the scaling adjustments for both scaling up and scaling down.

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name MyAutoScalingGroup \
  --policy-name ScaleUpPolicy \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity

aws autoscaling put-scaling-policy \
  --auto-scaling-group-name MyAutoScalingGroup \
  --policy-name ScaleDownPolicy \
  --scaling-adjustment -1 \
  --adjustment-type ChangeInCapacity
```

### Example: Setting up CloudWatch Alarms

1. Select **Set up CloudWatch Alarms for Scaling** from the menu.
2. Set the CPU utilization thresholds for scaling up and scaling down.

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name ScaleUpAlarm \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --dimensions "Name=AutoScalingGroupName,Value=MyAutoScalingGroup" \
  --evaluation-periods 2

aws cloudwatch put-metric-alarm \
  --alarm-name ScaleDownAlarm \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --dimensions "Name=AutoScalingGroupName,Value=MyAutoScalingGroup" \
  --evaluation-periods 2
```

## Configuration

The CLI tool can be customized using environment variables or configuration files. Ensure that your AWS CLI is configured with the correct region and credentials.

- **AWS Region**: You can set the AWS region by exporting the `AWS_REGION` environment variable or configuring it in your AWS CLI.

   ```bash
   export AWS_REGION=eu-west-1
   ```

## Acknowledgements

- [zx](https://github.com/google/zx) for simplifying shell scripting in Node.js.
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) for interactive CLI prompts.
