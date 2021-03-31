#!/bin/sh

BINARY=${1:-server}

case $BINARY in
  server | driver | client)
    shift
    ./entrypoint-$BINARY.sh $@
    EXIT_CODE=$?
    ;;
  *)
    echo "binary target: $BINARY is invalid (use: server | driver | client)"
    EXIT_CODE=1
    ;;
esac

exit $EXIT_CODE

