module github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk

go 1.15

replace github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-cli => ../go-cli

require (
	github.com/hyperledger/fabric-sdk-go v1.0.0
	github.com/sirupsen/logrus v1.8.1
)
