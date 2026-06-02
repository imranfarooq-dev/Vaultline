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

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.username
    password = random_password.master.result
    dbname   = var.database_name
  })
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}
