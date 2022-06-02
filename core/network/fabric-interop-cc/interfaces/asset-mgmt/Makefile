run-vendor:
	go mod vendor
	cp -r ../../../../../common/protos-go/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/
	cp -r ../../libs/testutils/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/

test:
	go test asset_locks_contract.go asset_locks_contract_test.go asset_locks.go -v
test-all:
	go test -v .
	
test-local: run-vendor test-all
