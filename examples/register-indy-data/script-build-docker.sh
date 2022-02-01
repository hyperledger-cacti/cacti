# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "# Build base image for this tool - indy-sdk-cli"
pushd ../../tools/docker/indy-sdk-cli/
docker build . -t indy-sdk-cli
popd

echo "# Build req_discounted_cartrade tool"
docker build . -t req_discounted_cartrade
