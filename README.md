
# StreamScale

**NOTE**: The documentation is still being written.

A simple and scalable OpenSource video transcoding and streaming service.



    


## Tech Stack

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![NextJS](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Code](https://img.shields.io/badge/Visual_Studio_Code-0078D4?style=for-the-badge&logo=visual%20studio%20code&logoColor=white)



## Table of Contents

- [Introduction](#introduction)

- [Getting Started](#getting-started)

- [Usage](#usage)

- [Contributing](#contributing)

- [License](#license)

- [Contact](#contact)

- [Acknowledgments](#acknowledgments)

## Introduction

StreamScale is an open-source tool designed to simplify the process of transcoding and streaming videos. Whether you're looking to convert video files into different formats or stream them seamlessly across various devices, StreamScale provides a robust solution. Built with NodeJS (API,Worker), NexJS (frontend), it offers scalability and efficiency, making it ideal for developers and organizations needing reliable video processing capabilities.
## Getting Started

### Prerequisites

Here are some prerequisites that are required to run this project:
- AWS account.
- Cloudflare Account with updated billing information (You can skip this if you want to use s3 as your primary storage).
- Node.js and npm installed on your machine.
- MongoDB and a Redis database url (Ignore if deploying locally).

### Installation

Follow the below steps to setup StreamScale on your system.

```bash
  git clone https://github.com/amankumarsingh77/StreamScale.git
```

#### Client:
```bash
  cd Client
  npm install
```
#### Server:
```bash
  cd api
  npm install
```
#### Worker:
```bash
  cd worker
  npm install
```

### Environment Variables

```bash
  #aws credentials 

  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  AWS_REGION=
  AWS_CLUSTER_ARN=
  AWS_TASK_ARN=
  AWS_QUEUE_URL=
  SUBNET1=
  SUBNET2=
  SUBNET3=
  SECURITY_GROUP_ID=
  AWS_S3_BUCKET=

  #cloudflare r2 credentials

  R2_BUCKET=
  R2_REGION=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_ENDPOINT=
  CLOUDFLARE_PUBLIC_BASE_URL=

  #redis credentials

  UPSTASH_REDIS_URL=
  UPSTASH_REDIS_TOKEN=
  
  #mongodb credentials

  MONGO_URI=

  #others

  MAX_RUNNING_TASKS=
  SECRET_KEY=
```

