output "region" {
  value = var.region
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "rds_address" {
  value = module.rds.address
}

output "rds_secret_arn" {
  value = module.rds.secret_arn
}

output "msk_bootstrap_brokers_tls" {
  value = module.msk.bootstrap_brokers_tls
}

# Consumed by infra/scripts/deploy-aws.sh -> k8s/overlays/aws/app.env
output "k8s_app_env" {
  value = <<-ENV
    DB_HOST=${module.rds.address}
    DB_SSL=true
    KAFKA_BROKERS=${module.msk.bootstrap_brokers_tls}
    KAFKA_SSL=true
    KAFKA_REPLICATION_FACTOR=${module.msk.replication_factor}
  ENV
}
