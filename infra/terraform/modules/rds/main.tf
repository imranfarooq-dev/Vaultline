# Managed PostgreSQL 16. RDS supports the pgvector extension ("vector"),
# so the same migration that runs locally enables vector search here.
resource "random_password" "master" {
  length  = 32
  special = true
  # RDS forbids / @ " and spaces in master passwords.
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

# Stored in Secrets Manager; the deploy script copies it into a Kubernetes Secret.
# Upgrade path: External Secrets Operator to sync it automatically.
resource "aws_secretsmanager_secret" "db" {
  name_prefix             = "${var.name}-db-"
  recovery_window_in_days = var.deletion_protection ? 30 : 0
}
