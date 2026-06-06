output "region" {
  value = var.region
}

output "cluster_name" {
  value = module.eks.cluster_name
}
