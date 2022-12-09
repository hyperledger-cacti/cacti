module github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simpleassettransfer

go 1.15

require (
	github.com/golang/protobuf v1.5.2
	github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go v1.5.3
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt v1.5.3
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils v0.0.0-20211117075003-d4cef34c8832
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils v1.3.1
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20210718160520-38d29fabecb9
	github.com/hyperledger/fabric-contract-api-go v1.1.1
	github.com/hyperledger/fabric-protos-go v0.0.0-20210720123151-f0dc3e2a0871
	github.com/sirupsen/logrus v1.8.1
	github.com/stretchr/testify v1.7.0
)
