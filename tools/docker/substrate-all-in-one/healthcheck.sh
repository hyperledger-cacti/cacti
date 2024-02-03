#!/usr/bin/env sh

# Fail on first wrong command
set -e

# health check command
(echo '{"id":1,"jsonrpc":"2.0","method":"system_health","params":[]}' | websocat -n1  ws://127.0.0.1:9944) > /dev/null;

 echo $?
