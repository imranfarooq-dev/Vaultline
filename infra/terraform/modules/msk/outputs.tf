output "bootstrap_brokers_tls" {
  value = aws_msk_cluster.this.bootstrap_brokers_tls
}

output "replication_factor" {
  value = min(var.broker_count, 3)
}
