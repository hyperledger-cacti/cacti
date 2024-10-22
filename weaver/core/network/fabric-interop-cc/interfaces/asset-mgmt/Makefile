run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2=../../../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils=../../libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils

test:
	go test asset_locks_contract.go asset_locks_contract_test.go asset_locks.go -v
test-all:
	go test -v .

test-local: run-vendor test-all undo-vendor
