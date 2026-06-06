provider "aws" {
  region = var.region

  # Every resource gets these tags: essential for cost reports and cleanup.
  default_tags {
    tags = {
      Project     = "nestbank"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
