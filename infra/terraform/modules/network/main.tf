# A VPC spread over 3 Availability Zones:
#   public subnets   -> internet-facing load balancers, NAT gateway
#   private subnets  -> EKS nodes, RDS, MSK (no direct internet access)
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}
