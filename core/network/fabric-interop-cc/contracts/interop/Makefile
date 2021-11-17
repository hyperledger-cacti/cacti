assetexchange:
	cp -r ../../libs/assetexchange .
test-manage-assets: assetexchange
	go test manage_assets.go manage_assets_test.go main.go setup_test.go -v
clean:
	rm -rf assetexchange
build-local:
	mv go.mod go.mod.rm
	mv go.sum go.sum.rm
	cp go.mod.local go.mod
	cp -r ../../libs .
	cp -r ../../../../../common/protos-go .
	(go mod tidy && go build -v .) || true
	mv go.mod.rm go.mod
	mv go.sum.rm go.sum
