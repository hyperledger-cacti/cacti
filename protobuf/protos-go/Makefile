.PHONY: build
build:
	sh update-protos-local.sh
	sh build-protos.sh
	
.PHONY: clean-build
clean-build:
	rm -R `ls -1 -d ./*/`
	
.PHONY: clean
clean:
	rm -rf tmp