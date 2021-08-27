COUNT=0
TOTAL=8

# FABRIC2 - FABRIC1
./bin/fabric-cli interop --key=a --local-network=network2 --requesting-org=Org1MSP relay-network1:9080/network1/mychannel:simplestate:Read:a > tmp.out
tail -n 1 tmp.out | grep "Called Function Create. With Args: a, Arcturus" && COUNT=$(( COUNT + 1 ))

./bin/fabric-cli chaincode query mychannel simplestate read '["a"]' --local-network=network2 > tmp.out
tail -n 1 tmp.out | grep "Result from network query: Arcturus" && COUNT=$(( COUNT + 1 ))

# FABRIC1 - FABRIC2
./bin/fabric-cli interop --key=Arcturus --local-network=network1 --requesting-org=Org1MSP relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus > tmp.out
tail -n 1 tmp.out | grep "Called Function Create. With Args: Arcturus, 17.671" && COUNT=$(( COUNT + 1 ))

./bin/fabric-cli chaincode query mychannel simplestate read '["Arcturus"]' --local-network=network1 > tmp.out
tail -n 1 tmp.out | grep "Result from network query: 17.671" && COUNT=$(( COUNT + 1 ))

# FABRIC1 - CORDA
./bin/fabric-cli interop --key=H --local-network=network1 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true > tmp.out
tail -n 1 tmp.out | grep "Called Function Create. With Args: H, 1" && COUNT=$(( COUNT + 1 ))

./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network1
tail -n 1 tmp.out | grep "Result from network query: 1" && COUNT=$(( COUNT + 1 ))

# FABRIC2 - CORDA
./bin/fabric-cli interop --key=H --local-network=network2 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true > tmp.out
tail -n 1 tmp.out | grep "Called Function Create. With Args: C, 20" && COUNT=$(( COUNT + 1 ))

./bin/fabric-cli chaincode query mychannel simplestate read '["C"]' --local-network=network2
tail -n 1 tmp.out | grep "Result from network query: 20" && COUNT=$(( COUNT + 1 ))


# RESULT
echo "Passed $COUNT/$TOTAL Tests."

if [ $COUNT == $TOTAL ]; then
    exit 0
else
    exit 1
fi