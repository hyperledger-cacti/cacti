run-vendor:
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go=../../../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils=../../libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils

test:
	go test asset_locks_contract.go asset_locks_contract_test.go asset_locks.go -v
test-all:
	go test -v .

test-local: run-vendor test-all undo-vendor
