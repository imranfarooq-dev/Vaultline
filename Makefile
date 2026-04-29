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
