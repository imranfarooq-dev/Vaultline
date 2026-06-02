# Amazon MSK: managed Apache Kafka. Brokers live in private subnets and accept
# TLS connections on port 9094 (the app uses KAFKA_SSL=true).
resource "aws_security_group" "msk" {
  name_prefix = "${var.name}-msk-"
  description = "Kafka TLS: only reachable from EKS pods"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Kafka TLS from EKS nodes/pods"
    from_port       = 9094
    to_port         = 9094
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

resource "aws_msk_configuration" "this" {
  name           = "${var.name}-config"
  kafka_versions = [var.kafka_version]

  # min.insync.replicas=1 keeps producing possible while one broker is being patched.
  server_properties = <<-PROPERTIES
    auto.create.topics.enable=true
    default.replication.factor=${min(var.broker_count, 3)}
    min.insync.replicas=1
    num.partitions=3
    log.retention.hours=168
  PROPERTIES
}

resource "aws_cloudwatch_log_group" "broker" {
  name              = "/aws/msk/${var.name}"
  retention_in_days = 7
}

resource "aws_msk_cluster" "this" {
  cluster_name           = var.name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.broker_count # must be a multiple of the number of subnets

  broker_node_group_info {
    instance_type   = var.instance_type
    client_subnets  = slice(var.subnet_ids, 0, var.broker_count)
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.volume_size_gb
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.this.arn
    revision = aws_msk_configuration.this.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  # TLS encryption without client authentication keeps the app configuration simple.
  # Production upgrade: IAM or SASL/SCRAM authentication.
  client_authentication {
    unauthenticated = true
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.broker.name
      }
    }
  }
}
