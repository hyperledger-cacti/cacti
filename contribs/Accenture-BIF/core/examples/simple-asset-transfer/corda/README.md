<p align="center">
  <img src="https://www.corda.net/wp-content/uploads/2016/11/fg005_corda_b.png" alt="Corda" width="500">
</p>

# Corda application 'Hyperledger Cactus'

**This is based on the KOTLIN version of the CorDapp template.(https://github.com/corda/cordapp-template-kotlin/).**

**To run Corda application on a single machine, at least 7GB RAM should exists. In other case, OutOfMemoryException
can be thrown by the application during the execution or the application' run can be undetermined.**

## Pre-Requisites

You will need the following installed on your machine before you can start:

* [JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
  installed and available on your path (Minimum version: 1.8_171). Please, take into the account,
  that JDK8 should be used, not a higher version, due to the gradle component limitations.
* [IntelliJ IDEA](https://www.jetbrains.com/idea/download/) (Minimum version 2017.1)
* git
* Optional: [h2 web console](http://www.h2database.com/html/download.html)
  (download the "platform-independent zip")

For more detailed information, see the
[getting set up](https://docs.corda.net/getting-set-up.html) page on the Corda docsite.

For IDE, compilation and JVM version issues, see the
[Troubleshooting](https://docs.corda.net/troubleshooting.html) page on the Corda docsite.

## Getting Set Up

To get started, clone this repository and change directory to the newly cloned repo:

     cd Hyperledger Cactus/examples/simple-asset-transfer/corda

## Building the Corda application 'Hyperledger Cactus'

**Unix:**

     ./gradlew build deployNodes deployWeb deployScripts

**Windows:**

     gradlew.bat build deployNodes deployWeb

## Corda application 'Hyperledger Cactus' project packages

Project has a fine-grained structure with the following dependencies:

    Hyperledger Cactus-corda
        |
        contracts
        workflows
        clients

Contracts - states and their corresponding contracts and DB schemas<br>
Workflows - parties specific flows and business logic<br>
Clients   - Web Spring components<br>

All the projects has a minimalistic Corda dependencies, nor finances, neither Web dependencies. Web layer should be
like an another module, depending on the application details, and should not be as an application' natural part. For
each party, Spring Boot Web application is built with REST API and simple Web frontend functionality. Corda nodes
communicate with Web Spring components through the RPC protocol.

## Running the Corda nodes separately

Once the build finishes, change the directory to the folder where the newly built nodes are located:

     cd build/nodes

The Gradle build script will create a folder for each node. You'll see 4 folders, one for each node and
a `runnodes` script. You can run the nodes with:

**Unix:**

     ./runnodes

**Windows:**

    runnodes.bat

You should have now 5 Corda nodes ( Notary, Party A, Party B, Party C, Party D ), running on your machine,
serving the application.

When the nodes have booted up, you should see a message like the following one in the console:

     Node started up and registered in 5.007 sec

## Running the Corda nodes, Web components in the background mode

This is possible only in **Unix:**. Once the build finishes, change the directory to the folder where
the newly built scripts are located:

    cd build/scripts

You can start the Corda nodes, Web components with:

**Unix:**

     ./start_corda_components.sh path/to/log/directory

You should now have 5 Corda nodes ( Notary, PartyA, PartyB, PartyC, PartyD ) and 4 WEB Spring components
( PartyA, PartyB, PartyC, PartyD ), running on your machine in the background mode, serving the application.

To use the whole Corda application, start the nodes, Web Spring components, open the desired Web browser with enough
number of windows/tabs and navigate to:

    http://localhost:10051/  PartyA Web
    http://localhost:10052/  PartyB Web
    http://localhost:10053/  PartyC Web
    http://localhost:10054/  PartyD Web

It will allow to see each ledger node view and start the work with Corda application.

The Common API endpoints served are:

     /api/v1/node-info

The Actor API endpoints served are:

     /api/v1/actors/create
     /api/v1/actors/list
     /api/v1/actors/{pubKey}
     /api/v1/actors/verify
     /api/v1/actors/verify-state
     /api/v1/actors/verify-and-create

The Asset API endpoints served are:

     /api/v1/asset/create
     /api/v1/asset/{assetId}
     /api/v1/asset/lock

The Auth API endpoints served are:

     /api/v1/auth/login
     /api/v1/auth/random-number

To stop the whole Corda application, change the directory to the folder where the newly built scripts are located:

    cd build/scripts

You can stop the Corda nodes, Web components with:

**Unix:**

     ./stop_corda_components.sh

You should now stop the whole Corda application on your machine.

## Interacting with the nodes

### Shell

When started via the command line, each node will display an interactive shell:

    Welcome to the Corda interactive shell.
    Useful commands include 'help' to see what is available, and 'bye' to shut down the node.

    Thu Apr 25 16:07:12 EEST 2019>>>

You can use this shell to interact with your node. For example, enter `run networkMapSnapshot` to see a list of
the other nodes on the network:

    Thu Apr 25 15:44:48 EEST 2019>>> run networkMapSnapshot
    [
      {
      "addresses" : [ "localhost:10002" ],
      "legalIdentitiesAndCerts" : [ "O=Notary, L=London, C=GB" ],
      "platformVersion" : 4,
      "serial" : 1556196072083
    },
      {
      "addresses" : [ "localhost:10003" ],
      "legalIdentitiesAndCerts" : [ "O=PartyA, L=London, C=GB" ],
      "platformVersion" : 4,
      "serial" : 1556196094143
    },
      {
      "addresses" : [ "localhost:10004" ],
      "legalIdentitiesAndCerts" : [ "O=PartyB, L=New York, C=US" ],
      "platformVersion" : 4,
      "serial" : 1556196089296
    },
      {
      "addresses" : [ "localhost:10005" ],
      "legalIdentitiesAndCerts" : [ "O=PartyC, L=Paris, C=FR" ],
      "platformVersion" : 4,
      "serial" : 1556196089673
    },
      {
      "addresses" : [ "localhost:10006" ],
      "legalIdentitiesAndCerts" : [ "O=PartyD, L=Berlin, C=DE" ],
      "platformVersion" : 4,
      "serial" : 1556196113394
    }
    ]

    Thu Apr 25 15:47:30 EEST 2019>>>

You can find out more about the node shell [here](https://docs.corda.net/shell.html).

### Webserver

`clients/src/main/kotlin/accenture/interoperability/webserver/` defines a simple Spring webserver that connects to a
node via RPC and allows you to interact with the node over HTTP.

The API endpoints are defined here:

     clients/src/main/kotlin/com/accenture/interoperability/webserver/Controller.kt

And a static webpage is defined here:

     clients/src/main/resources/static/

#### Running the webserver

##### Via the command line

    cd build/web
    java -Dspring.profiles.active=A -jar web.jar
    java -Dspring.profiles.active=B -jar web.jar
    java -Dspring.profiles.active=C -jar web.jar
    java -Dspring.profiles.active=D -jar web.jar

##### Via IntelliJ

Run the `Run Template Server` run configuration. By default, it connects to the node with RPC address `localhost:10006`
with the username `user1` and the password `test`, and serves the webserver on port `localhost:10051`.

#### Interacting with the webserver

The static webpage is served on:

    http://localhost:10051

While the sole template endpoint is served on:

    http://localhost:10051/api/v1/node-info
    {
    "nodeInfo": {
        "legalIdentities": [
            "O=PartyA, L=London, C=GB"
        ]
    }
    }

    http://localhost:10052/api/v1/node-info
    {
    "nodeInfo": {
        "legalIdentities": [
            "O=PartyB, L=New York, C=US"
        ]
    }
    }

    http://localhost:10053/api/v1/node-info
    {
    "nodeInfo": {
        "legalIdentities": [
            "O=PartyC, L=Paris, C=FR"
        ]
    }
    }

    http://localhost:10054/api/v1/node-info
    {
    "nodeInfo": {
        "legalIdentities": [
            "O=PartyD, L=Berlin, C=DE"
        ]
    }
    }

## Running Corda application 'Hyperledger Cactus' inside the IDE scope

To enable Corda application run inside the IDE scope, the following steps should be executed:

- Install/Open the IntelliJ IDEA

- Import the Corda project inside the IDE by follow the default steps

- Open Run/Edit Configurations/Add new configuration/Kotlin
- Fill the following fields:<br>
    Name - Main program<br>
    Main class - com.accenture.interoperability.MainKt<br>
    VM options - -ea -javaagent:/absolute/path/to/project/corda/lib/quasar.jar<br>
    Use classpath of module - corda.testing.main<br>

- Open Run/Edit Configurations/Add new configuration/Kotlin
- Fill the following fields:<br>
    Name - PartyA WEB<br>
    Main class - com.accenture.interoperability.webserver.ServerKt<br>
    Environment variables - spring.profiles.active=PartyA<br>
    Use classpath of module - corda.clients.main<br>

- Open Run/Edit Configurations/Add new configuration/Kotlin
- Fill the following fields:<br>
    Name - PartyB WEB<br>
    Main class - com.accenture.interoperability.webserver.ServerKt<br>
    Environment variables - spring.profiles.active=PartyB<br>
    Use classpath of module - corda.clients.main<br>

- Open Run/Edit Configurations/Add new configuration/Kotlin
- Fill the following fields:<br>
    Name - PartyC WEB<br>
    Main class - com.accenture.interoperability.webserver.ServerKt<br>
    Environment variables - spring.profiles.active=PartyC<br>
    Use classpath of module - corda.clients.main<br>

- Open Run/Edit Configurations/Add new configuration/Kotlin
- Fill the following fields:<br>
    Name - PartyD WEB<br>
    Main class - com.accenture.interoperability.webserver.ServerKt<br>
    Environment variables - spring.profiles.active=PartyD<br>
    Use classpath of module - corda.clients.main<br>

Run/Debug configuration start order:
- Main program
- All the WEB's
