#!/bin/bash
set -u
set -e

function usage() {
  echo ""
  echo "Usage:"
  echo "    $0 [tessera | constellation] [--tesseraOptions \"options for Tessera start script\"]"
  echo ""
  echo "Where:"
  echo "    tessera | constellation (default = constellation): specifies which privacy implementation to use"
  echo "    --tesseraOptions: allows additional options as documented in tessera-start.sh usage which is shown below:"
  echo ""
  ./tessera-start.sh --help
  exit -1
}

privacyImpl=constellation
tesseraOptions=
while (( "$#" )); do
    case "$1" in
        tessera)
            privacyImpl=tessera
            shift
            ;;
        constellation)
            privacyImpl=constellation
            shift
            ;;
        --tesseraOptions)
            tesseraOptions=$2
            shift 2
            ;;
        --help)
            shift
            usage
            ;;
        *)
            echo "Error: Unsupported command line paramter $1"
            usage
            ;;
    esac
done

NETWORK_ID=$(cat genesis.json | grep chainId | awk -F " " '{print $2}' | awk -F "," '{print $1}')

if [ $NETWORK_ID -eq 1 ]
then
    echo "  Quorum should not be run with a chainId of 1 (Ethereum mainnet)"
    echo "  please set the chainId in the genensis.json to another value "
    echo "  1337 is the recommend ChainId for Geth private clients."
fi

mkdir -p qdata/logs

if [ "$privacyImpl" == "tessera" ]; then
  echo "[*] Starting Tessera nodes"
  ./tessera-start.sh ${tesseraOptions}
elif [ "$privacyImpl" == "constellation" ]; then
  echo "[*] Starting Constellation nodes"
  ./constellation-start.sh
else
  echo "Unsupported privacy implementation: ${privacyImpl}"
  usage
fi

echo "[*] Starting Ethereum nodes with ChainID and NetworkId of $NETWORK_ID"
set -v
ARGS="--nodiscover --networkid $NETWORK_ID --syncmode full --mine --minerthreads 1 --rpc --rpcaddr 0.0.0.0 --rpcapi admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum"
PRIVATE_CONFIG=qdata/c1/tm.ipc nohup geth --datadir qdata/dd1 $ARGS --rpcport 22000 --port 21000 --unlock 0 --password passwords.txt 2>>qdata/logs/1.log &
PRIVATE_CONFIG=qdata/c2/tm.ipc nohup geth --datadir qdata/dd2 $ARGS --rpcport 22001 --port 21001 --unlock 0 --password passwords.txt 2>>qdata/logs/2.log &
PRIVATE_CONFIG=qdata/c3/tm.ipc nohup geth --datadir qdata/dd3 $ARGS --rpcport 22002 --port 21002 --unlock 0 --password passwords.txt 2>>qdata/logs/3.log &
PRIVATE_CONFIG=qdata/c4/tm.ipc nohup geth --datadir qdata/dd4 $ARGS --rpcport 22003 --port 21003 --unlock 0 --password passwords.txt 2>>qdata/logs/4.log &
PRIVATE_CONFIG=qdata/c5/tm.ipc nohup geth --datadir qdata/dd5 $ARGS --rpcport 22004 --port 21004 --unlock 0 --password passwords.txt 2>>qdata/logs/5.log &
PRIVATE_CONFIG=qdata/c6/tm.ipc nohup geth --datadir qdata/dd6 $ARGS --rpcport 22005 --port 21005 --unlock 0 --password passwords.txt 2>>qdata/logs/6.log &
PRIVATE_CONFIG=qdata/c7/tm.ipc nohup geth --datadir qdata/dd7 $ARGS --rpcport 22006 --port 21006 --unlock 0 --password passwords.txt 2>>qdata/logs/7.log &
set +v

echo
echo "All nodes configured. See 'qdata/logs' for logs, and run e.g. 'geth attach qdata/dd1/geth.ipc' to attach to the first Geth node."
echo "To test sending a private transaction from Node 1 to Node 7, run './runscript.sh private-contract.js'"

exit 0
