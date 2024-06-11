#!/bin/bash

ROOT_DIR=${1:-'..'}

pushd $ROOT_DIR
files=$(find ./fabric-protos -name *.proto)

for filename in $files
do
  sed -i'.scriptbak' -e ' s#^option go_package = "github.com/hyperledger/fabric-protos-go/#option go_package = "github.com/hyperledger/fabric-protos-go-apiv2/#' "$filename"
  rm -rf $filename.scriptbak
  cat $filename | grep "option go_package"
done
popd $ROOT_DIR