# NestBank - common commands. Run `make` to list them.
ENV ?= dev
STATE_BUCKET ?= nestbank-tfstate-CHANGE_ME
.DEFAULT_GOAL := help
.PHONY: jenkins-up jenkins-logs jenkins-down jenkins-clean help up down clean logs logs-ai smoke load-test test-docker install test test-all k8s-deploy k8s-status k8s-forward k8s-delete tf-bootstrap tf-init tf-plan tf-apply aws-deploy aws-destroy

help: ## Show all commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
