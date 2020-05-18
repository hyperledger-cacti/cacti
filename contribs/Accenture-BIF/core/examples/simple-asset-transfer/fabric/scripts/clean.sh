docker rm -f $(docker ps -a | awk '{ print $1,$2 }' | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $1 }'))
docker rmi -f $(docker images | grep dev | awk '{print $3}')
rm -rf ../api/fabric-client-kv-org[1-2]
rm -rf ../logs/