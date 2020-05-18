#!/usr/bin/env bash -x

# Remove existing software that we want specific version.
sudo apt purge nodejs openjdk-\*

sudo apt update
sudo apt install -y \
     apt-transport-https \
     build-essential \
     ca-certificates \
     curl \
     openjdk-8-jdk-headless \
     python-minimal \
     software-properties-common \

# Instal docker.
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instal docker-compose 1.24.1...
curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /tmp/docker-compose
chmod +x /tmp/docker-compose
sudo mv /tmp/docker-compose /usr/local/bin/docker-compose

# Instal Nodejs 8...
curl -L https://deb.nodesource.com/setup_8.x -o get-node8.sh
sudo bash get-node8.sh
sudo apt-get install -y nodejs
