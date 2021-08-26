#!/bin/sh

comment () {
    sed -i'.scriptbak' -e "$1"' s/    - /    # - /' "$2"
}
uncomment() {
    sed -i'.scriptbak' -e "$1"' s/    # - /    - /' "$2"
}

# if [ $1 -eq 1 ]
# then
#     uncomment '/    # - DRIVER_NAME/,/    # - DRIVER_HOST/' docker-compose.yaml
#     uncomment '/    # - NETWORK_NAME/,/    # - NETWORK_TYPE/' docker-compose.yaml
#     uncomment '/    # - RELAY_DNS_CONFIG/' docker-compose.yaml
#     uncomment '/    # - ${PATH_TO_REMOTE_RELAYS_DEFINITIONS}/' docker-compose.yaml
#     comment '/    - ${PATH_TO_CONFIG}/' docker-compose.yaml
# else
#     comment '/    - DRIVER_NAME/,/    - DRIVER_HOST/' docker-compose.yaml
#     comment '/    - NETWORK_NAME/,/    - NETWORK_TYPE/' docker-compose.yaml
#     comment '/    - RELAY_DNS_CONFIG/' docker-compose.yaml
#     comment '/    - ${PATH_TO_REMOTE_RELAYS_DEFINITIONS}/' docker-compose.yaml
#     uncomment '/    # - ${PATH_TO_CONFIG}/' docker-compose.yaml
# fi

if [ $1 -eq 2 ]
then
    uncomment 66,68 docker-compose.yaml
    uncomment 74,75 docker-compose.yaml
    uncomment 84 docker-compose.yaml
    uncomment 105 docker-compose.yaml
    comment 104 docker-compose.yaml
else
    comment 66,68 docker-compose.yaml
    comment 74,75 docker-compose.yaml
    comment 84 docker-compose.yaml
    comment 105 docker-compose.yaml
    uncomment 104 docker-compose.yaml
fi

rm -rf docker-compose.yaml.scriptbak