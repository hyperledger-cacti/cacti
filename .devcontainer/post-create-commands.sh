#!/usr/bin/env bash

set -e

whoami

NEW_PATH_ELEMENT="~/bin/"
echo "export PATH=\"$NEW_PATH_ELEMENT\":\${PATH}" >> ~/.bashrc

docker info

npm run install-yarn
npm run configure
