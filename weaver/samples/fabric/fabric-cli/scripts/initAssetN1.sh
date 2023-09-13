# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

./bin/fabric-cli env set-file .env
./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assets.json
