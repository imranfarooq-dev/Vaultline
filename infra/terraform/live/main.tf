# =============================================================================
# NestBank on AWS
#
#   Internet -> NLB -> EKS (api, worker, ollama) -> RDS PostgreSQL + pgvector
#                                                -> MSK Kafka (TLS)
#   Images come from ECR. State lives in S3.
#
# Modules are composed here; each module hides one AWS concern (FACADE, again).
# =============================================================================
locals {
  name = "nestbank-${var.environment}"
}

module "network" {
  source             = "../modules/network"
  name               = local.name
  cidr               = var.vpc_cidr
  single_nat_gateway = var.environment != "prod"
}

module "ecr" {
  source       = "../modules/ecr"
  name         = "nestbank/banking-api"
  force_delete = var.environment != "prod"
}
