# Deploying to AWS with Terraform

> ⚠️ **This creates paid resources.** A dev environment (EKS, NAT gateway, 3 EC2 nodes, MSK, RDS, NLB) costs very roughly **$12–15 per day** in `eu-west-1`, most of it for the EKS control plane, the Ollama node and MSK. Check the [AWS Pricing Calculator](https://calculator.aws/) for your region, and run `make aws-destroy` when you are done.

## What gets created

```
infra/terraform/
  bootstrap/            S3 bucket for Terraform state (run once, local state)
  modules/
    network/            VPC, 3 AZs, public + private subnets, NAT gateway
    eks/                EKS 1.31, "general" + "ai" node groups, EBS CSI driver (IRSA)
    rds/                PostgreSQL 16 (pgvector), TLS enforced, password in Secrets Manager
    msk/                Kafka 3.6, TLS, CloudWatch broker logs
    ecr/                image registry with vulnerability scanning
  live/                 composes the modules; one state file per environment
    environments/dev.tfvars   prod.tfvars   *.backend.hcl
```

```
                    ┌──────────────────────────── VPC 10.40.0.0/16 ────────────────────────────┐
 Internet ─▶ NLB ───┼─▶ public subnets (NAT) ─▶ private subnets                                │
                    │                             EKS nodes: api, worker │ ai node: ollama     │
                    │                             RDS PostgreSQL :5432  ◀── node security group │
                    │                             MSK brokers    :9094  ◀── node security group │
                    └───────────────────────────────────────────────────────────────────────────┘
  ECR (images)    S3 (Terraform state)    Secrets Manager (DB password)    CloudWatch (MSK logs)
```

Databases accept traffic **only** from the EKS node security group, never from the internet.

## Prerequisites

- Terraform ≥ 1.10, AWS CLI v2, kubectl, Docker, jq
- AWS credentials with admin-level rights for the sandbox account: `aws sts get-caller-identity`
