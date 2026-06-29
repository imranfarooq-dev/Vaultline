# CI/CD with Jenkins

The repository ships **two** pipelines that do the same job, so you can compare them:

| | Jenkins (`Jenkinsfile`) | GitHub Actions (`.github/workflows/ci.yml`) |
|---|---|---|
| Runs where | Your own server (here: Docker on your laptop) | GitHub's cloud runners |
| Configured by | `Jenkinsfile` + Configuration as Code (`jenkins/controller/casc.yaml`) | YAML workflow |
| Deploys | Yes: Terraform plan → approval → apply → EKS | CI only |
| Typical in | Banks, regulated and on-premise enterprises | Open source, cloud-native teams |
