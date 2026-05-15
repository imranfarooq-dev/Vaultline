# A VPC spread over 3 Availability Zones:
#   public subnets   -> internet-facing load balancers, NAT gateway
#   private subnets  -> EKS nodes, RDS, MSK (no direct internet access)
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.16"

  name = var.name
  cidr = var.cidr
  azs  = local.azs

  # /20 per subnet carved out of the /16: plenty of IPs for pods (VPC CNI gives each pod a VPC IP).
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.cidr, 4, i)]
  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.cidr, 4, i + 8)]

  enable_nat_gateway = true
  single_nat_gateway = var.single_nat_gateway # one NAT saves ~$65/month in dev; use one per AZ in prod

  # Tags that tell Kubernetes where it may create load balancers.
  public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
}
