# Copyright 2020-2022 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

echo "# Clean Indy sandbox"
find ./sandbox/ ! -name .gitkeep ! -name sandbox -exec rm -fr {} \;
echo "# OK"