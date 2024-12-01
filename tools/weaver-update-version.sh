#!/bin/bash

# Root of repo
ROOT_DIR=${2:-'..'}

# Repo full go path
REPO='github.com/hyperledger/cacti'

VERSION=${1:-"2.1.0"}

echo "REPO: $REPO"
echo "VERSION: $VERSION"

# Core package verions

## Node - Lerna handles it

## GO and Docker
VERSION_FILES=("weaver/common/protos-go"
"weaver/core/network/fabric-interop-cc/libs/utils"
"weaver/core/network/fabric-interop-cc/libs/assetexchange"
"weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt"
"weaver/core/network/fabric-interop-cc/contracts/interop"
"weaver/sdks/fabric/go-sdk"
"weaver/core/drivers/corda-driver"
"weaver/core/drivers/fabric-driver"
"weaver/core/identity-management/iin-agent"
"weaver/core/relay")

for MODULE in ${VERSION_FILES[@]}; do
  echo "MODULE: $MODULE"
  pushd $ROOT_DIR/$MODULE > /dev/null
  echo -n ${VERSION} > VERSION
  popd > /dev/null
done

## Gradle
GRADLE_FILES=("weaver/common/protos-java-kt"
"weaver/core/drivers/corda-driver"
"weaver/core/network/corda-interop-app"
"weaver/sdks/corda"
)

for MODULE in ${GRADLE_FILES[@]}; do
  echo "MODULE: $MODULE"
  pushd $ROOT_DIR/$MODULE > /dev/null
  sed -i'.scriptbak' "s#version=.*#version=${VERSION}#g" gradle.properties
  rm -rf gradle.properties.scriptbak
  popd > /dev/null
done

## Cargo (Rust)
CARGO_FILES=("weaver/common/protos-rs/pkg"
"weaver/core/relay"
)

for MODULE in ${CARGO_FILES[@]}; do
  echo "MODULE: $MODULE"
  pushd $ROOT_DIR/$MODULE > /dev/null
  sed -i'.scriptbak' "s#^version\ *=.*#version = \"${VERSION}\"#g" Cargo.toml
  rm -rf Cargo.toml.scriptbak
  popd > /dev/null
done

## Update Cargo.lock in relay
pushd $ROOT_DIR/weaver/core/relay > /dev/null
make build-local
popd > /dev/null

# Dependencies

## Node - Lerna handles it

## GO - go-gen-checksum handles it

## Gradle
GRADLE_FILES=("weaver/core/drivers/corda-driver"
"weaver/core/network/corda-interop-app"
"weaver/sdks/corda"
"weaver/samples/corda/corda-simple-application"
"weaver/samples/corda/fungible-house-token"
"weaver/tests/network-setups/corda"
)

for MODULE in ${GRADLE_FILES[@]}; do
  echo "DEP UPDATE MODULE: $MODULE"
  pushd $ROOT_DIR/$MODULE > /dev/null
  sed -i'.scriptbak' "s#cactiVersion=.*#cactiVersion=${VERSION}#g" constants.properties
  rm -rf constants.properties.scriptbak
  popd > /dev/null
done


## Cargo (Rust)
CARGO_FILES=("weaver/core/relay")

for MODULE in ${CARGO_FILES[@]}; do
  echo "DEP UPDATE MODULE: $MODULE"
  pushd $ROOT_DIR/$MODULE > /dev/null
  sed -i'.scriptbak' "s#^cacti_weaver_protos_rs\ *=.*#cacti_weaver_protos_rs = \"${VERSION}\"#g" Cargo.toml
  rm -rf Cargo.toml.scriptbak
  popd > /dev/null
done
