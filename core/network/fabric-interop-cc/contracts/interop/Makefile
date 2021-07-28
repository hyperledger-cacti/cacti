assetexchange:
	cp -r ../../libs/assetexchange .
test-manage-assets: assetexchange
	go test manage_assets.go manage_assets_test.go main.go setup_test.go -v
clean:
	rm -rf assetexchange
