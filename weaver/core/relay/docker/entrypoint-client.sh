#!/bin/sh


if [ "${ENABLE_TLS}" == "true" ]; then
  BINARY="$(pwd)/client-tls"
else
  BINARY="$(pwd)/client"
fi

RELAY_HOST=${RELAY_HOST:-relay-server}
RELAY_PORT=${RELAY_PORT:-9080}
CLIENT_PORT=${CLIENT_PORT:-9082}


source $(pwd)/init.sh

echo "Relay Client"
echo "-----------------------------------------"
echo " 1. Running Pre-flight Checks..."
echo "    - Working Directory:         : $(pwd)"

write_fingerprint
echo ""

echo "2. Preparing Configuration"
echo ""
echo "   - checking CLIENT_PORT        : ${CLIENT_PORT}"
echo "   - checking RELAY_HOST         : ${RELAY_HOST}"
echo "   - checking RELAY_PORT         : ${RELAY_PORT}"
echo ""  


echo " 3. Starting Client ...."
echo "    - Executable Path            : ${BINARY}"  
echo "    - Additional Arguments       : $@"
echo""

require_file ${BINARY} 1

${BINARY} --port ${CLIENT_PORT} --address ${RELAY_HOST}:${RELAY_PORT} $@



