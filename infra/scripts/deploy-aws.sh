#!/usr/bin/env bash
# =============================================================================
# Build -> push to ECR -> deploy to EKS, using the outputs of `terraform apply`.
#
#   ./infra/scripts/deploy-aws.sh            # image tag = git sha (or timestamp)
#   IMAGE_TAG=v1.2.0 ./infra/scripts/deploy-aws.sh
#
# Needs: terraform, aws CLI (logged in), docker, kubectl, jq
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$ROOT/infra/terraform/live"
OVERLAY="$ROOT/k8s/overlays/aws"
tf() { terraform -chdir="$TF_DIR" "$@"; }
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

for tool in terraform aws docker kubectl jq; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool"; exit 1; }
done

step "Reading Terraform outputs"
REGION="$(tf output -raw region)"
CLUSTER="$(tf output -raw cluster_name)"
ECR_URL="$(tf output -raw ecr_repository_url)"
SECRET_ARN="$(tf output -raw rds_secret_arn)"
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
echo "region=$REGION cluster=$CLUSTER image=$ECR_URL:$TAG"

step "Connecting kubectl to EKS"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

step "Building and pushing the image (linux/amd64, EKS nodes are x86)"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ECR_URL%%/*}"
docker build --platform linux/amd64 --target runtime -t "$ECR_URL:$TAG" "$ROOT"
docker push "$ECR_URL:$TAG"

step "Writing app configuration (RDS + MSK endpoints)"
tf output -raw k8s_app_env > "$OVERLAY/app.env"
cat "$OVERLAY/app.env"

step "Creating the database Secret from AWS Secrets Manager"
kubectl create namespace banking --dry-run=client -o yaml | kubectl apply -f -
CREDS="$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$SECRET_ARN" --query SecretString --output text)"
kubectl -n banking create secret generic banking-secrets \
  --from-literal=DB_USER="$(jq -r .username <<<"$CREDS")" \
  --from-literal=DB_PASSWORD="$(jq -r .password <<<"$CREDS")" \
  --dry-run=client -o yaml | kubectl apply -f -

step "Rendering manifests with the pushed image"
GENERATED="$OVERLAY/.generated"
mkdir -p "$GENERATED"
cat > "$GENERATED/kustomization.yaml" <<YAML
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [..]
images:
  - name: ECR_REPOSITORY_URL
    newName: $ECR_URL
    newTag: "$TAG"
YAML

step "Applying (migrations run first as a Job)"
kubectl -n banking delete job banking-migrate --ignore-not-found   # Jobs are immutable
kubectl apply -k "$GENERATED"
kubectl -n banking wait --for=condition=complete job/banking-migrate --timeout=10m
kubectl -n banking rollout status deployment/banking-api --timeout=10m
kubectl -n banking rollout status deployment/banking-worker --timeout=10m

step "Waiting for the load balancer address"
for _ in $(seq 1 60); do
  HOST="$(kubectl -n banking get svc banking-api -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
  [ -n "$HOST" ] && break
  sleep 5
done

cat <<DONE

Deployed $ECR_URL:$TAG

  API      http://${HOST:-<pending>}/api/patterns
  Swagger  http://${HOST:-<pending>}/docs
  Smoke    BASE_URL=http://${HOST:-<pending>} node scripts/smoke-test.mjs

The NLB DNS name can take 2-3 minutes to resolve. The Ollama model download
continues in the background:  kubectl -n banking logs -f job/ollama-pull-models
DONE
