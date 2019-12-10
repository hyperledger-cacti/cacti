# Getting Started

This instruction describes the following:
- how to setup the runtime environment of ConnectionChain and end-chains
- how to use the demo system of asset-transfer.

**NOTE**: In this document, the term "end-chain" describes a blockchain which is connected by ConnectionChain. 
In the demo system, ConnectionChain connects two end-chains, called the end-chain 1 and the end-chain 2.

## Configuration modules

The runtime environment can be configured with either of the following modules. 
- ```base```:  
	This is the base unit of ConnectionChain which does not include end-chains.  
	If you would like to use ConnectionChain for other purposes than the demo system in this repository,
	you must prepare two end-chains and customize the connecters for the end-chains.

- ```sample```:  
	This is a demo system unit which performs as a sample application of asset-transfer from one end-chain to another end-chain via ConnectionChain.  
	This module must be used after activating the base module. This is composed by a customized version of ConnectionChain for the demo system (on ```sample/cc_env```, whose setting files exist on ```base/cc_env```) and two privately managed Ethereum (on ```sample/ec_env```).
 
## Prerequisites

Before you begin, you need to check that you have all the prerequisites installed as follows
- Host system: CentOS7 (recommended)
- Docker (v17.06.2-ce or greater)
- Docker-compose (v1.14.0 or greater)
- Execution files of Hyperledger Fabric (v1.0.4)
	- Download hyperledger-fabric-linux-amd-1.0.4.tar.gz
		- https://nexus.hyperledger.org/content/repositories/releases/org/hyperledger/fabric/hyperledger-fabric/linux-amd64-1.0.4/hyperledger-fabric-linux-amd64-1.0.4.tar.gz
	- Put the above one in ```base/cc_env``` directory 
	- Extract archived contents of hyperledger-fabric-linux-amd-1.0.4.tar.gz at base/cc_env directory.
		~~~
		$ cd ConnectionChain-sample/environment/base/cc_env
		$ tar -zxvf hyperledger-fabric-linux-amd64-1.0.4.tar.gz
		~~~

## Setup steps for the demo system

