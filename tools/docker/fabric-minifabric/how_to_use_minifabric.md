# How to Use minifabric

### Reference

- [hyperledger-labs/minifabric: Do fabric network the right and easy way. (github.com)](https://github.com/hyperledger-labs/minifabric)

  

### System Requirements

- CentOS7 in no proxy network

  - Note: I did the test using CentOS 7 running on virtualbox on windows 10 in no proxy network.
  
  

### How to Install

1. Create the directory `mywork` under the home directory and stores the minifabic execution environment.

   - `$ mkdir -p ~/mywork && cd ~/mywork && curl -o minifab -sL https://tinyurl.com/yxa2q6yr && chmod +x minifab`

   - TIPS: If your minifab installation doesn't work, you can try again as follows;
     - `$ curl -o minifab -L https://tinyurl.com/twrt8zv && chmod +x minifab`
     - `$ docker pull hyperledgerlabs/minifab:latest`

2. Clone fabcar chaincode (go version) to `mywork/vars/chaincode/fabcar/go`.

   - `$ cd ~`

   - `$ git clone https://github.com/hyperledger/fabric-samples.git`

   - `$ cd mywork/vars`

   - `$ mkdir -p chaincode/fabcar/go`

   - `$ cd chaincode/fabcar/go`

   - `$ cp -r ~/fabric-samples/chaincode/fabcar/go/* ./`

3. Create `spec.yaml`

   - You need to create a file `spec.yaml` that shows the minifabric system configuration. Quoting `spec.yaml` from the minifabic repository below, change the `ca1.org0.example.com` and `ca1.org1.example.com` in the `fabric: cas:` part to `ca.org0.example.com` and `ca.org0.example.com` and place them under `mywork`.

      - [minifabric/spec.yaml at main · hyperledger-labs/minifabric (github.com)](https://github.com/hyperledger-labs/minifabric/blob/main/spec.yaml)
      - The first five lines are:

      ```
      fabric:
       cas:
       - "ca.org0.example.com"
       - "ca.org1.example.com"
       peers: 
      ```

4. Start minifabric deploying fabcar chaincode (go version) of fabric-samples v1.4.8.

   - `minifab up -i 1.4.8 -e true -n fabcar -l go -o org1.example.com -s couchdb -p`




### How to use fabcar chaincode

- You can execute functions in `mywork/vars/chaincode/fabcar/go/fabcar.go`, for example;
  - `minifab invoke -p '"InitLedger",""'`
  - `minifab invoke -p '"QueryAllCars",""'`
  - `minifab invoke -p '"ChangeCarOwner","CAR0","Yasushi"'`
  - `minifab invoke -p '"QueryAllCars",""'`

