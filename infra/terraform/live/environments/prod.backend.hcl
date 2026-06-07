bucket       = "nestbank-tfstate-REPLACE_WITH_ACCOUNT_ID"
key          = "nestbank/prod/terraform.tfstate"
region       = "eu-west-1"
encrypt      = true
use_lockfile = true # S3-native lock file: no DynamoDB table needed
