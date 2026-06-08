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

module "eks" {
  source                 = "../modules/eks"
  name                   = local.name
  kubernetes_version     = var.kubernetes_version
  vpc_id                 = module.network.vpc_id
  private_subnet_ids     = module.network.private_subnet_ids
  api_allowed_cidrs      = var.eks_api_allowed_cidrs
  general_instance_types = var.general_instance_types
  general_min_size       = var.general_min_size
  general_max_size       = var.general_max_size
  use_spot               = var.use_spot
  ai_instance_type       = var.ai_instance_type
  ai_ami_type            = var.ai_ami_type
}
