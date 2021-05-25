mocks:
	cp -r ../../contracts/interop/mocks .
test:
	go test asset_locks_contract.go asset_locks_contract_test.go setup_test.go asset_locks.go -v
clean:
	rm -rf mocks
