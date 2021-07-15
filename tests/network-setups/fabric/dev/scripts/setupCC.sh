directory=$(dirname $0)

TMP_PATH=$PWD/../shared/tmp
CHAINCODE_PATH=$PWD/../shared/chaincode

# interop cc module
INTEROPCC_MOD=github.com/sanvenDev/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop
INTEROP_VERSION=

# custom gopath for convenient downloading
mkdir $TMP_PATH
OLD_GOPATH=$GOPATH
export GOPATH=$TMP_PATH

# Download interopcc and copy it into correct folder
go get -d "${INTEROPCC_MOD}${INTEROP_VERSION}"
cp -r $TMP_PATH/pkg/mod/github.com/sanven\!dev/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop* $CHAINCODE_PATH/interop

# Clean tmp and Undo gopath
go clean -modcache
rm -rf $TMP_PATH
export GOPATH=${OLD_GOPATH}