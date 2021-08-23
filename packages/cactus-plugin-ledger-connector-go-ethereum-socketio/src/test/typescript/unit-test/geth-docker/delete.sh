# Copyright 2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
docker-compose -f docker-init.yml down
docker-compose down 
sudo rm -r ./data*
docker network rm ec1net
docker network rm ec2net
