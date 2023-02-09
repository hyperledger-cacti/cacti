.PHONY: build
build:
	cargo build

.PHONY: clean
clean:
	rm -rf pkg/src/generated/* pkg/target target

.PHONY: publish
publish:
	cd pkg && cargo publish

.PHONY: dry-run-publish
dry-run-publish:
	cd pkg && cargo publish --dry-run --allow-dirty