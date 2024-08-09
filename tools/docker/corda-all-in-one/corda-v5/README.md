# Instructions to compile and run the new Corda v5.0 test network

To create an image of the dockerfile run:  
`DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/corda-v5 -t newcordaimg` 

To run the AIO, execute:  
`docker run -it --rm --privileged -v /var/run/docker.sock:/var/run/docker.sock --network host -d newcordaimg`