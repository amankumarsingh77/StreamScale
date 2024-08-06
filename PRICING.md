## Cost Analysis

### AWS Fargate
- **Number of tasks or pods:**
  - 33 per day * (730 hours in a month / 24 hours in a day) = 1003.75 per month

- **Average duration:**
  - 22 minutes = 0.37 hours

- **Cost Calculation:**
  - vCPU hours: 
    - 1,003.75 tasks x 4 vCPU x 0.37 hours x $0.04048 per hour = $60.14
  - GB hours: 
    - 1,003.75 tasks x 8.00 GB x 0.37 hours x $0.004445 per GB per hour = $13.21
  - Ephemeral storage: 
    - 20 GB - 20 GB (no additional charge) = 0.00 GB billable ephemeral storage per task

- **Total Cost:**
  - $60.14 for vCPU hours + $13.21 for GB hours = $73.35
  - Fargate cost (monthly): $73.35 for 1000 videos a month

### AWS EC2
- **Savings Plans vs. On-Demand Instances:**
  - For utilization over the breakeven point (459.974490 hours), EC2 Instance Savings Plans are more cost-effective than On-Demand Instances.

- **Savings Plans Cost:**
  - Upfront cost: $0.00
  - 1 instance x 730 hours in a month = 730 EC2 Instance Savings Plans instance hours per month
  - 730 EC2 Instance Savings Plans instance hours per month x $0.098800 = $72.12

- **On-Demand Instances Cost:**
  - 0 On-Demand instance hours per month x $0.156800 = $0.00

- **Total Cost:**
  - $0.00 (On-Demand) + $72.12 (Savings Plans) = $72.12
  - *Note: You will pay an hourly commitment for Savings Plans, and your usage will be accrued at a discounted rate against this commitment.*

### AWS S3
- **Cost:**
  - Negligible as files are deleted after transcoding

### AWS SQS
- **Pricing:**
  - Free for the first 1 million requests
  - $0.40 per million requests for standard queues
  - $0.50 per million requests for FIFO queues

### Cloudflare R2
- **Costs:**
  - Cost per GB/month: $0.015
  - Cost for 1TB/month: $15
  - Cost of Class A Operations (PUT, COPY): First million requests/month free or $4.50 per million requests
  - Cost for 3 million Class A Operations requests: $9
  - Cost of Class B Operations (READ): First 10 million requests/month free or $0.36 per million requests

- **Assumptions:**
  - Each 1-hour video = 400 segments
  - 400 x 1000 = 400,000 segments
  - Each segment is streamed 100 times/month = 400,000 x 100 = 40,000,000 reads

- **Cost Calculation:**
  - Cost for Class B Operations reads: (40,000,000 - 10,000,000) / 1,000,000 x $0.36 = $10.80

- **Total Cost:**
  - $15 (storage) + $9 (Class A Operations) + $10.80 (Class B Operations) = $34.80

### Total Cost So Far
- $72.12 (EC2) + $34.80 (Cloudflare R2) = $106.92

---

### Cheapest Transcoding Service
- **Cost:**
  - Per minute: $0.01500
  - Per 1-hour video: $0.90
  - For 1000 videos: $0.90 x 1000 = $900

### AWS Elastic Transcoder
- **Cost:**
  - Per minute: $0.03
  - Per hour: $0.03 x 60 = $1.80
  - For 1000 videos: $1.80 x 1000 = $1800

*Note: The cost of AWS Elastic Transcoder exceeds the budget by approximately 59 times for just transcoding.*
