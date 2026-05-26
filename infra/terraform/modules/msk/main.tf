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
