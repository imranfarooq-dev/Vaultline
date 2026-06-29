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

## 2. How Jenkins is put together

```
 jenkins/docker-compose.yml
 ├── keygen          one-shot: creates an SSH key pair in a shared volume
 ├── jenkins         CONTROLLER: web UI, scheduling, plugins, credentials
 │                   0 executors, no Docker access
 └── jenkins-agent   BUILD AGENT (SSH): node 22, docker CLI + compose, terraform,
                     kubectl, kubeconform, aws cli. Uses the host Docker engine.
```

**Why a separate agent?** Builds run arbitrary code from the repository. Keeping them off the controller protects its credentials and configuration, which is standard practice in enterprise Jenkins. It also avoids the classic *"Docker agent can't see the workspace"* problem you hit when a containerised controller launches build containers itself.

**Configuration as Code.** Nothing is clicked together in the UI. `casc.yaml` defines:
- the admin user, and the rule that the controller never builds,
- the `docker-agent` node, its SSH launcher and build environment variables,
- credentials: the agent SSH key (read from the generated file) and `aws-nestbank`,
- the `nestbank` pipeline job (through Job DSL), pointing at `Jenkinsfile`.

Delete everything with `make jenkins-clean`, start again, and you get the identical server.

## 3. The pipeline

```
Prepare ─▶ Quality gates ─────────▶ Unit & contract ─▶ Integration & e2e ─▶ Build image ─▶ Security scan ─▶ Smoke test
           ├ TypeScript             JUnit + coverage     Testcontainers                     Trivy            ephemeral stack:
           ├ Kubernetes manifests   (gate: lines ≥ 35%)  (pgvector, Kafka)                                    Postgres+Kafka+API+worker
           └ Terraform validate
                                             ── only when DEPLOY_ENV = dev | prod ──
                          Terraform plan ─▶ Approval (prod) ─▶ Terraform apply ─▶ Deploy to EKS + remote smoke test
```

| Stage | What it proves | Output in Jenkins |
|---|---|---|
| Prepare | Tool versions; `npm ci` from the lockfile | build name `#12 a1b2c3d4` |
| Quality gates | Code compiles; K8s YAML is valid for 1.31; Terraform is formatted and valid. Runs **in parallel** | parallel branches in stage view |
| Unit & contract | 185 fast tests, event contracts | **Test Result** trend, **Coverage** trend, HTML report |
| Integration & e2e | Row locks, pgvector search, Kafka → worker, full HTTP journeys on real containers | test results |
| Build image | Multi-stage runtime image tagged with the git SHA, OCI labels | image `nestbank/banking-api:<sha>` |
| Security scan | HIGH/CRITICAL fixable CVEs (Trivy). Set `FAIL_ON_CRITICAL_CVES` to block the build | `reports/trivy.txt` |
| Smoke test | The image **that will ship** boots, migrates, serves all 23 patterns, and the worker really consumes from Kafka | `reports/smoke-stack.log` |
| Terraform plan | What would change on AWS | `reports/terraform-plan-<env>.txt` |
| Approval | A human confirms prod (`input` step, 30-minute timeout) | "Deploy to prod" button |
| Terraform apply → Deploy | Applies the *reviewed* plan file, runs `infra/scripts/deploy-aws.sh`, smoke tests the live URL | live URL in the log |

**Build parameters**

| Parameter | Default | Use |
|---|---|---|
| `RUN_CONTAINER_TESTS` | true | untick for a quick 3-minute loop |
| `RUN_SMOKE_TEST` | true | |
| `FAIL_ON_CRITICAL_CVES` | false | turn into a hard security gate |
| `DEPLOY_ENV` | none | `dev` or `prod` runs Terraform and deploys |

**Result colours.** Green: everything passed. Yellow (**UNSTABLE**): tests passed but the coverage gate was not met. Red: a stage failed.

## 4. Deploying to AWS from Jenkins

1. Complete the one-time steps in [AWS.md](AWS.md): the state bucket, and the bucket name in `infra/terraform/live/environments/*.backend.hcl`. Commit.
2. Put credentials in `jenkins/.env`:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```
3. `make jenkins-up` again (configuration as code reloads the credential).
4. Build with `DEPLOY_ENV=dev`. For `prod`, the pipeline pauses at **Approval**.

> ⚠️ `DEPLOY_ENV=dev|prod` creates billable AWS resources. Tear down with `make aws-destroy ENV=dev`.

For real teams, replace long-lived access keys with an IAM role (Jenkins on EC2/EKS with an instance profile or IRSA), and store secrets in a vault.
