# Cactus discounted-cartrade


## Abstract

Cactus discounted-cartrade is a sample application that adds employee discounts to the original Cactus cartrade. In this application, when the users transfer the car ownership in the cactus cartrade, they present their employee proofs to the rent-a-car company to receive an employee discount. We implement the employee proofs by proofs on Hyperledger Indy. As with the original application, car ownership is represented by a Fabcar chaincodetoken on Hyperledger Fabric, which can be exchanged for ETH currency on a private Ethereum blockchain. This Business Logic Plugin (BLP) application controls a process from employee certification using Hyperledger Indy to payment using Ethereum.

![discounted-cartrade image](./image/discounted-cartrade-image.png)


## Scenario

The application works in the following scenario:

### Settings

Alice wants to rent a car using the services of rental car company Thrift Corp. Alice chose this company because she is an employee of Acme Corp., which offers discounts on Thrift Corp.'s services as a benefit.

**Note** : Acme Corp and Thrift Corp have the same names on the sample application on Hyperledger Indy.

### Preparations

Alice knows that Acme Corp. provides digital certificates. She asks Acme Corp. to issue a credential when she uses various services, and the company issues it.

### When Alice Uses the Service

Alice will use credentials and other Indy formats such as schema and definition to create an employee proof that she will present when applying the lent-a-car service. Alice then sends a car usage application and her employee proof to the Cactus Node Server via an End User Application. The employee proofs consist of proof requests and proofs on Hyperledger Indy. The Cactus Node server receives the schema and definition from the Indy ledger via Validator and uses this information to verify the proof with the BLP. Once verified, the BLP will decide what she should pay based on the price list and then proceed with the original cartrade application using cactus as an escrow to transfer ETH currencies and car ownership tokens to each other.

## Preparations

1. Clone source files from GitHub.

    ```bash
    mkdir /tmp/work
    cd /tmp/work
    git clone https://github.com/hyperledger/cactus.git
    ```

1. Start Ledger containers and validators

    Follow the instructions in the linked pages to start ledger containers and validators:
    - Launch [Hyperledger Fabric docker containers](https://github.com/hyperledger/cactus/tree/main/tools/docker/fabric14-fabcar-testnet)
    - Launch Hyperledger Fabric validator ([@hyperledger/cactus-plugin-ledger-connector-fabric-socketio](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-fabric-socketio))
    - Launch [Go-Ethereum docker containers](https://github.com/hyperledger/cactus/tree/main/tools/docker/geth-testnet)
    - Launch Go-Ethereum validator ([@hyperledger/cactus-plugin-ledger-connector-go-ethereum-socketio](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-go-ethereum-socketio))
    - Launch [Hyperledger Indy and validator containers](https://github.com/hyperledger/cactus/tree/main/tools/docker/indy-testnet)

1. Install Indy-SDK libraries

    Install Indy-SDK libraries by following the instructions in its [README](https://github.com/hyperledger/indy-sdk/#installing-the-sdk) page. For example, you will need to install `libindy.so` in `/usr/lib/` directory if you are using Ubuntu18. This will be called from the application and the script you are going to set up in the following steps.

1. Setup and Start the application

    1. Create config files directory in your host environment

        ```bash
        cd /etc
        sudo mkdir /etc/cactus
        sudo chmod 777 /etc/cactus
        ```

    1. Move back to source tree location

        ```bash
        cd /tmp/work
        ```

    1. Build `cactus-cmd-socketio-server`

        1. Edit configuration file

            Edit `cactus/etc/cactus/default.yaml` file.

            ```bash
            vi cactus/etc/cactus/default.yaml
            ```

            Edit value of `applicationHostInfo.hostName` from `http://aaa.bbb.ccc.ddd` to `http://localhost`:

            ```yaml
            applicationHostInfo:
              hostName: http://localhost # please change hostName to your IP address
              hostPort: 5034
            ```

        1. Install npm packages and build

            ```bash
            cd packages/cactus-cmd-socketio-server
            npm install
            npm run build
            ```

    1. Build `discounted-cartrade`

        1. change directory

            Change your current directory to `examples/discounted-cartrade`.

            ```bash
            cd ../../examples/discounted-cartrade
            ```

        1. edit config file

            ```bash
            vi config/usersettings.yaml
            ```

            Edit value of `applicationHostInfo.hostName`  in `usersettings.yaml` from `http://aaa.bbb.ccc.ddd` to `http://localhost`:

            ```yaml
            applicationHostInfo:
              hostName: http://localhost # please change hostName to your IP address
              hostPort: 5034
            ```

            **Note**: Variables you write in `usersetting.yaml` overwrite variables in `default.yaml`.

        1. build discounted-cartrade

            The `init-discount-cartrade` step is for creating symbolic links. Therefore you need to run this step only once.

            ```bash
            npm install
            npm run build
            npm run init-discounted-cartrade
            ```

    1. Start the application server

        Run this command in `examples/discounted-cartrade` directory:

        ```bash
        npm run start
        ```

        The discounted-cartrade application will wait on port `5034`.

1. Prepare script environment

    Create a working directory and copy files and install python packages.

    ```bash
    mkdir -p /tmp/scriptdir/src
    cd /tmp/scriptdir/src
    touch __init__.py
    cp /tmp/work/cactus/tools/docker/indy-testnet/indy-sdk-cli/from-indy-sdk/utils.py  .
    cp /tmp/work/cactus/examples/register-indy-data/req_discounted_cartrade.py .
    cd ..
    python3 -m venv .venv
    . .venv/bin/activate
    pip install python3-indy requests
    ```

    **Note**: python3.6 or higher is required.

## Run the scenario

1. Start the car trade

    Run this command:

    ```bash
    cd /tmp/scriptdir
    . .venv/bin/activate
    TEST_POOL_IP=172.16.0.2 python -m src.req_discounted_cartrade
    ```

    The script creates a proof that user Alice is employed by Acme Corp. This script then `POST`s the proof to the application. The application decides the price of the car depending on success / failure of proof verification. After that, the application moves ETH token on the Go-Ethereum and moves the car ownership on the Hyperledger Fabric.

    **Note**: the address `172.16.0.2` is the address of the container Hyperledger Indy pool is running on.

    **Note**: the script will save the proof in `myproof.json` in current directory. Once you have the file, you can instruct the script to skip the time consuming steps and directly `POST` the proof to the application by adding an option: `TEST_POOL_IP=172.16.0.2 python -m src.req_discounted_cartrade --mode http`

    **Note**: If your environment defines http proxy environment variables and the script / curl complains about it, unset them by `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`.

1. See the status in the ledger after the car trade

    To see trade record (the src.req_discounted_cartrade will print the ID at the end of script):

    ```bash
    curl localhost:5034/api/v1/bl/trades/XXXXXXXXXXXXXX-XXX -XGET
    ```

    To see the balance (last element of the URL is the account ID):

    ```bash
    curl localhost:5034/api/v1/bl/balance/9d624f7995e8bd70251f8265f2f9f2b49f169c55
    ```

    To see the status of the car:

    ```bash
    curl localhost:5034/api/v1/bl/cars/CAR1 -XGET
    ```
