.PHONY: mocks
mocks:
	cp -r ../../contracts/interop/mocks/* ./mocks/
test: mocks
	go test asset_locks_contract.go asset_locks_contract_test.go setup_test.go asset_locks.go -v
test-all: mocks
	go test -v .
clean:
	rm mocks/*
