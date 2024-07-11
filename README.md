<div align="center">
  <br />
    <a href="https://youtu.be/lEflo_sc82g?feature=shared" target="_blank">
      <img src="https://github.com/JavaScript-Mastery-Pro/medicare-dev/assets/151519281/160a9367-29e8-4e63-ae78-29476b04bff3" alt="Project Banner">
    </a>
  <br />

  <div>
    <img src="https://img.shields.io/badge/-Next_JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=000000" alt="nextdotjs" />
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
    <img src="https://img.shields.io/badge/-Tailwind_CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="tailwindcss" />
    <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="nodejs" />
    <img src="https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="aws" />
    <img src="https://img.shields.io/badge/-MongoDB-13aa52?style=for-the-badge&logo=mongodb&logoColor=white" alt="mongodb"/>
  </div>

  <h3 align="center">StreamScale</h3>

   <div align="center">
     A simple and scalable OpenSource video transcoding and streaming service.
    </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1.  [Introduction](#introduction)
2.  [Tech Stack](#tech-stack)
3.  [Features](#features)
4.  [Quick Start](#quick-start)
5.  [Cloud Setup](#cloud-setup)
6.  [Connect With Me](#connect-with-me)

## <a name="introduction">🤖 Introduction</a>

StreamScale is an open-source tool designed to simplify the process of transcoding and streaming videos. Whether you're looking to convert video files into different formats or stream them seamlessly across various devices, StreamScale provides a robust solution. Built with NodeJS (API,Worker), NexJS (frontend), it offers scalability and efficiency, making it ideal for developers and organizations needing reliable video processing capabilities.


![architecture diagram](https://github.com/amankumarsingh77/StreamScale/assets/145339995/20084f05-0a96-4f32-86f4-3307b54f47f1)


## <a name="tech-stack">⚙️ Tech Stack</a>

- Next.js
- MongoDB
- AWS
- Typescript
- TailwindCSS
- ShadCN
- NodeJS

## <a name="features">🔋 Features</a>

👉 **Register **: Users can sign up to get access to the dashboard.

👉 **Upload Video Files**: Users can upload videos that will then be transcoded.

👉 **Update Profile**: Users can update their profile details.

👉 **User Authorization**: As transcoding a video is a costly process only a few people are allowed to use the app as of now (Will shift to subscription-based soon).

👉 **File Upload Using AWS S3**: Users can upload the video files which will initially stored on AWS S3.

👉 **Transcode A Video**: A transcoding task starts as soon as a user uploads the video and does all the required processes to make it work.

👉 **Dashboard**: Authorized users can upload and view the details (name, status, size) of the videos.

👉 **Video Player**: After the video is transcoded the user can play the videos in the browser itself.

**New features will added in future**

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)

Here are some prerequisites that are required to run this project:
- [AWS](https://aws.amazon.com/) account.
- [Cloudflare](https://www.cloudflare.com/) Account with updated billing information (You can skip this if you want to use s3 as your primary storage).
- [MongoDB](https://www.mongodb.com/) and a [Redis](https://upstash.com/) database URL (Ignore if deploying locally).

**Cloning the Repository**

```bash
git clone https://github.com/amankumarsingh77/StreamScale.git
cd healthcare
```

**Installation**

Install the project dependencies using npm:

**Client**

```bash
cd client
npm install
```

**Server**

```bash
cd client
npm install
```

**Worker**

```bash
cd client
npm install
```

**Set Up Environment Variables**

Create a new file named `.env.local` in the root of your project and add the following content:

```env
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

Replace the placeholder values with your actual credentials.


**Running the Project**

**Client**
```bash
npm run dev
```

**Server**
```bash
node server.js
```

**Client**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.

## <a name="cloud-setup">Cloud Setup</a>

### AWS

**Upload the AWS Cloudformation template**:

  - Make sure to have your AWS account registered, up and running [here](https://aws.amazon.com/free)
  - Download the `cloudformation.yml` file from [here](https://github.com/amankumarsingh77/StreamScale/blob/main/cloudformation.yml)
  - Visit [AWS CloudFormation service](https://ap-southeast-2.console.aws.amazon.com/cloudformation/home?region=ap-southeast-2#/getting-started).
  - Click on the `Create Stack` button.
  - On the Create Stack page, select `Upload a template file`.
  - Choose the `cloudformation.yml` file you downloaded earlier, and click on `Next`.
  - Once the stack creation is complete click on the `output` tab to get all the `aws` required credentials and copy them into your `.env` file.

### Cloudflare R2

**Create a R2 bucket**:
  - Navigate to R2 section
  - Click on "Create Bucket"
  - Fill the basic details as per your requirements and click on "Create Bucket" button.

**Configure R2**:
  - R2 dev domain is used to serve the static files. But it is disabled by default.
  - You can enable it by going to settings tab of the bucket and clicking on the  "Allow Access" (Not recommended. [Learn more](https://developers.cloudflare.com/r2/buckets/public-buckets/#disable-domain-access)).
  - You can attach your own domain.
  ![image](https://github.com/amankumarsingh77/healthcare/assets/145339995/22b42f04-1270-46d1-8791-54bb514bb5fb)



## Connect With Me

Q) Want to chat or need assistance with setting up a project?

A) You can connect with me on [twitter](https://x.com/amankumar404) and [gmail](mailto:amankumarsingh7702@gmail.com)

