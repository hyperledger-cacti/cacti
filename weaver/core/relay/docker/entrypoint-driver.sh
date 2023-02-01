#!/bin/sh

DRIVER_CONFIG_TEMPLATE=${DRIVER_CONFIG_TEMPLATE:-$(pwd)/config/driver.template.toml}

# We need to export this variable because it needs to be visible
# by the dummy driver executable which is required to locate the
# configuration.
#
DRIVER_CONFIG=${DRIVER_CONFIG:-$(pwd)/config/driver.toml}
BINARY="$(pwd)/dummy-driver"

RELAY_PORT=${RELAY_PORT:-9080}
RELAY_NAME=${RELAY_NAME:-Relay}
RELAY_HOST=${RELAY_HOST:-relay-server}

DRIVER_PORT=${DRIVER_PORT:-9081}
DRIVER_NAME=${DRIVER_NAME:-DummyDriver}
NETWORK_NAME=${NETWORK_NAME:-dummy}


source $(pwd)/init.sh

echo "Relay Dummy Driver"
echo "-----------------------------------------"
echo " 1. Running Pre-flight Checks..."
echo "    - Working Directory:         : $(pwd)"
echo "    - DRIVER_CONFIG              : ${DRIVER_CONFIG}"

write_fingerprint
echo ""

echo "  2. Preparing Configuration...." 
if [ ! -f "${DRIVER_CONFIG}" ]; then
  echo "   - Driver Configuration Missing, generating from template: "
  echo "     - checking DRIVER_NAME             :  ${DRIVER_NAME}"
  echo "     - checking DRIVER_PORT             :  ${DRIVER_PORT}"
  echo "     - checking RELAY_NAME              :  ${RELAY_NAME}"
  echo "     - checking RELAY_PORT              :  ${RELAY_PORT}"
  echo "     - checking RELAY_HOST              :  ${RELAY_HOST}"
  echo "     - checking NETWORK_NAME            :  ${NETWORK_NAME}"
  echo "     - checking DRIVER_CONFIG_TEMPLATE  :  ${DRIVER_CONFIG_TEMPLATE}"
  require_file ${DRIVER_CONFIG_TEMPLATE} 1
  echo "     - generating driver configuration ${DRIVER_CONFIG_TEMPLATE} => ${DRIVER_CONFIG}..."
  specialise_file ${DRIVER_CONFIG_TEMPLATE} ${DRIVER_CONFIG}
else
  echo "   - Detected Driver Configuration  ${DRIVER_CONFIG}.."
fi
echo ""
debug "   - Current Configuration"
debug_cat ${DRIVER_CONFIG}


echo " 2. Starting Dummy Driver ...."
echo "    - Executable                 : ${BINARY}"  
echo "    - Runtime Arguments          : $@"
echo""

require_file ${DRIVER_CONFIG} 2
require_file ${BINARY} 3


# Currently the same environment variable is used for
# both the relay server and the driver even though the
# configuration is a different subset.
# 
RELAY_CONFIG=${DRIVER_CONFIG} ${BINARY} $@



