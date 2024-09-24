# AWS Automation Script

![AWS](https://img.shields.io/badge/AWS-Automation-blue)

## Overview

This project is an automation script built with JavaScript and the `zx` library to manage various AWS resources via the AWS CLI. It provides a user-friendly CLI interface to perform tasks such as creating key pairs, launching EC2 instances, configuring security groups, attaching EBS volumes, and creating snapshots.

## Features

- **Create Key Pairs**: Generate and manage SSH key pairs for EC2 instances.
- **Launch EC2 Instances**: Create EC2 instances with specified configurations.
- **Configure Security Groups**: Set up security groups to allow SSH access from specific IP ranges.
- **SSH into EC2 Instances**: Easily connect to your EC2 instances via SSH.
- **Attach EBS Volumes**: Add additional storage to your EC2 instances.
- **Create Snapshots**: Backup EBS volumes by creating snapshots.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed. [Download Node.js](https://nodejs.org/)
- **AWS CLI**: Install and configure the AWS CLI with the necessary permissions. [AWS CLI Installation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- **Git**: For version control. [Git Installation](https://git-scm.com/downloads)

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/aws-automation.git
   cd aws-automation
