.PHONY: setup-env generate-keys run-gateway clean

# Define common variables
OPENSSL = openssl
KEYS_DIR = src/keys
CONFIG_FILE = gateway-config.json

setup-env:
	@echo "Setting up environment for SATP-Hermes..."

	@# Check if Node.js is installed, if not, install it
	@if ! command -v node >/dev/null 2>&1; then \
		echo "Installing Node.js 18.18.2..."; \
		sudo curl -fsSL https://nodejs.org/dist/v18.18.2/node-v18.18.2-linux-x64.tar.xz | sudo tar -xJ -C /usr/local --strip-components=1; \
	fi

	@if ! command -v yarn >/dev/null 2>&1; then \
		echo "Installing Yarn..."; \
		sudo npm install -g yarn; \
	fi

	@echo "Installing dependencies and compiling the plugin..."
	yarn install
	yarn tsc

	@echo "Initializing databases..."
	yarn db:init

	@echo "Environment setup complete."

generate-keys:
	@echo "Generating new keys..."
	@mkdir -p $(KEYS_DIR)

	@echo "Generating private key..."
	@$(OPENSSL) ecparam -name secp256k1 -genkey -noout -out $(KEYS_DIR)/secp256k1-privkey.pem
	@echo "Private key file generated at $(KEYS_DIR)/secp256k1-privkey.pem"

	@echo "Generating public key..."
	@$(OPENSSL) ec -in $(KEYS_DIR)/secp256k1-privkey.pem -pubout -out $(KEYS_DIR)/secp256k1-pubkey.pem
	@echo "Public key file generated at $(KEYS_DIR)/secp256k1-pubkey.pem"

	@# Extracting private and public key in hex...
	@$(OPENSSL) ec -in $(KEYS_DIR)/secp256k1-privkey.pem -text -noout | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//' > $(KEYS_DIR)/private.hex
	@$(OPENSSL) ec -in $(KEYS_DIR)/secp256k1-pubkey.pem -pubin -text -noout | grep pub -A 5 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^04//' > $(KEYS_DIR)/public.hex

	@echo "Updating gatewayKeyPair in gateway-config.json file..."
	@PRIVATE_KEY=`cat $(KEYS_DIR)/private.hex` && \
	PUBLIC_KEY=`cat $(KEYS_DIR)/public.hex` && \
	sed -i \
		-e '/"gatewayKeyPair": {/,/}/{s/"publicKey": "[^"]*"/"publicKey": "'$$PUBLIC_KEY'"/}' \
		-e '/"gatewayKeyPair": {/,/}/{s/"privateKey": "[^"]*"/"privateKey": "'$$PRIVATE_KEY'"/}' \
		$(CONFIG_FILE)

	@echo "New secp256k1 keys generated and updated in gateway-config.json gatewayKeyPair:"
	@grep -A 2 '"gatewayKeyPair"' $(CONFIG_FILE)

	@# Clean up temporary files
	@rm -f $(KEYS_DIR)/private.hex $(KEYS_DIR)/public.hex

run-gateway: generate-keys setup-env
	@echo "Building SATP Gateway image and running container..."
	docker compose up --build

clean:
	@echo "Cleaning up SATP-Hermes environment..."

	@echo "Rolling back database migrations..."
	yarn db:rollback

	@echo "Removing SQLite database files..."
	find src/knex -name "*.sqlite3" -type f -delete

	@echo "Removing generated keys..."
	rm -rf $(KEYS_DIR)

	@echo "Cleanup complete."