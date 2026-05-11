# =============================================================================
# STEP 0 (run once per AWS account): the S3 bucket that stores Terraform state.
#
# Why a separate stack? The state bucket must exist BEFORE any stack can use it
# as a backend, so it cannot manage itself. This tiny stack keeps local state.
#
#   terraform -chdir=infra/terraform/bootstrap init
#   terraform -chdir=infra/terraform/bootstrap apply -var="bucket_name=nestbank-tfstate-<your-account-id>"
# =============================================================================
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.95" }
  }
}

variable "region" {
  type    = string
  default = "eu-west-1"
}
