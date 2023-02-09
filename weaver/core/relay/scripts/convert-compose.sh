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
    uncomment 59,61 docker-compose.yaml
    uncomment 69,73 docker-compose.yaml
    uncomment 79,80 docker-compose.yaml
    uncomment 89 docker-compose.yaml
    uncomment 110 docker-compose.yaml
    comment 109 docker-compose.yaml
else
    comment 59,61 docker-compose.yaml
    comment 69,73 docker-compose.yaml
    comment 79,80 docker-compose.yaml
    comment 89 docker-compose.yaml
    comment 110 docker-compose.yaml
    uncomment 109 docker-compose.yaml
fi

rm -f docker-compose.yaml.scriptbak
