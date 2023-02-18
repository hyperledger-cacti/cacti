run-vendor:
	go mod edit -replace github.com/hyperledger/cacti/weaver/common/protos-go=../../../../../common/protos-go/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger/cacti/weaver/common/protos-go

clean:
	rm -rf vendor