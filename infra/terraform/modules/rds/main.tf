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

resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  description = "PostgreSQL: only reachable from EKS pods"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes/pods"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
