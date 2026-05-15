# Managed Kubernetes control plane + two node groups:
#   general -> API, worker, jobs
#   ai      -> Ollama only (tainted so nothing else lands there)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31"

  cluster_name    = var.name
  cluster_version = var.kubernetes_version

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Public endpoint so you can run kubectl from your laptop. Restrict CIDRs in prod.
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = var.api_allowed_cidrs

  # Whoever runs `terraform apply` becomes cluster admin (EKS access entries).
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = {}
    eks-pod-identity-agent = {}
    # Lets Kubernetes create EBS volumes for PersistentVolumeClaims (Ollama models).
    aws-ebs-csi-driver = {
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  eks_managed_node_groups = {
    general = {
      instance_types = var.general_instance_types
      capacity_type  = var.use_spot ? "SPOT" : "ON_DEMAND"
      min_size       = var.general_min_size
      max_size       = var.general_max_size
      desired_size   = var.general_min_size
      labels         = { workload = "general" }
    }

    ai = {
      ami_type       = var.ai_ami_type # AL2023_x86_64_NVIDIA for GPU instances such as g5.xlarge
      instance_types = [var.ai_instance_type]
      min_size       = 1
      max_size       = 1
      desired_size   = 1
      labels         = { workload = "ai" }
      taints = {
        ai = { key = "workload", value = "ai", effect = "NO_SCHEDULE" }
      }
      block_device_mappings = {
        root = {
          device_name = "/dev/xvda"
          ebs         = { volume_size = 50, volume_type = "gp3", encrypted = true }
        }
      }
    }
  }
}
