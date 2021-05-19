module github.com/hyperledger-labs/weaver/samples/simpleasset

go 1.15

replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt => ./asset-mgmt

require (
	github.com/golang/protobuf v1.5.2
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt v0.0.0-00010101000000-000000000000
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20210319203922-6b661064d4d9
	github.com/hyperledger/fabric-contract-api-go v1.1.1
	github.com/hyperledger/fabric-protos-go v0.0.0-20210505131505-0ac7fd605762
	github.com/sirupsen/logrus v1.8.1
	github.com/stretchr/testify v1.7.0
	google.golang.org/protobuf v1.26.0
)
