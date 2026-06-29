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

## Step by step

### 1. State bucket (once per account)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
make tf-bootstrap STATE_BUCKET=nestbank-tfstate-$ACCOUNT_ID
```

Put the same bucket name into `infra/terraform/live/environments/dev.backend.hcl`.

### 2. Plan and apply the infrastructure

```bash
make tf-plan ENV=dev      # read the plan: ~90 resources
make tf-apply ENV=dev     # ~20-25 minutes (EKS and MSK are slow to create)
```

Useful afterwards:

```bash
terraform -chdir=infra/terraform/live output
terraform -chdir=infra/terraform/live output -raw configure_kubectl
```

### 3. Deploy the application

```bash
make aws-deploy
```

`infra/scripts/deploy-aws.sh` then:
1. reads Terraform outputs,
2. connects kubectl to EKS,
3. builds a `linux/amd64` image and pushes it to ECR,
4. writes `k8s/overlays/aws/app.env` with the RDS and MSK endpoints,
5. copies the DB credentials from Secrets Manager into the `banking-secrets` Kubernetes Secret,
6. applies `k8s/overlays/aws` with the new image tag,
7. waits for the migration Job and the rollouts, then prints the load-balancer URL.

### 4. Try it

```bash
HOST=$(kubectl -n banking get svc banking-api -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$HOST/api/patterns
BASE_URL=http://$HOST node scripts/smoke-test.mjs
kubectl -n banking logs -f job/ollama-pull-models     # model download
kubectl -n banking logs -f deploy/banking-worker      # events from MSK
```

For autoscaling (HPA), install metrics-server once:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 5. Destroy

```bash
make aws-destroy ENV=dev
```

The script deletes the Kubernetes namespace **first**. The NLB and EBS volumes were created by Kubernetes, not Terraform; if they still exist, `terraform destroy` hangs on the VPC.

## dev vs prod

| Setting | dev | prod |
|---|---|---|
| NAT gateways | 1 | 1 per AZ |
| General nodes | 2 × t3.large, spot | 3–8 × m6i.large, on-demand |
| Ollama node | m6i.xlarge (CPU) | g5.xlarge (GPU, NVIDIA AMI) |
| RDS | db.t4g.micro, single AZ | db.m7g.large, Multi-AZ, deletion protection, final snapshot |
| MSK | 2 × kafka.t3.small | 3 × kafka.m7g.large |
| Kubernetes API access | anywhere | your CIDR only |

For a GPU node you also need the NVIDIA device plugin, plus a `nvidia.com/gpu: 1` resource limit on the Ollama container.

## Hardening checklist (next steps for a real bank)

- **Secrets:** External Secrets Operator syncing from Secrets Manager, with rotation.
- **Kafka auth:** IAM or SASL/SCRAM instead of unauthenticated TLS.
- **Traffic:** AWS Load Balancer Controller + ALB Ingress with an ACM certificate (HTTPS) and AWS WAF.
- **Kubernetes API:** private endpoint, reached through a VPN or bastion.
- **TLS verification:** bundle the RDS CA certificate instead of `rejectUnauthorized: false`.
- **Pipeline:** GitHub Actions with OIDC federation to AWS, running `terraform plan` on PRs and deploying on merge.
- **Observability:** Container Insights / Prometheus + Grafana, OpenTelemetry tracing across API → Kafka → worker.
- **Data:** the transactional outbox (see ARCHITECTURE.md) and RDS Performance Insights.
