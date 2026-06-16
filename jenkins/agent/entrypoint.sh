#!/bin/bash
# Runs as root when the agent container starts, then hands over to sshd.
set -euo pipefail

# 1. Allow the "jenkins" user to use the host Docker socket, whatever its group id is
#    (root:root on Docker Desktop, usually a "docker" group on Linux).
if [ -S /var/run/docker.sock ]; then
  SOCKET_GID="$(stat -c %g /var/run/docker.sock)"
  GROUP_NAME="$(getent group "$SOCKET_GID" | cut -d: -f1 || true)"
  if [ -z "$GROUP_NAME" ]; then
    GROUP_NAME=docker-host
    groupadd -g "$SOCKET_GID" "$GROUP_NAME"
  fi
  usermod -aG "$GROUP_NAME" jenkins
  echo "jenkins user added to group $GROUP_NAME (gid $SOCKET_GID) for Docker access"
else
  echo "WARNING: /var/run/docker.sock not mounted - Docker stages will fail" >&2
fi

# 2. Authorise the controller's public key (created by the keygen service).
export JENKINS_AGENT_SSH_PUBKEY="$(cat /run/jenkins-keys/id_rsa.pub)"

# 3. Start sshd using the official image's script.
exec setup-sshd "$@"
