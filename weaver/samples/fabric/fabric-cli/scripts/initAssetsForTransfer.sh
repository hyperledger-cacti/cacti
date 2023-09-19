# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assetsForTransfer.json
./bin/fabric-cli configure asset add --target-network=network1 --type=token --data-file=./src/data/tokensForTransfer.json
