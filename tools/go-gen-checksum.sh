#!/bin/bash

# Root of repo
ROOT_DIR=${2:-'..'}

# Repo full go path
REPO='github.com/hyperledger-cacti/cacti'

# install go-checksum
echo "Installing go-checksum..."
go install github.com/vikyd/go-checksum@latest
echo "Installed."

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

VERSION=${1:-"2.1.0"}

echo "REPO: $REPO"
echo "VERSION: $VERSION"

MAJOR_VER=""
if [ "${VERSION:0:1}" -gt "1" ]; then
  MAJOR_VER="/v${VERSION:0:1}"
fi

for GOMODULE in ${GOMODULE_PATHS[@]}; do
  echo "############# START $GOMODULE ################"
  pushd $ROOT_DIR/$GOMODULE > /dev/null
  GOMODULE_PATH=$GOMODULE
  if [ -f VERSION ]; then
    GOMODULE_PATH=$GOMODULE$MAJOR_VER
  fi
  make run-vendor > /dev/null
  GOMOD_DEPS=$((go mod graph | grep "$REPO/$GOMODULE_PATH $REPO" | cut -d ' ' -f 2) || (make undo-vendor && echo "ERROR: In generating dependency graph" && exit 1))
  make undo-vendor > /dev/null
  popd > /dev/null

  for GOMOD_DEP in ${GOMOD_DEPS[@]}; do
    echo "--------- START DEP -----------"
    GOMOD_DEP_VERSION=$(echo $GOMOD_DEP | awk -F "@" '{print $2}')
    GOMOD_DEP_MAJOR_VERSION=""
    if [ "${GOMOD_DEP_VERSION:1:1}" -gt "1" ]; then
      GOMOD_DEP_MAJOR_VERSION="/${GOMOD_DEP_VERSION:0:2}"
    fi
    GOMOD_PATH=$(echo $GOMOD_DEP | awk -F "$GOMOD_DEP_MAJOR_VERSION@" '{print $1}' | awk -F "$REPO/" '{print $2}')
    echo DEP: $GOMOD_DEP
    echo DEP: $GOMOD_PATH
    cp $ROOT_DIR/LICENSE $ROOT_DIR/$GOMOD_PATH
    pushd $ROOT_DIR/$GOMOD_PATH > /dev/null
    GOMOD_NAME="$REPO/$GOMOD_PATH$MAJOR_VER"
    if [ ! -f VERSION ]; then
      echo "INFO: VERSION absent"
      popd > /dev/null
      echo "------------ END --------------"
      continue
    fi

    (cat VERSION | grep "$VERSION") || echo $VERSION > VERSION
    GOMOD_VERSION=v$(cat VERSION)
    GOMOD_SUM=$(go-checksum . $GOMOD_NAME@$GOMOD_VERSION | grep "GoCheckSum" | cut -d ' ' -f 2 | cut -d '"' -f 2)
    GOMOD_DOTMOD_SUM=$(go-checksum go.mod | grep "GoCheckSum" | cut -d ' ' -f 2 | cut -d '"' -f 2)
    GOMOD_SUM_ENTRY="$GOMOD_NAME $GOMOD_VERSION $GOMOD_SUM"
    GOMOD_DOTMOD_SUM_ENTRY="$GOMOD_NAME $GOMOD_VERSION/go.mod $GOMOD_DOTMOD_SUM"
    echo GOSUM: $GOMOD_SUM_ENTRY
    echo GOSUM: $GOMOD_DOTMOD_SUM_ENTRY
    popd > /dev/null
    rm $ROOT_DIR/$GOMOD_PATH/LICENSE
    
    pushd $ROOT_DIR/$GOMODULE > /dev/null
    UPDATE="false"
    (cat go.mod | grep -q "$GOMOD_NAME $GOMOD_VERSION") || UPDATE="true"
    if [ "$UPDATE" = "true" ]; then
      go mod edit -require $GOMOD_NAME@$GOMOD_VERSION
    else
      echo "ERROR: Version $GOMOD_VERSION already there in go.mod, skipping $GOMOD_PATH in $GOMODULE"
    fi
    UPDATE="false"
    (cat go.sum | grep -q "$GOMOD_SUM_ENTRY") || UPDATE="true"
    (cat go.sum | grep -q "$GOMOD_DOTMOD_SUM_ENTRY") || UPDATE="true"
    if [ "$UPDATE" = "true" ]; then
      # mv go.sum go.sum.old
      # grep -v "$GOMOD_NAME $GOMOD_VERSION" go.sum.old > go.sum
      echo $GOMOD_SUM_ENTRY >> go.sum
      echo $GOMOD_DOTMOD_SUM_ENTRY >> go.sum
    else
      echo "ERROR: Version $GOMOD_VERSION already there in go.sum, skipping $GOMOD_PATH in $GOMODULE"
    fi
    popd > /dev/null
    echo "------------ END --------------"
  done
  echo "############# END $GOMODULE ################\n"
done
