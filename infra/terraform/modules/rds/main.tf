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

resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name}-pg16-"
  family      = "postgres16"

  parameter {
    name  = "rds.force_ssl" # reject unencrypted connections (app uses DB_SSL=true)
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement" # log queries slower than 500 ms
    value = "500"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version

  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 5 # storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  publicly_accessible    = false

  multi_az                   = var.multi_az # standby replica in a second AZ for automatic failover
  backup_retention_period    = var.backup_retention_days
  auto_minor_version_upgrade = true
  apply_immediately          = !var.deletion_protection
  deletion_protection        = var.deletion_protection
  skip_final_snapshot        = !var.deletion_protection
  final_snapshot_identifier  = var.deletion_protection ? "${var.name}-final" : null
  copy_tags_to_snapshot      = true
}