Please execute the following three steps for starting the demo system in order:
- [Step 1: Starting two end-chains](#Step-1-Starting-two-end-chains):
	- execute the code on ```sample/ec_env```.
- [Step 2: Initial setup of ConnectionChain](#Step-2-Initial-setup-of-ConnectionChain): 
	- execute the code on ```base/cc_env```.
- [Step 3: Starting ConnectionChain and executing a demo system of asset-transfer](#Step-3-Starting-ConnectionChain-and-executing-a-demo-system-of-asset-transfer): 
	- execute the code on ```sample/cc_env```.

### Structure of the demo system

- The demo system is composed of the following docker containers and networks:

  |Container|Role|Network|Port|
  |:---|:---|:---|:---|
  |peer0,peer1,peer2,peer3, orderer, ca|The peer nodes of ConnectionChain|ccnet||	
  |rest-server|The server of ConnectionChain including the relaying application (called CoreAPI) of operations to end-chains|ccnet||
  |app-server|The server of ConnectionChain including the application for calling CoreAPI|ccnet|3031|
  |ec1-adapter, ec1-connector|The servers of ConnectionChain for connecting to the end-chain 1|ccnet(ec1-adapter), ec1net(ec1-connector)|5040(ec1-connector)|
  |ec2-adapter, ec2-connector|The servers of ConnectionChain for connecting to the end-chain 2|ccnet(ec2-adapter), ec2net(ec2-connector)|6040(ec2-connector)|
  |geth1|The peer node of the end-chain 1|ec1net||
  |geth2|The peer node of the end-chain 2|ec2net||

- The docker network topology is as follows:
	<img src="./network-topology.png" width=80%>

### Remark for the setup
- The sentence of ```/* NOTE: ... */``` means only the comments for the following description.  
If you try with this description, please delete the sentence ```/* NOTE: ... */```.
- If you run this demo system behind the firewall, please set the environmental variable $HTTP_PROXY as your proxy.
	~~~
	export HTTP_PROXY=http://id:passwd@your.proxy.com:8080
	~~~

## Step 1: Starting two end-chains
First, please change your working directory:
```
$ cd ConnectionChain-sample/environment/sample/ec_env
```

### Starting the runtime environment 
- Account creation:
	- Run init-account.sh.
		~~~
		$ ./init-account.sh
		~~~
	- Please keep in your memo the addresses (ec1-accounts[0],[1],..,[4] and ec2-accounts[0],[1],..,[4]),  
		- These addresses can be examined later, but both ec1's and ec2's accounts[0] are required at least at this time.  
		- From now on, the Address value should be replaced with your output.
	- Sample output
		~~~
		make-account-ec1-accounts[0]
		Creating network "ecenv_default" with the default driver
		INFO [05-29|08:33:35.658] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {782646267c64d536983a64af9d9a5ab80e036989}
		
		make-account-ec1-accounts[1]
		INFO [05-29|08:33:42.143] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {38f6d41b35d1af26865a0c13d41e8aa342e62e61}
		
		make-account-ec1-accounts[2]
		INFO [05-29|08:33:48.534] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {895b383457a714e051357dfc36bb3b6ddf84f01f}
		
		make-account-ec1-accounts[3]
		INFO [05-29|08:33:54.731] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {caf99b30857e0d29cd866e27fb39b2e7d2b2dc17}
		
		make-account-ec1-accounts[4]
		INFO [05-29|08:34:01.282] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {1b75166f65a852216306af320783e4b22986d3e3}
		
		make-account-ec2-accounts[0]
		INFO [05-29|08:34:08.021] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {8f2244f75a4c53684c5827ec19615dc89c2ad21c}
		
		make-account-ec2-accounts[1]
		INFO [05-29|08:34:14.414] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {add19019ee1ea604b3fcb55a11b97d0fc81cc221}
		
		make-account-ec2-accounts[2]
		INFO [05-29|08:34:21.292] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {ab66982e4eb732f0e17c56586e530f94ee9411ce}
		
		make-account-ec2-accounts[3]
		INFO [05-29|08:34:27.947] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {4809b6329ef15bcd1b5b730e0f148ae751cfd9f6}
		
		make-account-ec2-accounts[4]
		INFO [05-29|08:34:34.360] Maximum peer count                       ETH=25 LES=0 total=25
		Address: {421c9db39b64575c511f94990acfd4394dd5f1c3}
		~~~

- Editing initial block information:
	- Change the "ADDRESS" in genesis/genesis-ec1.json to the address for ec1-accounts[0].
	- Sample output:
		~~~
		"alloc"      : {
			"ADDRESS":
			{"balance":"100000000000000000000000000"}
		},
		
				|
				v
		
		"alloc"      : {
			"782646267c64d536983a64af9d9a5ab80e036989": /*NOTE: modified */
			{"balance":"100000000000000000000000000"}
		},
		~~~
	Similarly, change the "ADDRESS" in genesis/genesis-ec2.json to the address for ec2-accounts[0].  

- Initializing end-chains:
	- Run init-chain.sh.  
		~~~
		$ ./init-chain.sh
		~~~
- Launching Docker containers:  
	- Run up.sh.  
		~~~
		$ ./up.sh
		~~~

If you want to stop, restart, initialize the environment, please refer to [**Appendix A.1**](#A.1:-Stop,-Restart,-Initialize-two-endchains).


## Step 2: Initial setup of ConnectionChain

### 2.1: Configure settings

- Changing your working directory:
	~~~
	$ cd ConnectionChain-sample/environment/base/cc_env
	~~~

- Connection to the interworking node (adapter) setting:  
Replace "**xx.xx.xx.xx**" strings in following files with actual IP address of deployed host.
	- base/cc_env/servers/cooperation/coreSide/ec1_adapter/config/default.js 
	- base/cc_env/servers/cooperation/coreSide/ec2_adapter/config/default.js 

- Proxy setting:  
When you are behind the firewall, you must do the following before starting the runtime environment.
	- Edit following Dockerfiles to enable HTTP connection.
		- base/cc_env/servers/restserver/build/Dockerfile 
		- base/cc_env/servers/appserver/build/Dockerfile 
		- base/cc_env/servers/cooperation/coreSide/build/Dockerfile 
		- base/cc_env/servers/cooperation/ecSide/build/Dockerfile  
		- NOTE: Uncomment the following lines in each Dockerfile.  
			~~~
			#ENV http_proxy $HTTP_PROXY
			#ENV https_proxy $HTTP_PROXY
			#ENV HTTP_PROXY $HTTP_PROXY
			#ENV HTTPS_PROXY $HTTP_PROXY
			#ENV NO_PROXY "rest-server,ec1-connector,ec2-connector,geth1,geth2"
			#RUN npm -g config set proxy $HTTP_PROXY
			~~~
	- Edit following shells to enable HTTP connection.
		- base/cc_env/cc_setup_base_only.sh
		- sample/cc_env/cc_setup_base+sample.sh
		- NOTE: Uncomment the following lines according to your proxy.
			~~~
			PROXY=""
			#PROXY=http://your.proxy.com:8080
			#PROXY=http://id:passwd@your.proxy.com:8080
			~~~
			If your proxy is an no-authentication proxy, please uncomment the second line and comment out other lines.  
			If your proxy is an authentication proxy, please uncomment the third line and comment out other lines.  
			Please replace ```your.proxy.com:8080``` and ```id:passwd``` with the parameters of your proxy.

- Firewall setting (if your OS is CentOS7): 
	- Execute the following command on your console to open the ports used by the demo system.
		~~~
		$ sudo firewall-cmd --zone=public --add-port=3031/tcp
		$ sudo firewall-cmd --zone=public --add-port=5040/tcp
		$ sudo firewall-cmd --zone=public --add-port=6040/tcp
		~~~
	- NOTE: The port 3031 is used by the app-server and the ports 5040 and 6040 are used by the ec1-connector and ec2-connector. 

### 2.2: Starting the runtime environment 

- Changing your working directory:
	~~~
	$ cd ConnectionChain-sample/environment/sample/cc_env
	~~~

- Starting ConnectionChain:  
	Run construction shell in sample/cc_env directory with "up" mode. 
	~~~
	$ ./cc_setup_base+sample.sh -m up -p $HTTP_PROXY
	~~~
	If you are not in proxy environment, -p option is not needed.  
	Please wait until the huge text "END" appears in your console for a few minutes. After that, please exit by Ctrl + C.
	~~~
	_____   _   _   ____   
	| ____| | \ | | |  _ \  
	|  _|   |  \| | | | | | 
	| |___  | |\  | | |_| | 
	|_____| |_| \_| |____/  

	~~~


- Starting application servers:  
	Get the console of running docker containers with docker exec command, and run server manually.  
	It is recommended to follow the instructions at [**Use of screen command (Appendix A.3)**](#A.3:-Use-of-screen-command) for avoiding termination of the service when the console is closed.
	1. The connector for the end-chain 1 
		~~~
		$ docker exec -it ec1-connector bash
		# cd connector
		# export NO_PROXY="geth1"
		# npm start
		~~~
	2. The adaptor for the end-chain 1
		~~~
		$ docker exec -it ec1-adapter bash
		# cd adapter
		# export NO_PROXY="ec1-connector"
		# npm start
		~~~
	3. The connector for the end-chain 2
		~~~
		$ docker exec -it ec2-connector bash
		# cd connector
		# export NO_PROXY="geth2"
		# npm start
		~~~
	4. The adaptor for the end-chain 2
		~~~
		$ docker exec -it ec2-adapter bash
		# cd adapter
		# export NO_PROXY="ec2-connector"
		# npm start
		~~~
	5. The REST server 
		~~~
		$ docker exec -it rest-server bash
		# cd coreapi
		# sudo npm start
		~~~
	6. The APP server
		~~~
		$ docker exec -it app-server bash
		~~~
		At the first run, following command must be issued before executing "npm start" to register administrator account on mongodb.
		~~~
		# mongo
		> db.ccusers.insertOne({"userID":"dbadmin", "password":"b7124a2f3abb7eb7d158e1843b134cf46ee6e8aca2db714d700bed8262c1d6b8", "userName":"DBAdmin", "role":"admin"})
		> exit
		~~~
		- Note that the value "b71..." in above example is hashed value of "dbadminpass" by SHA256.
		
		~~~
		# cd serviceapi
		# export NO_PROXY="rest-server"
		# npm start
		~~~

	If you want to stop, restart, initialize the environment, please refer to [**Appendix A.2**](#A.2:-Stop,-Restart-connectionChain).


- Registration of connection information for end-chains:  
Execute REST API calls to APP server using REST-client such as [POSTMAN](https://www.getpostman.com/).
	1. Login  
		Login as administrator user.
		~~~
		- URL: http://<actual IP address of host>:3031/login/
		- Method: POST
		- Header: Content-Type "Application/json"
		- Body:
			{
				"username":"dbadmin",
				"password":"dbadminpass"
			}
		- Response body:
			{
				"userName":"dbadmin",
				"role":"admin"
			}
		~~~

	2. Register connection information for end-chains  
	Register connection information of the end-chain 1 and the end-chain 2 to ConnectionChain. (You can specify any chainID and chainName.) 
		~~~
		- URL: http://<actual host IP address>:3031/endchains/
		- Method: POST
		- Header: Content-Type "Application/json"
		- Body:
		  (1) end chain 1
			{
				"chainID":"EndChain1",
				"chainName":"EC1",
				"adapterUrl":"https://ec1-adapter:5030"
			}
		  (2) end chain 2
			{
				"chainID":"EndChain2",
				"chainName":"EC2",
				"adapterUrl":"https://ec2-adapter:6030"
			}
		- Response body(example):
			{
				"chainID": "EndChain1"
			}
		~~~


## Step 3: Starting ConnectionChain and executing a demo system of asset-transfer

### 3.1: Overview of this sample
- Two end-chains should be configured with accounts[1] as an exchanger account, accounts[2] as an escrow account,
and accounts[3] and accounts[4] as user accounts.  
- ConnectionChain executes asset-transfer between the accounts on the different end-chains as the following steps:
	1. ConnectionChain executes asset-transfer from the user account to the escrow account on the end-chain 1 (escrow process).
	1. ConnectionChain executes asset-transfer from the exchanger account to the user account on the end-chain 2 (credit process).
	1. ConnectionChain executes asset-transfer from the escrow account to the exchanger account on the end-chain 1 (freezing process).

- When the balance of the exchanger account is not sufficient, ConnectionChain will refund the asset on the escrow account.

### 3.2: Register end-chain specific information

#### Register using registration API
Execute REST API calls to APP server using REST-client such as [POSTMAN](https://www.getpostman.com/).
1. Login:  
	Login as the administrator.
	This step can be omitted if you already logged in as the administrator.
	~~~
	- URL: http://<host IP address>:3031/login/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
		{
			"username":"dbadmin",
			"password":"dbadminpass"
		}
	~~~

2. Register user account:  
	Create a user account which does not have any privileges.  
	You man change any value of parameters except 'role'.  
	If you change it, please replace the value of it in the following descriptions.
	~~~
	- URL: http://<host IP address>:3031/ccusers/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
	  (1) user account 1
		{
			"userID":"userX",
			"password":"userXpass",
			"userName":"UserX",
			"role":"user"
		}
	  (2) user account 2
		{
			"userID":"userY",
			"password":"userYpass",
			"userName":"UserY",
			"role":"user"
		}
	- Response body (example):
		{
			"userID":"userX"
		}
	~~~

3. Register account information on end-chains:  
	- UserX uses accounts[3] on both the end-chain 1 and the end-chain 2,  
	UserY uses accounts[4] on both the end-chain 1 and the end-chain 2.  
	- NOTE: you can check the account address by following instructions for checking balance of accounts found in [Preparation (in 3.3 Test run)](#33-test-run).
	~~~
	- URL: http://<host IP address>:3031/ecaccounts/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
	  (1) UserX uses ec1-accounts[3]
		{
			"userID": "userX",
			"chainID": "EndChain1",
			"accountID": "<address of ec1-accounts[3]>",
			"alias": "EC1-Account[3]"
		}
	  (2) UserY uses ec1-accounts[4]
		{
			"userID": "userY",
			"chainID": "EndChain1",
			"accountID": "<address of ec1-accounts[4]>", 
			"alias": "EC1-Account[4]"
		}
	  (3) UserX uses ec2-accounts[3]
		{
			"userID": "userX",
			"chainID": "EndChain2",
			"accountID": "<address of ec2-accounts[3]>",
			"alias": "EC2-account[3]"
		}
	  (4) UserY uses ec2-accounts[4]
		{
			"userID": "userY",
			"chainID": "EndChain2",
			"accountID": "<address of ec2-accounts[4]>",
			"alias": "EC2-account[4]"
		}
	- Response body (example):
		{
			"ECAccountID": "0"
		}
	~~~

4. Register asset-transfer rule settings:  
	Register asset-transfer rules between the end-chain 1 and the end-chain 2.  
	You can set any conversion rate value as you wish (unit percentage).  
	asset-transfer results two times on from the end-chain 1 to the end-chain 2 on exchange in the following example.  
	~~~
	- URL: http://<host IP address>:3031/rules/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
	  (1) set rate from the end-chain 1 to the end-chain 2
		{
			"ruleName":"EC1 => EC2(200%)",
			"fromChain":
			{
				"chainID":"EndChain1",
				"settlementAccountID":"<address of ec1-accounts[1]>",
				"escrowAccountID":"<address of ec1-accounts[2]>"
			},
			"toChain":
			{
				"chainID":"EndChain2",
				"settlementAccountID":"<address of ec2-accounts[1]>"
			},
			"rule":"200"
		}
	  (2) set rate from the end-chain 2 to the end-chain 1
		{
			"ruleName":"EC2 => EC1(50%)",
			"fromChain":
			{
				"chainID":"EndChain2",
				"settlementAccountID":"<address of ec2-accounts[1]>",
				"escrowAccountID":"<address of ec2-accounts[2]>"
			},
			"toChain":
			{
				"chainID":"EndChain1",
				"settlementAccountID":"<address of ec1-accounts[1]>"
			},
			"rule":"50"
		}
	- Response body(example):
		"ruleID" will be sequentially assigned.(0,1,2,...)
		{
			"ruleID":"0"
		}	
	~~~

### 3.3 Test run

#### Preparation 

You must execute following operations only on first time. 
Get console on connector container, and deposit initial balance.
1. get console ec1-connector:
	~~~
	$ docker exec -it ec1-connector bash
	# cd connector/lib/dependent/
	~~~
2. check account balance:
	~~~
	# node geth_getAccounts.js
	~~~
	Check if balance of accounts[0] is not zero, and balance of other accounts are zero.
3. transfer asset from accounts[0] to other accounts:
	~~~
	# node geth_sendTransaction.js
	~~~
4. check balance of accounts again:
	~~~
	# node geth_getAccounts.js
	~~~
	You will see new balance of accounts[1] is 100000, and balance of [3][4] is 1000.
5. exit console on ec1-connector:
	~~~
	# exit
	~~~
6. execute same operation at console of ec2-connector:
	~~~
	$ docker exec -it ec2-connector bash
	# cd connector/lib/dependent/
	# node geth_sendTransaction.js
	# node geth_getAccounts.js
	# exit
	~~~

#### Execute REST API calls  
Execute REST-API call at APP server using REST-Client such as [POSTMAN](https://www.getpostman.com/).
1. Login:  
	Login as any non-privileged user. 
	~~~
	- URL: http://<host IP address>:3031/login/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
		{
			"username":"userX",
			"password":"userXpass"
		}
	- Response body:
		{
			"userName": "UserX",
			"role": "user"
		}
	~~~

2. Execute the extended smart contract for asset-transfer between the accounts on the different end-chains:  
	You must specify the required parameters ("ruleID", "chainID", "accountID" of from/to accounts, and "asset").
	~~~
	- URL: http://<host IP address>:3031/transfers/
	- Method: POST
	- Header: Content-Type "application/json"
	- Body:
		{
			"ruleID": "<ruleID of conversion rule to apply>",
			"fromChain": {
				"chainID": "EndChain1",
				"accountID": "<address of ec1-accounts[3] or ec1-accounts[4]>",
				"asset":"50" /*NOTE: do not exceed current balance of account */
			},
			"toChain": {
				"chainID": "EndChain2",
				"accountID": "<address of ec2-accounts[3] or ec2-accounts[4]>"
			}
		}
	- Response body(example):
		txID(transaction ID at ConnectionChain) will be returned. 
		{
			"txID":"20190530T072350759_userX"
		}
	~~~
	 

#### Check the execution result of the extended smart contract
You can check the execution result of the extended smart contract after some time later.

1. Obtain transaction record from ConnectionChain:  
	- Execute REST-API call with REST-Client
		~~~
		- URL: http://<host IP address>:3031/transfers/20190530T072350759_userX /*NOTE:replace with actual transaction ID of ConnectionChain */
		- Method: GET
		~~~
	- Example of the result:  
		~~~
		{
			"id": "20190530T072350759_userX",
			"userID": "userX",
			"ruleID": "0",
			"fromChain": {
				"chainID": "EndChain1",
				"accountID": "caf99b30857e0d29cd866e27fb39b2e7d2b2dc17",
				"assetType": "number",
				"asset": "50",
				"escrowAccountID": "895b383457a714e051357dfc36bb3b6ddf84f01f",
				"settlementAccountID": "38f6d41b35d1af26865a0c13d41e8aa342e62e61",
				"escrowEvID": "0xfe7f98095dbf1ddfd893f55a0265491e0463cf0d3fd32754c5751d94c7fc17de",
				"settlementEvID": "0xba81e3547b5a380905aa5f03872d120db4f0d8a408ac0fa612437daf1e028e54"
			},
			"toChain": {
				"chainID": "EndChain2",
				"accountID": "421c9db39b64575c511f94990acfd4394dd5f1c3",
				"assetType": "number",
				"asset": "100",
				"settlementAccountID": "add19019ee1ea604b3fcb55a11b97d0fc81cc221",
				"paymentEvID": "0x1864121155c4a0656412d3583e727b7c5f5177671ffee56e9766c14ed59c12fd"
			},
			"progress": "complete",
			"timestamps": {
				"create": "20190530T072350",
				"requestMargin": "20190530T072353",
				"fixedMargin": "20190530T072358",
				"requestCredit": "20190530T072401",
				"fixedCredit": "20190530T072406",
				"requestFreeze": "20190530T072408",
				"fixedFreeze": "20190530T072418"
			}
		}
		~~~
	
	- If transaction ID was omitted, JSON array of all transactions will be returned.  
		~~~
		- URL: http://<host IP address>:3031/transfers/
		~~~
	- note: non-privilege user can refer transactions which is issued by themselves.  
	The administrator can refer all transactions.  
	For example, assume UserX issued transaction-1, and UserY issued transaction-2, then UserX will get only transaction-1, and UserY will get only transaction-2. But administrator will get both.

2. You may check if asset-transfer on the end-chains with following commands.
	Execute node.js script for checking balance of accounts.
	- Check subtracted balance on the end-chain 1
		You will see subtracted balance on the end-chain 1 (from blockchain). 
		~~~
		$ docker exec -it ec1-connector bash
		# cd connector/lib/dependent/
		# node geth_getAccounts.js
		~~~
	- Check gained balance on the end-chain 2
		You will see gained balance on the end-chain 2 (to blockchain).
		~~~
		$ docker exec -it ec2-connector bash
		# cd connector/lib/dependent/
		# node geth_getAccounts.js
		~~~

## Appendix

### A.1: Stop, Restart, Initialize two-endchains
- First, please change your working directory:
	~~~
	$ cd ConnectionChain-sample/environment/sample/ec_env
	~~~

#### A.1.1: Stop the runtime environment
- Stopping Docker Containers:  
	- Run down.sh.  
		~~~
		$ ./down.sh
		~~~
	- Block data and private keys are not deleted.  

#### A.1.2: Restart the runtime environment
- Launching Docker containers:  
	- Run up.sh.  
		~~~
		$ ./up.sh
		~~~

#### A.1.3: Initialize the runtime environment
- Stopping docker containers and deleting various data:  
	- Run delete.sh.  
		~~~
		$ ./delete.sh
		~~~
	- Block data, private keys, etc. are also deleted collectively.


### A.2: Stop, Restart ConnectionChain
- First, please change your working directory:
	~~~
	$ cd ConnectionChain-sample/environment/sample/cc_env
	~~~

#### A.2.1: Stop runtime environment
- Stopping Docker Containers  
	- Run cc_setup_base+sample.sh with "down" mode.  
		~~~
		$ ./cc_setup_base+sample.sh -m down
		~~~

#### A.2.2: Restart runtime environment
- Launching Docker containers
 	- Run cc_setup_base+sample.sh with "restart" mode.
		~~~
		$ ./cc_setup_base+sample.sh -m restart
		~~~


### A-3: Use of screen command
- It is needed to leave console's tty opened when the application server is started from the console.  
It might cause problems on checking console logs or stopping service from PID.  
You can solve the problem with screen command which allows you to run "npm start" on virtual console.
	~~~
	$ docker exec -it < container name >  Bash
	# cd <app.js place >
	# screen
	- It comes off with ENTER though information on the screen command is output 
	here. 
	# sudo npm start
	~~~
- You can exit from the virtual console with key combination ```Ctrl-a d```.  
The tty on the console will be maintained after the exit.
Check the status of the virtual console with following command.
	~~~
	# screen -ls
	There are screens on:
			82.tty.c04fc474d2a5 (05/17/18 16:13:28) (Detached)
	1 Sockets in /var/run/screen/S-root.
	~~~
- You may execute following command to return the virtual terminal.
	~~~
	# screen -r <PID>
	~~~
- You must specify targeted PID after "-r" when "screen -ls" showed multiple "Detached" PID.  
(PID can be omitted when the result was single "Detached".)  
- The status of virtual console can be shown as "dead??" if you restart docker containers.  
You can remove such virtual consoles with the command "screen -wipe".

