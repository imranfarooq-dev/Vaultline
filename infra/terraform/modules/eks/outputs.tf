output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "node_security_group_id" {
  description = "Pods use the node security group, so data stores allow traffic from it."
  value       = module.eks.node_security_group_id
}
