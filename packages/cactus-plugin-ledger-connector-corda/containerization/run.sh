if ! [ -f corda-aio-image.key ];
then
   touch corda-aio-image.key 
fi

docker-compose $* up --force-recreate -d

# copy cert from corda-aio to file shared as secret with cmd-api-server-corda
echo $(docker exec corda-aio cat /etc/hyperledger/cactus/corda-aio-image.key) > ./corda-aio-image.key
