#!/usr/bin/env bash
# =============================================================================
# Tear everything down so AWS stops billing you.
#
# ORDER MATTERS: Kubernetes created a load balancer and EBS volumes that
# Terraform does not know about. They must be deleted first, otherwise
# `terraform destroy` hangs because the VPC still has network interfaces in use.
# =============================================================================
set -euo pipefail
ENVIRONMENT="${1:-dev}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$ROOT/infra/terraform/live"

read -r -p "Destroy the '$ENVIRONMENT' environment and ALL its data? Type the environment name to confirm: " answer
[ "$answer" = "$ENVIRONMENT" ] || { echo "Aborted."; exit 1; }

if REGION="$(terraform -chdir="$TF_DIR" output -raw region 2>/dev/null)"; then
  CLUSTER="$(terraform -chdir="$TF_DIR" output -raw cluster_name)"
  aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER" || true
  echo "Deleting Kubernetes namespace (load balancer + volumes)..."
  kubectl delete namespace banking --ignore-not-found --wait=true --timeout=10m || true
  echo "Giving AWS time to release the load balancer's network interfaces..."
  sleep 60
fi

terraform -chdir="$TF_DIR" destroy -var-file="environments/$ENVIRONMENT.tfvars"
