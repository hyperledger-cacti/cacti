source:
	git clone https://github.com/corda/samples-kotlin.git
	mv samples-kotlin/Tokens/fungiblehousetoken source
	mv samples-kotlin/Tokens/constants.properties .
	rm -rf samples-kotlin

.PHONY: build
build: source
	cp extension-flows/*.kt source/workflows/src/main/kotlin/net/corda/samples/tokenizedhouse/flows/
	cd source && ./gradlew clean jar

.PHONY: clean
clean:
	rm -rf source	
