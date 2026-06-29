# CI/CD with Jenkins

The repository ships **two** pipelines that do the same job, so you can compare them:

| | Jenkins (`Jenkinsfile`) | GitHub Actions (`.github/workflows/ci.yml`) |
|---|---|---|
| Runs where | Your own server (here: Docker on your laptop) | GitHub's cloud runners |
| Configured by | `Jenkinsfile` + Configuration as Code (`jenkins/controller/casc.yaml`) | YAML workflow |
| Deploys | Yes: Terraform plan → approval → apply → EKS | CI only |
| Typical in | Banks, regulated and on-premise enterprises | Open source, cloud-native teams |

## 1. Start Jenkins

```bash
make jenkins-up                      # docker compose -f jenkins/docker-compose.yml up -d --build
open http://localhost:8090           # admin / admin (set JENKINS_ADMIN_PASSWORD in jenkins/.env)
```

The first build of the images takes a few minutes (plugins, Terraform, kubectl, AWS CLI).

The job checks out **this folder** through git, so it needs to be a git repository with a commit:

```bash
git init -b main && git add -A && git commit -m "NestBank"
```

Commit again whenever you want Jenkins to see a change. To build from GitHub instead, set `NESTBANK_REPO_URL` in `jenkins/.env` and run `make jenkins-up` again.

Then open **nestbank → Build with Parameters → Build**.

> The very first run uses default parameters. Jenkins only learns about the `parameters { }` block after reading the Jenkinsfile once, which is a normal Jenkins behaviour.
