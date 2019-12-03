#!/bin/bash

# Start the API wrapping methods to interact with fabric
if [ ! -d "../logs" ]; then
  # Create the logs directory
  mkdir ../logs
fi

# Kill old SDK server
fuser -k -n tcp 4000

path_to_log_file="../logs/start.log"

timestamp=$( date +%T )
echo " [Logs after : $timestamp]" >>$path_to_log_file
./runApp.sh 2>&1 | tee $path_to_log_file

echo -n "Starting the SDK server ... "
cd ../api
PORT=4000 node app >>$path_to_log_file 2>&1 &
cd -
sleep 10
while ! lsof -i :4000 -sTCP:LISTEN -t; do
    echo "(waiting for the server)"
    sleep 3
done

echo "Initializing the network ..."
node init-network.js
