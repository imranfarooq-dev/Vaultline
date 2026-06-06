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
