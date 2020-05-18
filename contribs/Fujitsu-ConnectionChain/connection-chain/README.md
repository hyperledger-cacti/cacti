# ConnectionChain sample

This distribution allows you to try Fujitsu's security technology to safely connect blockchains, named "ConnectionChain," on your local PC.

Original: FUJITSU ConnectionChain sample (v0.9.0)
- https://github.com/FujitsuLaboratories/ConnectionChain-sample/tree/v0.9.0

## Features

ConnectionChain enables value exchange of different blockchain ledgers and provides interoperability of tightly related blockchain ledgers as service business logic.
One of the aims of ConnectionChain is transferring digital assets between multiple blockchains.

ConnectionChain is implemented to automate value exchange transactions between multiple blockchains by using an extended version of smart contract.
Users of ConnectionChain can get the benefits of safely automating exchanges of different value only by implementing a few codes to adapt to other blockchains.

This distribution contains a functional subset of ConnectionChain and some sample codes for transferring digital assets between multiple blockchains.
This distribution allows you to try ConnectionChain on docker containers for evaluation purposes. 

## Installation

You should follow the instructions described in [Getting started](/environment/README.md) to configure the runtime environment of demonstration programs.

## Usage

After installation above, you can run the sample version of the extended smart contract
which allows you to transfer some digital asset from your wallet on one blockchain (called "end-chain 1")
to the destination wallet on another blockchain (called "end-chain 2").

In this sample distribution, the end-chain 1 and the end-chain 2 are composed of two privately managed Ethereum blockchains.

## References 
1.[PRESS RELEASE on November 15, 2017: *"Fujitsu Develops Security Technology to Safely Connect Blockchains"*](https://www.fujitsu.com/global/about/resources/news/press-releases/2017/1115-01.html)

2.[FUJITSU JOURNAL: *"New Blockchain Technologies to Support Secure Transactions Across Virtual Currencies"*](https://journal.jp.fujitsu.com/en/2018/01/24/01/)

## Contact

[ConnectionChain-sample@ml.labs.fujitsu.com ](mailto:ConnectionChain-sample@ml.labs.fujitsu.com)

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE](./LICENSE) file.
