module github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop

go 1.16

replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange => ./assetexchange

require (
	github.com/golang/protobuf v1.5.2
	github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go v1.2.1
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange v0.0.0-00010101000000-000000000000
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20210718160520-38d29fabecb9
	github.com/hyperledger/fabric-contract-api-go v1.1.1
	github.com/hyperledger/fabric-protos-go v0.0.0-20210720123151-f0dc3e2a0871
	github.com/sirupsen/logrus v1.8.1
	github.com/stretchr/testify v1.5.1
	golang.org/x/crypto v0.0.0-20210711020723-a769d52b0f97
	google.golang.org/protobuf v1.27.1
)
