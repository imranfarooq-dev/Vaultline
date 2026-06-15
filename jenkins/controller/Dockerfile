# Jenkins controller: UI + scheduling only. Builds run on the agent.
FROM jenkins/jenkins:lts-jdk17

# Plugins are baked into the image, so every start is identical (no clicking in the UI).
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Configuration as Code: users, agent, credentials and the pipeline job.
COPY casc.yaml /var/jenkins_config/casc.yaml

USER root
# The repository is mounted from the host with a different owner; let git accept it.
RUN git config --system --add safe.directory '*'
USER jenkins

ENV CASC_JENKINS_CONFIG=/var/jenkins_config/casc.yaml \
    JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true"
