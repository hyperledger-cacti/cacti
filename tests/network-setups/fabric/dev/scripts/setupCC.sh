directory=$(dirname $0)

ARTIFACTS_PATH=$directory/../../../fabric/shared/artifacts
CHAINCODE_PATH=$directory/../../../fabric/shared/chaincode
ARTIFACTORY_BINARY_REGISTRY=https://na.artifactory.swg-devops.com/artifactory/res-dlt-interop-generic-local

INTEROP_GIT=git@github.ibm.com:dlt-interoperability/fabric-interop-cc.git
INTEROP_BRANCH=fabric_v2

if [ ! -d "${CHAINCODE_PATH}/fabric-interop-cc" ]; then
    echo "INTEROP is not present, cloning from git...."
    (cd $CHAINCODE_PATH && git clone ${INTEROP_GIT} fabric-interop-cc && cd fabric-interop-cc && make protos && cp -R contracts/interop ../interop)
else
    echo "INTEROP is already installed"
    echo "Updating existing copy"
    (cd $CHAINCODE_PATH/fabric-interop-cc/ && git checkout -f master && git fetch && git pull && make protos && rm -rf ../interop && cp -R contracts/interop ../interop)
fi

