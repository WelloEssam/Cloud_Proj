# Task Manager AWS Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [AWS Services Overview](#aws-services-overview)
- [Phase 1: Backend Infrastructure Setup](#phase-1-backend-infrastructure-setup)
  - [1. Core AWS Resources](#1-core-aws-resources)
  - [2. IAM Role Configuration](#2-iam-role-configuration)
  - [3. Lambda Functions Deployment](#3-lambda-functions-deployment)
  - [4. Environment Variables](#4-environment-variables)
  - [5. API Gateway Setup](#5-api-gateway-setup)
  - [6. Notification Service](#6-notification-service)
- [Phase 2: VPC and Frontend Infrastructure](#phase-2-vpc-and-frontend-infrastructure)
  - [7. VPC Configuration](#7-vpc-configuration)
  - [8. EC2 Instance Setup](#8-ec2-instance-setup)
  - [9. CORS Configuration](#9-cors-configuration)
  - [10. Server Configuration](#10-server-configuration)

---

## Prerequisites

Before starting the deployment, ensure you have:

- ✅ **AWS account** with appropriate permissions
- ✅ **AWS CLI** installed and configured
- ✅ **Node.js and npm** installed in VSCode for downloading dependencies
- ✅ **Backend code** ready in separate folders

---

## AWS Services Overview

This deployment uses the following AWS services:

| Service | Purpose |
|---------|---------|
| **Lambda** | Runs backend logic |
| **API Gateway** | Provides REST API endpoints |
| **S3** | Stores file attachments |
| **DynamoDB** | Stores task metadata |
| **RDS (PostgreSQL)** | Stores user-task relationships |
| **SQS** | Queues task events |
| **SES** | Processes SQS messages and sends emails |
| **EC2** | Hosts frontend application |
| **VPC** | Provides isolated network environment |

---

## Phase 1: Backend Infrastructure Setup

### 1. Core AWS Resources

#### S3 Bucket Setup
1. Go to **S3 Console** → **Create bucket**
2. Name it: `task-attachments-bucket1`
3. Keep it private (no public access)

#### DynamoDB Table Setup
1. Go to **DynamoDB** → **Create Table**
2. **Table name:** `TaskMetadata`
3. **Partition key:** `task_id` (String)
4. Use **On-Demand capacity mode**

#### RDS (PostgreSQL) Setup
1. Create PostgreSQL instance, **publicly accessible**
2. Use **DBeaver** to connect on **Port 5432** and **Enable SSL** (set to require)
3. Run the following SQL commands:

```sql
CREATE TABLE task_user (
  task_id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL
);

CREATE TABLE users (
  user_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL
);
```

#### SQS Queue Setup
1. Go to **SQS** → **Create queue**
2. **Queue name:** `task-events-queue`
3. Use **standard settings**

#### SES Configuration
1. Go to **SES Console** → **Identities**
2. Click **Create identity**
3. Choose **Email address**
4. Enter the email address that will send the email messages
5. AWS will send a verification email, click the link to complete verification
6. Create an identity for the email that should receive the email messages as well

### 2. IAM Role Configuration

1. Go to **IAM** → **Create Role** (trusted entity: Lambda)
2. Attach the following policies:
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonSQSFullAccess`
   - `AWSLambdaBasicExecutionRole`
   - For **AmazonSES**, it should be limited to: **write**
3. Name it: `TaskBackendRole`

### 3. Lambda Functions Deployment

#### Basic Lambda Deployment
For each Lambda folder:

1. Run the following PowerShell command:
```powershell
Compress-Archive -Path * -DestinationPath ../createTask.zip -Force
```

2. Create a new Lambda function (Node.js, handler: `index.handler`)
3. Assign IAM role: `TaskBackendRole`
4. Upload the zipped folder of the lambda and deploy

#### PostgreSQL Layer Setup
To connect Lambda functions to PostgreSQL:

1. In VSCode, create an empty folder called `pg-module`
2. Inside it, create a folder named `nodejs`
3. Inside the `nodejs` folder, run:
```bash
npm init -y
npm install pg
```

4. Zip the `pg-module` folder
5. Go to **AWS Lambda** → **Layers**
6. Click **Create layer**
7. Set:
   - **Name:** `pg-layer`
   - **Upload:** your `pg-layer.zip`
   - **Compatible runtimes:** Node.js 22.x
8. Click **Create**

#### Adding Layer to Lambda Functions
For Lambda functions that access PostgreSQL:

1. Go to the Lambda function
2. Click **Configuration** → **Layers**
3. Click **Add a layer**
4. Choose:
   - **Custom layers**
   - Pick `pg-layer`
   - Select the correct version
5. Click **Add**

### 4. Environment Variables

Add the following environment variables to your Lambda functions:

```
DYNAMO_TABLE_NAME = TaskMetadata
S3_BUCKET_NAME = task-attachments-bucket1
SQS_QUEUE_URL = [full SQS queue URL]
RDS_HOST = [your RDS endpoint]
RDS_USER = [DB username]
RDS_PASSWORD = [DB password]
RDS_DB = postgres
SENDER_EMAIL = [the email of the email sender (from SES)]
```

### 5. API Gateway Setup

1. Create a **REST API**
2. Add resource: `/tasks`
3. Add **POST method** → integrate with `createTask` Lambda
4. Enable **Lambda Proxy Integration**
5. Deploy the API (stage: `dev`)
6. Repeat for other lambdas with different methods (like **GET method** for `getTasks` lambda)

### 6. Notification Service

After deploying the notifications lambda:

1. Go to **Configuration** → **Triggers**
2. Click **Add trigger**
3. Choose **SQS**
4. Select your queue: `task-events-queue`
5. Click **Add**
6. Ensure the trigger is enabled

---

## Phase 2: VPC and Frontend Infrastructure

### 7. VPC Configuration

#### Create VPC
1. Navigate to the **AWS VPC console** and create a new VPC
2. **VPC Configuration:**
   - **Name:** `Project-VPC`
   - **IPv4 CIDR block:** `10.0.0.0/16`

#### Create Subnets
Create a public subnet to connect the frontend:

- **Name:** `Project-Subnet`
- **VPC:** Select your previously created `Project-VPC`
- **Availability Zone:** Choose one (same as your other services region and EC2)
- **IPv4 CIDR block:** `10.0.1.0/24`

#### Configure Internet Gateway
1. Create an Internet Gateway:
   - **Name:** `Project-Gateway`
2. After creation, attach it to your `Project-VPC`

#### Set Up Route Tables
1. Create a new route table named `Project-RT`
2. Associate it with your public subnet (`Project-Subnet`)
3. Add a route:
   - **Destination:** `0.0.0.0/0`
   - **Target:** your Internet Gateway

#### Configure Security Groups
Create a security group for the frontend:

- **Name:** `Project-SG`
- **VPC:** `Project-VPC`
- **Inbound rules:**
  - HTTP (port 80) from `0.0.0.0/0`
  - HTTPS (port 443) from `0.0.0.0/0`
  - SSH (port 22) from your IP only for connecting to instance privately
  - Custom port for your app (e.g., 3000) from `0.0.0.0/0`

### 8. EC2 Instance Setup

#### Launch Frontend EC2 Instance
1. Navigate to **EC2 console** and launch a new instance
2. **Instance Configuration:**
   - **AMI:** Amazon Linux 2 or Ubuntu Server 20.04 LTS
   - **Instance Type:** `t3.micro` (sufficient for development/testing)
   - **Network:** `Project-VPC`
   - **Subnet:** `Project-Subnet`
   - **Auto-assign Public IP:** Enable
   - **Security Group:** `Project-SG`
   - **Key Pair:** Create new or use existing (Download to use later to connect to SSH)

### 9. CORS Configuration

Before starting your EC2 instance, prepare it to access lambda functions (backend API) without CORS errors:

1. Go to the **API Gateway Console**
2. Select your API and the `/tasks` resource
3. Under **Actions**, choose **Enable CORS**
4. Set:
   - **Access-Control-Allow-Origin:** `https://16.16.209.41`
   - **Access-Control-Allow-Methods:** `GET, POST, PUT, DELETE, OPTIONS`
   - **Access-Control-Allow-Headers:** `Content-Type, X-Amz-Date, Authorization, X-Api-Key`
5. Click **Enable CORS and replace existing CORS headers**
6. **Redeploy the API:**
   - After enabling CORS, deploy your API to the `dev` stage by selecting **Deploy API** from the Actions dropdown
   - Confirm the deployment to ensure changes take effect

### 10. Server Configuration

#### Connect to EC2 Instance
You can get your instance public IP from the instance dashboard. Let's say the instance IP is: `xx.xx.xx.xx`

```bash
ssh -i your-key.pem ec2-user@xx.xx.xx.xx
```

#### System Setup
After successful connection through your terminal:

```bash
# Update system packages
sudo yum update -y

# Install Node.js and npm (for React/Vue apps – in our case we had static pages so we can skip this part)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node

# Install nginx to prepare server environment
sudo amazon-linux-extras install nginx1

# Create new Nginx sites configuration
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

#### SSL Certificate Setup
Create a self-signed key for your server:

```bash
sudo mkdir -p /etc/ssl/private
sudo chmod 700 /etc/ssl/private
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Org/OU=IT Department/CN=xx.xx.xx.xx"
# xx.xx.xx.xx = your instance ip
```

#### Nginx Configuration
Create a configuration file specifically for your application:

```bash
sudo nano /etc/nginx/sites-available/Project
```

Paste the following in this newly created config:

```nginx
#http
server {
    listen 80;
    server_name _;  # This accepts any domain name or IP address

    # This is the crucial part - point to where your index.html lives
    root /home/ec2-user/Cloud_Proj/Frontend/;
    index index.html;
    return 301 https://$host$request_uri;
    
    # This location block handles requests for your main application
    location / {
        try_files $uri $uri/ /index.html;
        # This line is important - it ensures that if someone visits
        # a specific page directly, they still get your main HTML file
    }

    # This helps with performance by setting proper headers for static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

#https
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/selfsigned.key;

    location / {
        root /home/ec2-user/Cloud_Proj/Frontend/;
        index index.html;
    }
}
```

#### Git Setup and Repository Clone
Install git and clone your frontend repository:

```bash
sudo yum install git -y

# Clone your frontend repo (make sure index.html is in root folder)
git clone https://github.com/your-repo-link

sudo chmod 755 /home/ec2-user/your-repo-folder
```

#### Final Nginx Configuration
Configure the main nginx settings:

```bash
sudo nginx -t

# Edit the main Nginx configuration
sudo nano /etc/nginx/nginx.conf
```

Add this line inside http braces under include:
```nginx
include /etc/nginx/sites-enabled/*;
```

#### Start Services
Enable and start nginx:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🎉 Deployment Complete!

When your instance is running, and you type in your browser: `https://xx.xx.xx.xx` (your instance IP), and your code is working properly, you should be able to access your deployed app seamlessly.

---

## Notes

- Replace `xx.xx.xx.xx` with your actual instance IP address
- Ensure all security groups and firewall rules are properly configured
- Monitor your AWS costs, especially for RDS and EC2 instances
- Consider using AWS CloudFormation or Terraform for infrastructure as code in production environments