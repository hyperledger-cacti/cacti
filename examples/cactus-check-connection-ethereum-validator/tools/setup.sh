#!/bin/bash

ROOT_DIR=`realpath ../../..`

# --------------------------- SWITCHES ---------------------------

function main_switch(){
    case $1 in
        -s)
        setup "$2"
        ;;
        help)
        echo "-----------------------------------------------------------------------------------"
        echo "Usage for setup: $0 {-s} {setup step}"
        echo "Setup steps:
            - check_cactus_dir - checks if /etc/cactus dir exists
            - check_cactus_permissions - checks if /etc/cactus has correct permissions
            - start_eth_env - starts Ethereum environment
            - configure_topdir - runs <npm run configure> in cactus topdir
            - build_connector - builds ethereum go connector
            - start_connector - launches ethereum go connector
            - build_socketio_server - builds socketio server
            - build_blp - builds cactus-check-connection-ethereum-validator BLP
            - start_blp - launches cactus-check-connection-ethereum-validator BLP
            - rebuild_blp - rebuilds cactus-check-connection-ethereum-validator BLP
            - connector - runs full setup of connector (install + build)
            - env - runs full setup of environment (check_cactus_dir + check_cactus_permissions + start_eth_env
            + configure_topdir)
            - blp - runs full seyup of blp (install + build)
            "
        echo "-----------------------------------------------------------------------------------"
        ;;
        *)
        echo "Wrong parameter provided
        Use <$0 help> for more info"
        ;;
    esac
}

function setup(){
    case $1 in
        check_cactus_dir)
        check_cactus_dir
        ;;
        check_cactus_permissions)
        check_cactus_permissions
        ;;
        start_eth_env)
        start_docker_ethereum_env
        ;;
        configure_topdir)
        configure_topdir
        ;;
        build_connector)
        build_connector
        ;;
        start_connector)
        start_connector
        ;;
        build_socketio_server)
        build_socketio_server
        ;;
        build_blp)
        build_blp
        ;;
        start_blp)
        start_blp
        ;;
        rebuild_blp)
        rebuild_blp
        ;;
        connector)
        setup_connector
        ;;
        blp)
        setup_blp
        ;;
        env)
        setup_env
        ;;
        *)
        echo "Wrong parameter provided
        Allowed parameters:
        {check_cactus_dir|check_cactus_permissions|
        start_eth_env|configure_topdir|build_connector|start_connector|
        build_socketio_server|build_blp|start_blp|rebuild_blp|connector|env|blp}"
        ;;
    esac
}

# --------------------------- SETUP FUNCTIONS ---------------------------

function check_cactus_dir(){
    echo "Check if directory /etc/cactus exists"
    if [[ -d "/etc/cactus" ]]
    then
        echo "Directory /etc/cactus already exists"
    else
        sudo mkdir /etc/cactus
    fi
}

function check_cactus_permissions(){
    echo "Check if directory /etc/cactus has correct permissions"
    if [ "$(stat -c '%a' /etc/cactus)" == "777" ]
    then
        echo "Directory /etc/cactus has proper permissions"
    else
        sudo chmod 777 /etc/cactus
    fi
}

function start_docker_ethereum_env(){
    echo "Start docker env for Go-Ethereum testnet"
    cd ${ROOT_DIR}/tools/docker/geth-testnet
    ./script-start-docker.sh
}

function configure_topdir(){
    echo "Build all necessary packages from topdir"
    cd ${ROOT_DIR}
    npm run configure
}

function build_connector(){
    echo "Build ethereum connector"
    cd ${ROOT_DIR}/packages/cactus-plugin-ledger-connector-go-ethereum-socketio
    install_and_build
    npm run init-ethereum
    docker-compose -f docker-compose.yaml build
    
}

function start_connector(){
    echo "Launch ethereum connector"
    connector_dir_name="cactus-plugin-ledger-connector-go-ethereum-socketio"
    docker-compose -f ${ROOT_DIR}/packages/${connector_dir_name}/docker-compose.yaml up
}

function build_socketio_server(){
    echo "Launch socketio server"
    cd ${ROOT_DIR}/packages/cactus-cmd-socketio-server
    install_and_build
}

function build_blp(){
    echo "Build BLP"
    cd ${ROOT_DIR}/examples/cactus-check-connection-ethereum-validator
    install_and_build
    npm run init-check-connection-ethereum-validator
}

function start_blp(){
    echo "Launch BLP"
    cd ${ROOT_DIR}/examples/cactus-check-connection-ethereum-validator
    npm run start
}

function rebuild_blp(){
    echo "Rebuild BLP"
    node_modules="${ROOT_DIR}/examples/cactus-check-connection-ethereum-validator/node_modules"
    package_lock="${ROOT_DIR}/examples/cactus-check-connection-ethereum-validator/package-lock.json"
    echo "Are you sure you want to delete (y|n):
         $node_modules
         $package_lock"
    read user_input
    if [ "$user_input" = "y" ]
    then
        rm -rf "$node_modules"
        rm -f "$package_lock"
    elif [ "$user_input" = "n" ]
    then
        echo "Aborting..."
        return
    else
        echo "Wrong input. Required {y|n}"
    fi

    if [ ! -d "$node_modules" ] &&  [ ! -f "$package_lock" ]
    then
        echo "Directory node_modules and package-lock.json successfully deleted"
    fi
    echo "Building BLP"
    cd ${ROOT_DIR}/examples/cactus-check-connection-ethereum-validator
    install_and_build
    npm run init-check-connection-ethereum-validator
}

function setup_env(){
    echo "Running full setup of env"
    check_cactus_dir
    check_cactus_permissions
    start_docker_ethereum_env
    configure_topdir
}

function setup_connector(){
    echo "Running full setup of connector"
    build_connector
    start_connector
}

function setup_blp(){
    echo "Running full setup of blp"
    build_blp
    start_blp
}

# --------------------------- HELPER FUNCTIONS ---------------------------

function install_and_build(){
    npm install
    npm run build
}

# --------------------------- MAIN EXECUTION ---------------------------

main_switch "$1" "$2"