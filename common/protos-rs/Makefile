.PHONY: build
build:
	cp -r ../protos .
	cargo build

.PHONY: clean
clean:
	rm -rf src/generated/* target protos

.PHONY: publish
publish:
	cargo publish

.PHONY: dry-run-publish
dry-run-publish:
	cargo publish --dry-run