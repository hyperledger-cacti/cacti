![Cactus Logo Color](./images/HL_Cactus_Logo_Color.png)

# Hyperledger Cactus

 ![license](https://img.shields.io/github/license/hyperledger/cactus) [![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4089/badge)](https://bestpractices.coreinfrastructure.org/projects/4089)  ![GitHub issues](https://img.shields.io/github/issues/hyperledger/cactus) ![Travis (.org)](https://img.shields.io/travis/hyperledger/cactus)

This project is an _Incubation_ Hyperledger project. For more information on the history of this project see the [Cactus wiki page](https://wiki.hyperledger.org/display/cactus). Information on what _Active_ entails can be found in
the [Hyperledger Project Lifecycle document](https://wiki.hyperledger.org/display/TSC/Project+Lifecycle).

Hyperledger Cactus aims to provide Decentralized, Secure and Adaptable Integration between Blockchain Networks.
Hyperledger Cactus is currently undergoing a major refactoring effort to enable the desired to-be architecture which will enable plug-in based collaborative development to increase the breadth of use cases & Ledgers supported.

## Scope of Project

As blockchain technology proliferates, blockchain integration will become an increasingly important topic in the broader blockchain ecosystem.  For instance, people might want to trade between multiple different blockchains that are run on different platforms. The blockchain integration framework is a web application system designed to allow users to securely integrate different blockchains. It includes a set of libraries, data models, and SDK to accelerate development of an integrated services application. Our goal is to deliver a system that allows users of our code to securely conduct transactions between all of the most commonly used blockchains.

## Run the Examples

### Supply Chain Example

```sh
git clone https://github.com/hyperledger/cactus.git
cd cactus
npm install
npm run configure
cd examples/supply-chain-app/
npm install --no-package-lock
cd ../../
npm run build:dev
$ npm start:example-supply-chain
...
[2020-10-27T00:38:00.574Z] INFO (api-server): Cactus API reachable http://127.0.0.1:5000
[2020-10-27T00:38:00.574Z] INFO (api-server): Cactus Cockpit reachable http://127.0.0.1:6000
...
[2020-10-27T00:38:00.574Z] INFO (api-server): Cactus API reachable http://127.0.0.1:5100
[2020-10-27T00:38:00.574Z] INFO (api-server): Cactus Cockpit reachable http://127.0.0.1:6100
```

Once the last command has finished executing, open link printed on the console with a web browser of your choice

### Car Trade Example

- The guidance is [here](./examples/cartrade/README.md).

## Documentation

* [Project Wiki](https://wiki.hyperledger.org/display/cactus): Schedule and logs of the maintainer meetings
* [Whitepaper](./whitepaper/whitepaper.md): The official document on Cactus design specifications

## Contact
* mailing list: [cactus@lists.hyperledger.org](mailto:cactus@lists.hyperledger.org)
* rocketchat channel: [https://chat.hyperledger.org/channel/cactus](https://chat.hyperledger.org/channel/cactus).

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [contributing](/CONTRIBUTING.md) guidelines to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE](/LICENSE) file.
