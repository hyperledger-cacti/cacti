build:
	npm install

build-local:
	(cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install) || \
		(mv package-remote.json package.json && exit 1)	# Runs if failure
	mv package-remote.json package.json					# Runs if success

clean:
	rm -rf node_modules package-lock.json
	rm -rf build || true

