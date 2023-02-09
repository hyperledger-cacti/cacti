directory=$(dirname $0)

TMP_PATH=$PWD/../shared/tmp
CHAINCODE_PATH=$PWD/../shared/chaincode
rm -rf $CHAINCODE_PATH/interop

# interop cc module
INTEROPCC_MOD=github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop

# custom gopath for convenient downloading
mkdir $TMP_PATH
OLD_GOPATH=$GOPATH
export GOPATH=$TMP_PATH

# Download interopcc and copy it into correct folder
go install "${INTEROPCC_MOD}@latest"
cp -r $TMP_PATH/pkg/mod/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop* $CHAINCODE_PATH/interop
chmod -R +w $CHAINCODE_PATH/interop

# Clean tmp and Undo gopath
go clean -modcache
rm -rf $TMP_PATH
export GOPATH=${OLD_GOPATH}
