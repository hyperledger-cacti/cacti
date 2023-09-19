# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

# Network1
./bin/fabric-cli user add --target-network=network1 --id=alice --secret=alicepw
./bin/fabric-cli user add --target-network=network1 --id=bob --secret=bobpw

# Network2
./bin/fabric-cli user add --target-network=network2 --id=alice --secret=alicepw
./bin/fabric-cli user add --target-network=network2 --id=bob --secret=bobpw
