#!/bin/bash

# Root of repo
ROOT_DIR=${1:-'..'}

GOMODULE_PATHS=("weaver/core/network/fabric-interop-cc/libs/utils"
"weaver/core/network/fabric-interop-cc/libs/assetexchange"
"weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt"
"weaver/core/network/fabric-interop-cc/contracts/interop"
"weaver/sdks/fabric/go-sdk"
"weaver/samples/fabric/go-cli"
"weaver/samples/fabric/simpleasset"
"weaver/samples/fabric/satpsimpleasset"
"weaver/samples/fabric/simpleassetandinterop"
"weaver/samples/fabric/simpleassettransfer"
"weaver/samples/fabric/simplestatewithacl"
"weaver/samples/fabric/simplestate")

for GOMODULE in ${GOMODULE_PATHS[@]}; do
  echo "############# START $GOMODULE ################"
  pushd $ROOT_DIR/$GOMODULE > /dev/null
  make run-vendor || (go mod tidy && make run-vendor)   # Run once for local build
  make undo-vendor
  go mod tidy                                           # Run once for normal build
  popd > /dev/null
  echo "############# END $GOMODULE ################\n"
done