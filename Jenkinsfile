// =============================================================================
// NestBank CI/CD pipeline (Jenkins declarative syntax)
//
//   Prepare ─▶ Quality gates ─▶ Unit & contract ─▶ Integration & e2e ─▶ Build image
//              (parallel:            │ JUnit +          │ Testcontainers      │
//               typecheck,           │ coverage         │ Postgres + Kafka    ▼
//               k8s, terraform)                                        Security scan (Trivy)
//                                                                            │
//        ┌─── only when DEPLOY_ENV = dev | prod ─────────────────────────────┤
//        ▼                                                                   ▼
//   Terraform plan ─▶ Approval (prod only) ─▶ Terraform apply ─▶ Deploy to EKS ─▶ Verify
//                                                                      Smoke test (ephemeral stack)
//
// A declarative pipeline is itself a TEMPLATE METHOD: Jenkins owns the skeleton
// (agent, stages, post), and you fill in the steps.
// =============================================================================
pipeline {
  agent { label 'docker' }   // the SSH agent defined in jenkins/controller/casc.yaml

  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 90, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
    disableConcurrentBuilds(abortPrevious: true)
  }

  parameters {
    booleanParam(name: 'RUN_CONTAINER_TESTS', defaultValue: true,
      description: 'Integration + e2e tests with Testcontainers (real Postgres/pgvector/Kafka). ~3-5 min.')
    booleanParam(name: 'RUN_SMOKE_TEST', defaultValue: true,
      description: 'Start the freshly built image with Postgres + Kafka and walk through all 23 patterns.')
    booleanParam(name: 'FAIL_ON_CRITICAL_CVES', defaultValue: false,
      description: 'Fail the build if Trivy finds fixable CRITICAL vulnerabilities in the image.')
    choice(name: 'DEPLOY_ENV', choices: ['none', 'dev', 'prod'],
      description: 'none = CI only. dev/prod = Terraform + deploy to AWS EKS (needs the aws-nestbank credential).')
  }

  environment {
    IMAGE_NAME            = 'nestbank/banking-api'
    COMPOSE_CI            = 'jenkins/docker-compose.ci.yml'
    TF_DIR                = 'infra/terraform/live'
    TF_IN_AUTOMATION      = 'true'
    NPM_CONFIG_UPDATE_NOTIFIER = 'false'
  }

  stages {

    stage('Prepare') {
      steps {
        script {
          env.IMAGE_TAG     = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
          env.IMAGE         = "${env.IMAGE_NAME}:${env.IMAGE_TAG}"
          env.CI_PROJECT    = "nestbank-ci-${env.BUILD_NUMBER}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.IMAGE_TAG}"
          currentBuild.description = "deploy: ${params.DEPLOY_ENV}"
        }
        sh '''
          echo "Toolchain on $(hostname):"
          node --version; npm --version
          docker version --format 'docker client {{.Client.Version}} / engine {{.Server.Version}}'
          terraform version | head -1
          kubectl version --client | head -1
          mkdir -p reports/junit
          npm ci --no-audit --no-fund
        '''
      }
    }

    stage('Quality gates') {
      parallel {
        stage('TypeScript') {
          steps {
            sh 'npm run lint && npx tsc --noEmit -p tsconfig.test.json'
          }
        }
        stage('Kubernetes manifests') {
          steps {
            sh '''
              cp k8s/overlays/aws/app.env.example k8s/overlays/aws/app.env
              for overlay in local aws; do
                echo "--- $overlay"
                kubectl kustomize "k8s/overlays/$overlay" | kubeconform -strict -summary -kubernetes-version 1.31.0
              done
            '''
          }
        }
        stage('Terraform') {
          steps {
            sh '''
              terraform fmt -check -recursive infra/terraform
              for root in bootstrap live; do
                terraform -chdir="infra/terraform/$root" init -backend=false -input=false >/dev/null
                terraform -chdir="infra/terraform/$root" validate
              done
            '''
          }
        }
      }
    }

    stage('Unit & contract tests') {
      environment { JEST_JUNIT_OUTPUT_NAME = 'unit-contract.xml' }
      steps {
        sh 'npm run test:ci:fast'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit/unit-contract.xml'
          recordCoverage(
            tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']],
            sourceCodeRetention: 'LAST_BUILD',
            // A ratchet: raise it as tests are added. Controllers/DB code are covered by e2e instead.
            qualityGates: [[metric: 'LINE', threshold: 35.0, baseline: 'PROJECT', criticality: 'UNSTABLE']]
          )
          publishHTML(target: [reportName: 'Coverage report', reportDir: 'coverage', reportFiles: 'index.html',
                               keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        }
      }
    }

    stage('Integration & e2e tests') {
      when { expression { params.RUN_CONTAINER_TESTS } }
      environment { JEST_JUNIT_OUTPUT_NAME = 'integration-e2e.xml' }
      steps {
        // Testcontainers starts pgvector + Kafka containers on the host Docker engine.
        sh 'npm run test:ci:containers'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit/integration-e2e.xml'
          sh 'docker ps -aq --filter "label=org.testcontainers=true" | xargs -r docker rm -f >/dev/null 2>&1 || true'
        }
      }
    }

    stage('Build image') {
      steps {
        sh '''
          docker build --target runtime \
            --label org.opencontainers.image.revision="$(git rev-parse HEAD)" \
            --label org.opencontainers.image.created="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --label jenkins.build="$BUILD_URL" \
            -t "$IMAGE" -t "$IMAGE_NAME:ci-latest" .
          docker image inspect "$IMAGE" --format 'Built {{.RepoTags}} size={{.Size}} bytes'
        '''
      }
    }

    stage('Security scan') {
      steps {
        sh '''
          EXIT_CODE=0
          [ "$FAIL_ON_CRITICAL_CVES" = "true" ] && EXIT_CODE=1
          set +e
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v nestbank-trivy-cache:/root/.cache \
            aquasec/trivy:0.56.2 image --scanners vuln --ignore-unfixed \
              --severity HIGH,CRITICAL --exit-code "$EXIT_CODE" --no-progress "$IMAGE" > reports/trivy.txt 2>&1
          STATUS=$?
          set -e
          cat reports/trivy.txt
          exit $STATUS
        '''
      }
    }

    stage('Smoke test') {
      when { expression { params.RUN_SMOKE_TEST } }
      steps {
        sh 'docker compose -p "$CI_PROJECT" -f "$COMPOSE_CI" run --rm smoke'
        // Prove the async path too: the Kafka worker must have written notifications.
        sh '''
          for i in $(seq 1 20); do
            COUNT=$(docker compose -p "$CI_PROJECT" -f "$COMPOSE_CI" exec -T postgres \
              psql -U bank -d bank -tAc "SELECT COUNT(*) FROM notifications" | tr -d '[:space:]')
            [ "${COUNT:-0}" -gt 0 ] && { echo "Worker consumed $COUNT events from Kafka"; exit 0; }
            sleep 3
          done
          echo "No notifications were written by the Kafka worker" >&2
          exit 1
        '''
      }
      post {
        always {
          sh '''
            docker compose -p "$CI_PROJECT" -f "$COMPOSE_CI" logs --no-color api worker > reports/smoke-stack.log 2>&1 || true
            docker compose -p "$CI_PROJECT" -f "$COMPOSE_CI" down -v --remove-orphans || true
          '''
        }
      }
    }

    // ------------------------------------------------------------------ delivery
    stage('Terraform plan') {
      when { expression { params.DEPLOY_ENV != 'none' } }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-nestbank']]) {
          sh '''
            terraform -chdir="$TF_DIR" init -input=false -reconfigure -backend-config="environments/$DEPLOY_ENV.backend.hcl"
            terraform -chdir="$TF_DIR" plan -input=false -var-file="environments/$DEPLOY_ENV.tfvars" -out="$DEPLOY_ENV.tfplan"
            terraform -chdir="$TF_DIR" show -no-color "$DEPLOY_ENV.tfplan" > "reports/terraform-plan-$DEPLOY_ENV.txt"
          '''
        }
      }
    }

    stage('Approval') {
      when { expression { params.DEPLOY_ENV == 'prod' } }
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          input message: "Apply the Terraform plan and deploy ${env.IMAGE} to PROD?",
                ok: 'Deploy to prod'
        }
      }
    }

    stage('Terraform apply') {
      when { expression { params.DEPLOY_ENV != 'none' } }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-nestbank']]) {
          sh 'terraform -chdir="$TF_DIR" apply -input=false "$DEPLOY_ENV.tfplan"'
        }
      }
    }

    stage('Deploy to EKS') {
      when { expression { params.DEPLOY_ENV != 'none' } }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-nestbank']]) {
          // Same script you run by hand: push to ECR, render manifests, migrate, roll out.
          sh './infra/scripts/deploy-aws.sh'
          sh '''
            HOST=$(kubectl -n banking get svc banking-api -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
            echo "Waiting for http://$HOST to answer (NLB DNS can take a few minutes)..."
            for i in $(seq 1 40); do
              curl -sf "http://$HOST/api/health/ready" >/dev/null && break
              sleep 15
            done
            BASE_URL="http://$HOST" node scripts/smoke-test.mjs
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true, fingerprint: true
    }
    success {
      echo "✅ ${env.IMAGE} passed every stage${params.DEPLOY_ENV != 'none' ? " and is live on ${params.DEPLOY_ENV}" : ''}"
    }
    unstable {
      echo '⚠️ Tests passed but a quality gate (coverage) was not met.'
    }
    failure {
      echo '❌ Pipeline failed. Open the failing stage in the stage view; test reports and logs are under Artifacts.'
    }
    cleanup {
      // Remove the per-build CI image tag (keeps ci-latest for layer caching).
      sh 'docker image rm "$IMAGE" >/dev/null 2>&1 || true'
    }
  }
}
