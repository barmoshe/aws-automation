# AWS Automation Script

Welcome to the **AWS Automation Script**, a Node.js CLI tool designed to streamline and automate common AWS tasks such as creating key pairs, launching EC2 instances, configuring security groups, attaching EBS volumes, and creating snapshots.
![ezgif-7-f51421b506](https://github.com/user-attachments/assets/56407727-78a2-4b5c-a532-117a1327ca80)

## Features

- **Create Key Pairs**: Generate AWS EC2 key pairs for secure SSH access.
- **Launch EC2 Instances**: Easily launch EC2 instances with customizable configurations.
- **Configure Security Groups**: Set up security groups to manage SSH access.
- **SSH into Instances**: Seamlessly connect to your EC2 instances via SSH.
- **Attach EBS Volumes**: Add additional storage to your EC2 instances with EBS volumes.
- **Create Snapshots**: Backup your EBS volumes by creating snapshots.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Make sure you have Node.js installed. You can download it from [here](https://nodejs.org/).
- **AWS CLI**: Install and configure the AWS CLI with your credentials. Instructions can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html).
- **AWS Credentials**: Ensure your AWS credentials are properly set up with the necessary permissions to perform EC2 operations.

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
which will excute 
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
7. **Exit**

### Example: Creating a Key Pair

1. Select **Create Key Pairs** from the menu.
2. Enter a name for your key pair.
3. The key pair will be created and saved as a `.pem` file in your project directory.

```bash
aws ec2 create-key-pair --key-name MyKeyPair --query 'KeyMaterial' --output text > MyKeyPair.pem
chmod 400 MyKeyPair.pem
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
