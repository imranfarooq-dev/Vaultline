# NestBank - common commands. Run `make` to list them.
ENV ?= dev
STATE_BUCKET ?= nestbank-tfstate-CHANGE_ME
.DEFAULT_GOAL := help
.PHONY: jenkins-up jenkins-logs jenkins-down jenkins-clean help up down clean logs logs-ai smoke load-test test-docker install test test-all k8s-deploy k8s-status k8s-forward k8s-delete tf-bootstrap tf-init tf-plan tf-apply aws-deploy aws-destroy

help: ## Show all commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ---------- Docker Compose (local platform) ----------
up: ## Start Postgres, Kafka, Ollama, API and worker
	docker compose up -d --build
	@echo "API http://localhost:3000/api | Swagger http://localhost:3000/docs | Kafka UI http://localhost:8080"
	@echo "First start downloads ~1.6GB of models: make logs-ai"
down: ## Stop containers (keep data)
	docker compose down
clean: ## Stop and delete all data and models
	docker compose down -v --remove-orphans
logs: ## Follow API and worker logs
	docker compose logs -f api worker
logs-ai: ## Follow model download
	docker compose logs -f ollama-pull
smoke: ## Walk through all 23 patterns against the running stack
	docker compose run --rm smoke
load-test: ## k6 load test
	docker compose --profile loadtest run --rm k6
test-docker: ## Run unit, contract, integration and e2e tests inside Docker
	docker compose --profile test run --rm --build tests

# ---------- Node on the host ----------
install: ## Install dependencies
	npm ci
test: ## Fast tests (no Docker)
	npm run test:unit
	npm run test:contract
test-all: ## Every suite incl. Testcontainers (needs Docker)
	npm run test:all

# ---------- Local Kubernetes ----------
k8s-deploy: ## Build image and deploy to the current kube context
	docker build --target runtime -t nestbank/banking-api:local .
	kubectl -n banking delete job banking-migrate --ignore-not-found 2>/dev/null || true
	kubectl apply -k k8s/overlays/local
	kubectl -n banking wait --for=condition=complete job/banking-migrate --timeout=5m
	kubectl -n banking rollout status deploy/banking-api --timeout=5m
k8s-status: ## Show what is running
	kubectl -n banking get pods,svc,jobs,pvc,hpa
k8s-forward: ## Expose the API on localhost:3000
	kubectl -n banking port-forward svc/banking-api 3000:80
k8s-delete: ## Remove everything from the cluster
	kubectl delete namespace banking

# ---------- Jenkins (CI/CD) ----------
jenkins-up: ## Start Jenkins controller + build agent on http://localhost:8090
	docker compose -f jenkins/docker-compose.yml up -d --build
	@echo "Jenkins: http://localhost:8090 (admin / see jenkins/.env, default admin)"
	@echo "The pipeline checks out this folder: commit your changes first (git add -A && git commit)"
jenkins-logs: ## Follow Jenkins controller and agent logs
	docker compose -f jenkins/docker-compose.yml logs -f jenkins jenkins-agent
jenkins-down: ## Stop Jenkins (keep jobs and build history)
	docker compose -f jenkins/docker-compose.yml down
