# =============================================================================
# Jenkins SSH build agent with every tool the pipeline needs, pinned.
# Every build gets exactly the same toolchain as every other build.
# =============================================================================
FROM node:22-bookworm-slim AS node

FROM jenkins/ssh-agent:jdk17
ARG TARGETARCH
ARG TERRAFORM_VERSION=1.10.5
ARG KUBECTL_VERSION=v1.31.4
ARG KUBECONFORM_VERSION=v0.6.7

USER root

# ---- Node.js 22 copied from the official image (no extra apt repository needed)
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# ---- OS packages + Docker CLI and Compose plugin (talks to the host engine via the socket)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg git jq unzip make procps \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin docker-buildx-plugin \
 && rm -rf /var/lib/apt/lists/*

# ---- Terraform, kubectl, kubeconform, AWS CLI v2
RUN ARCH="${TARGETARCH:-amd64}" \
 && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${ARCH}.zip" -o /tmp/tf.zip \
 && unzip -q /tmp/tf.zip -d /usr/local/bin terraform \
 && curl -fsSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl" -o /usr/local/bin/kubectl \
 && chmod +x /usr/local/bin/kubectl \
 && curl -fsSL "https://github.com/yannh/kubeconform/releases/download/${KUBECONFORM_VERSION}/kubeconform-linux-${ARCH}.tar.gz" | tar xz -C /usr/local/bin kubeconform \
 && AWS_ARCH=$([ "$ARCH" = "arm64" ] && echo aarch64 || echo x86_64) \
 && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o /tmp/aws.zip \
 && unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install \
 && rm -rf /tmp/tf.zip /tmp/aws.zip /tmp/aws

# Workspaces are bind/volume mounted and may have another owner.
RUN git config --system --add safe.directory '*' \
 && mkdir -p /home/jenkins/agent /home/jenkins/.npm \
 && chown -R jenkins:jenkins /home/jenkins/agent /home/jenkins/.npm

COPY entrypoint.sh /usr/local/bin/nestbank-agent-entrypoint
RUN chmod +x /usr/local/bin/nestbank-agent-entrypoint
ENTRYPOINT ["/usr/local/bin/nestbank-agent-entrypoint"]
