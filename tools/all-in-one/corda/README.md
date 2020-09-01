## Build and Run with Docker

#### Build
``docker build . -t corda-all-in-one``

#### Run
``docker run -p 2222:22  corda-all-in-one``

## Build and run with Docker Compose

#### Build
``docker-compose build``

#### Run
``docker-compose up``

#### Tear down
``docker-compose down``

#### ssh into docker container
``ssh -i corda_image -p 2222 root@localhost``

#### ssh into corda node
``ssh -p 20013 localhost -l user1``



