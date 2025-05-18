# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

directory=$(dirname $0)

CACTI_VERSION=v2.0.0
TMP_PATH=$PWD/../shared/tmp
CHAINCODE_PATH=$PWD/../shared/chaincode
rm -rf $CHAINCODE_PATH/interop

# interop cc module
INTEROPCC_MOD=github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/contracts/interop/${CACTI_VERSION%%"."*}

# custom gopath for convenient downloading
mkdir $TMP_PATH
OLD_GOPATH=$GOPATH
export GOPATH=$TMP_PATH

# Download interopcc and copy it into correct folder
go install "${INTEROPCC_MOD}@latest"
cp -r $TMP_PATH/pkg/mod/$INTEROPCC_MOD@$CACTI_VERSION $CHAINCODE_PATH/interop
chmod -R +w $CHAINCODE_PATH/interop

# Clean tmp and Undo gopath
go clean -modcache
rm -rf $TMP_PATH
export GOPATH=${OLD_GOPATH}
