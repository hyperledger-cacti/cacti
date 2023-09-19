# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

# Network1
./bin/fabric-cli user add --target-network=network1 --id=demo
./bin/fabric-cli configure asset add --target-network=network1 --type=bond --data-file=./src/data/assets.json 

# Network2
./bin/fabric-cli user add --target-network=network2 --id=demo
./bin/fabric-cli configure asset add --target-network=network2 --type=token --data-file=./src/data/tokens.json
