cd ../../

## Start cartrade app
echo "[process] Start the routing interface and the cartrade app"
cd ./examples/cartrade
npm run init-cartrade # for making a symbolic link for node_modules. This command only needs to be run once.
npm run start