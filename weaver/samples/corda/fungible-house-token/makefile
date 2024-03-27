source:
	git clone https://github.com/corda/samples-kotlin.git
	cd samples-kotlin && git checkout cc/dev/ent/4.12
	mv samples-kotlin/Tokens/fungiblehousetoken source
	#mv samples-kotlin/Tokens/constants.properties .
	rm -rf samples-kotlin

.PHONY: build
build: source
	cp extension-flows/*.kt source/workflows/src/main/kotlin/net/corda/samples/tokenizedhouse/flows/
	cp extension-states/*.kt source/contracts/src/main/kotlin/net/corda/samples/tokenizedhouse/states/
	cp build.gradle source/build.gradle
	cd source && ./gradlew wrapper --gradle-version 7.6.1 --distribution-type all && ./gradlew clean jar

.PHONY: clean
clean:
	rm -rf source
	rm -rf samples-kotlin
