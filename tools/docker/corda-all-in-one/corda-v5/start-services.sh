#!/bin/bash

# Load the cached container images into the Docker Daemon before launching
# the Docker Compose network. This is the preferred workaround to synchronizing
# different processes of a supervisord configuration
tar -cC '/etc/corda/corda-dev/' . | docker load

# Now that the images are cached **and** loaded to the daemon, we can start the
# corda network via the docker-compose file and it will not need to download
# anything from DockerHub (if it does, that's a bug)
supervisorctl start corda5-solarsystem-contracts-demo-network
