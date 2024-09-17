WORKSPACE ?= $(shell realpath `pwd`/../../../../../)


build-corda-copm-server-deps:
	# also need to build the fabric interop helper as it is used in the copm impl
	rm -Rf $(WORKSPACE)/weaver/sdks/fabric/interoperation-node-sdk/build
	cd $(WORKSPACE)/weaver/sdks/fabric/interoperation-node-sdk && make build-local
	cd $(WORKSPACE)/weaver/common/protos-java-kt && make build
	cd $(WORKSPACE)/weaver/core/network/corda-interop-app && make build-local
	cd $(WORKSPACE)/weaver/sdks/corda && make build
	cd $(WORKSPACE)/weaver/samples/corda/corda-simple-application && make build-local
	cd $(WORKSPACE)/packages/cacti-copm-core/src/main/protos-kt && ./gradlew build 
	mkdir -p localdeps && \
	cp $(WORKSPACE)/packages/cacti-copm-core/src/main/protos-kt/build/libs/copm-corda-*jar localdeps && \
	cp $(WORKSPACE)/weaver/common/protos-java-kt/build/libs/protos-java-kt-*.jar localdeps && \
	cp $(WORKSPACE)/weaver/sdks/corda/build/libs/weaver-sdk-corda-*.jar localdeps && \
	cp $(WORKSPACE)/weaver/core/network/corda-interop-app/interop-workflows/build/libs/interop-workflows-*.jar localdeps && \
	cp $(WORKSPACE)/weaver/core/network/corda-interop-app/interop-contracts/build/libs/interop-contracts-*.jar localdeps && \
	cp $(WORKSPACE)/weaver/samples/corda/corda-simple-application/contracts-kotlin/build/libs/contracts-kotlin-*.jar localdeps && \
	cp $(WORKSPACE)/weaver/samples/corda/corda-simple-application/workflows-kotlin/build/libs/workflows-kotlin-*.jar localdeps

build-image-local: build-corda-copm-server-deps
	cd $(WORKSPACE)/packages/cacti-plugin-copm-corda && DOCKER_BUILDKIT=1 docker build . -f src/test/kotlin/Dockerfile --tag copm-corda
