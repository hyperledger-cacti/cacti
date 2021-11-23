# Copyright 2019-2020 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0
docker-compose -f docker-init.yml down
docker-compose down 
sudo rm -r ./data-geth1/geth
docker network rm geth1net
