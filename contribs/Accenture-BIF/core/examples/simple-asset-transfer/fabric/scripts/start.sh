#!/usr/bin/env bash

# Start the API wrapping methods to interact with fabric
if [ ! -d "../logs" ]; then
  # Create the logs directory
  mkdir ../logs
fi

# Kill old SDK server
pid=$(lsof -i tcp:4000 -t);  [ -z "$pid" ] || kill -TERM $pid || kill -KILL $pid

path_to_log_file="../logs/start.log"

timestamp=$( date +%T )
echo " [Logs after : $timestamp]" >>$path_to_log_file
./runApp.sh 2>&1 | tee $path_to_log_file

echo -n "Starting the SDK server ... "
cd ../api
HOST=0.0.0.0 PORT=4000 node app >>$path_to_log_file 2>&1 &
cd -
sleep 10
while ! lsof -i :4000 -sTCP:LISTEN -t; do
    echo "(waiting for the server)"
    sleep 3
done

echo "Initializing the network ..."
node init-network.js
