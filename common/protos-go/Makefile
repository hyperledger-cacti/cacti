.PHONY: build
build:
	sh ../get-fabric-protos.sh ../..
	sh build-protos.sh
	
.PHONY: clean-build
clean-build:
	rm -R `ls -1 -d ./*/`
	
.PHONY: clean
clean:
	rm -rf ../fabric-protos