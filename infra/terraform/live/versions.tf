terraform {
  required_version = ">= 1.10" # 1.10+ supports native S3 state locking (use_lockfile)

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.95" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # Values come from environments/<env>.backend.hcl:
  #   terraform init -backend-config=environments/dev.backend.hcl
  backend "s3" {}
}
