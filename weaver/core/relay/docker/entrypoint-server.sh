#!/bin/sh

RELAY_DNS_CONFIG=${RELAY_DNS_CONFIG:-$(pwd)/config/relays}
RELAY_CONFIG_TEMPLATE=${RELAY_CONFIG_TEMPLATE:-$(pwd)/config/server.template.toml}

# This is needed by the server binary and therefore we
# we need to export it so that it is available to the
# running process $BINARY
#
export RELAY_CONFIG=${RELAY_CONFIG}

RELAY_PORT=${RELAY_PORT}
RELAY_NAME=${RELAY_NAME}

BINARY="$(pwd)/server"

source $(pwd)/init.sh


echo "Relay Server"
echo "-----------------------------------------"
echo " 1. Running Pre-flight Checks..."
echo "    - Working Directory:         : $(pwd)"
echo "    - RELAY_CONFIG               : ${RELAY_CONFIG}"
echo ""

echo " 2. Checking Build Fingerprint..."
write_fingerprint
echo ""

echo " 3. Preparing configuration...."
if [ ! -f "${RELAY_CONFIG}" ]; then
  echo "    - Relay Configuration Missing, generating from template..."
  echo "      - checking RELAY_NAME             : ${RELAY_NAME}"
  echo "      - checking RELAY_PORT             : ${RELAY_PORT}"
  echo "      - checking DRIVER_NAME            : ${DRIVER_NAME}"
  echo "      - checking DRIVER_HOST            : ${DRIVER_HOST}"
  echo "      - checking DRIVER_PORT            : ${DRIVER_PORT}"
  echo "      - checking NETWORK_NAME           : ${NETWORK_NAME}"
  echo "      - checking RELAY_CONFIG_TEMPLATE  : ${RELAY_CONFIG_TEMPLATE}"
  require_file ${RELAY_CONFIG_TEMPLATE} 1
  echo "      - generating relay configuration ${RELAY_CONFIG_TEMPLATE} => ${RELAY_CONFIG}..."
  specialise_file ${RELAY_CONFIG_TEMPLATE} ${RELAY_CONFIG}
  if [ -d "${RELAY_DNS_CONFIG}" ]; then 
    echo "      - found RELAY_DNS_CONFIG        : ${RELAY_DNS_CONFIG}"
    for DNS_CONFIG in $(ls ${RELAY_DNS_CONFIG}/*.toml); do
      echo "        - cat ${DNS_CONFIG} >> ${RELAY_CONFIG}..."
      cat ${DNS_CONFIG} >> ${RELAY_CONFIG}
    done
  else
    echo "     - no RELAY_DNS_CONFIG (${RELAY_DNS_CONFIG}) skipping remote relays injection."
  fi
else
  echo "    - Detected Relay Configuration  ${RELAY_CONFIG}.."
fi
echo ""
debug "   - Current Configuration"
debug_cat ${RELAY_CONFIG}

echo " 4. Starting Server ...."
echo "    - Executable Path            : ${BINARY}"  
echo "    - Runtime Arguments          : $@"
echo ""

require_file ${RELAY_CONFIG} 2
require_file ${BINARY} 3

${BINARY} $@




