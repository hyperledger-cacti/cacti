module github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop

go 1.16

replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange => ./assetexchange

require (
	github.com/golang/protobuf v1.5.2
	github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go v1.2.1
	github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange v0.0.0-00010101000000-000000000000 // indirect
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20200728190242-9b3ae92d8664
	github.com/hyperledger/fabric-contract-api-go v1.1.1
	github.com/hyperledger/fabric-protos-go v0.0.0-20210720123151-f0dc3e2a0871
	github.com/sirupsen/logrus v1.8.1
	github.com/stretchr/testify v1.6.1
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9
	google.golang.org/protobuf v1.27.1
	gopkg.in/yaml.v3 v3.0.0-20200615113413-eeeca48fe776 // indirect
)
