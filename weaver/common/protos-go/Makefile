CACTI_ROOTDIR = ../../..

.PHONY: build
build:
	sh ../get-fabric-protos.sh $(CACTI_ROOTDIR)/weaver
	#sh update-fabprotos-go-pkg-name.sh $(CACTI_ROOTDIR)/weaver/common
	sh build-protos.sh $(CACTI_ROOTDIR)/weaver/common
	
.PHONY: clean-build
clean-build:
	rm -R `ls -1 -d ./*/`
	
.PHONY: clean
clean:
	rm -rf ../fabric-protos
