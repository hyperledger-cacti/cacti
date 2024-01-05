#!/usr/bin/env bash

THIS_SCRIPT_DIR="$(dirname "$0")"
WEAVER_DIR="$THIS_SCRIPT_DIR/../weaver"

echo -e "\n######################################"
echo "Remove weaver node_modules..."
echo -e "######################################\n"

echo "Cacti configure process interferes with weaver packages, clean it for fresh start"
find "$WEAVER_DIR" -name node_modules -exec rm -rf {} \;

echo -e "\n######################################"
echo "Environment check"
echo -e "######################################\n"

set -e # Fail on error from now on

echo "Weaver path: $WEAVER_DIR"
go version
rustc --version
java -version
protoc --version
protoc-gen-go --version
protoc-gen-go-grpc --version

echo -e "\n######################################"
echo "Build protos..."
echo -e "######################################\n"

echo "# JS"
pushd "${WEAVER_DIR}/common/protos-js"; make build; popd
echo "# Go"
pushd "${WEAVER_DIR}/common/protos-go"; make build; popd
echo "# Java"
pushd "${WEAVER_DIR}/common/protos-java-kt"; make build; popd
echo "# Solidity"
pushd "${WEAVER_DIR}/common/protos-sol"; make build; popd
echo "# Rust"
pushd "${WEAVER_DIR}/common/protos-rs"; make build; popd

echo -e "\n######################################"
echo "Build relay..."
echo -e "######################################\n"

pushd "${WEAVER_DIR}/core/relay"
make protos-local
make update-pkgs
make
popd

echo -e "\n######################################"
echo "Build fabric components..."
echo -e "######################################\n"

echo "# Node SDK"
pushd "${WEAVER_DIR}/sdks/fabric/interoperation-node-sdk"; make build-local; popd
echo "# Node CLI"
pushd "${WEAVER_DIR}/samples/fabric/fabric-cli"; make build-local; popd
echo "# Go SDK"
pushd "${WEAVER_DIR}/sdks/fabric/go-sdk"; make build-local; popd
echo "# Go CLI"
# TODO - uncomment once the build is fixed
# pushd "${WEAVER_DIR}/samples/fabric/go-cli"; make build-local; popd
echo "# Driver"
pushd "${WEAVER_DIR}/core/drivers/fabric-driver"; make build-local; popd
echo "# IIN Agent"
pushd "${WEAVER_DIR}/core/identity-management/iin-agent"; make build-local; popd

echo -e "\n######################################"
echo "Build corda components..."
echo -e "######################################\n"

echo "# Interop App"
pushd "${WEAVER_DIR}/core/network/corda-interop-app"; make build-local; popd
echo "# SDK"
pushd "${WEAVER_DIR}/sdks/corda"; make build; popd
echo "# Simple Application"
pushd "${WEAVER_DIR}/samples/corda/corda-simple-application"; make build-local; popd
echo "# Driver"
pushd "${WEAVER_DIR}/core/drivers/corda-driver"; make build-local; popd

echo -e "\n######################################"
echo "Build besu components..."
echo -e "######################################\n"

echo "# SDK"
pushd "${WEAVER_DIR}/sdks/besu/node"; make build-local; popd
echo "# CLI"
pushd "${WEAVER_DIR}/samples/besu/besu-cli"; make build-local; popd

echo "Done!"
exit 0;