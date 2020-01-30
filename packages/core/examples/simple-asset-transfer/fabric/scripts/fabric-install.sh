#!/usr/bin/env bash

# Pre-requesits install

sudo apt-get update

sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo apt-key fingerprint 0EBFCD88

# We'll install the last LTS version of docker
export release="xenial"

sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $release \
   stable"

sudo apt-get update

sudo apt-get install -y docker-ce docker-compose
# Add the user to the docker group to be able to use the docker command without
# "sudo"
sudo usermod -aG docker $USER

# You need to verify that the installed version is greater than 1.8 not included
sudo apt  install -y golang-go
export GOPATH=$HOME/go
echo "export GOPATH=\$HOME/go" >> ~/.bashrc
if [ ! -d "$GOPATH" ]; then
  # Create the $GOPATH directory
  mkdir -p $GOPATH/bin
fi
echo "export PATH=\$PATH:\$GOPATH/bin" >> ~/.bashrc

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt-get install -y yarn

sudo apt-get install -y python
python --version

# Download Fabric binaries and install them
curl -sSL https://goo.gl/6wtTN5 | bash -s 1.2.0

# Install gulp
sudo npm install -g gulp

# Install needed tools from the fabric repo, not installed from binnaries
git clone https://github.com/hyperledger/fabric.git fab && cd fab
make cryptogen configtxgen

if [ ! -d "$GOPATH/bin" ]; then
  # Create the $GOPATH directory
  mkdir -p $GOPATH/bin
fi
# $GOPATH/bin is already in the $PATH
cp .build/bin/* $GOPATH/bin
cd ../
rm -fr fab/
rm -fr fabric-samples/

sudo apt-install -y jq