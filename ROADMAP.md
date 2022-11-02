# Hyperledger Cacti Roadmap

A living document with the maintainers' plans regarding the general direction of the project:

![](https://media.giphy.com/media/llmrnMkLqcssM6sYG7/giphy-downsized.gif)

## Can I Add Things to the Roadmap?

If you take on the burden of implementing a feature yourself no one should stop you from adding it here as well, as long as the majority of the maintainers also agree that it is something that has a place in the framework.

For example: 
* Support being added for new ledgers by implementing new connector plugins is always welcome.
* On the other hand, if you want to repurpose Cactus to be the operating system for a driverless ice-cream truck you are developing that that **may** not get accepted by the maintainers even if you are happy to do all the work yourself. 

# Breakdown by each release

## Release plan

### Cacti V1 (= Cactus)
- Date: 
    - Start: March 2022
    - Expired: ****
- Goal:
    - Ledger Connectors: Supply Ledger Connectors for all Hyperledger blockchains
    - Integrating other projects: Integrate with Hyperledger-labs Weaver
- Sub release
    - [V1.0] First release of Cactus V1
        - Date: March 2022
        - Goal:
            - Ledger Connectors – connectors to communicate with various blockchain platforms using multiple programming languages: (TypeScript and Python)
                - Hyperledger Besu, Fabric, Indy, Iroha, Sawtooth
                - Go-Ethereum, Quorum, Xdai
                - Corda
    - [V1.1] Improved version reflecting security-audit advice
        - Date: October 2022

### Cacti V2
- Date: 
    - Start: March 2023 (planned)
    - Expired: ****
- Goal:
    - To integrate Cactus different APIs to provide user-friendly APIs.  In detail, the goal is to combine the following strengths of existing APIs on Cactus V1 and Weaver to provide better functionality
        - c.f.: APIs on Cactus V1 
            - OpenAPI-api-client users need to use slightly different names, data types between different ledger types.
            - Verifier interface users only need to know four functions, but arguments passed to the function differs between different ledger types.
            - Weaver interface.
        - Notes: The above goal will make some of Cactus V1 features incompatibilities on Cactus V2
- Sub release
    - [V2.0-alpha] First release of the merged version of Cactus and Weaver
        - Date: November 2022 (planned)
        - Goal:
            - Raw integration with Cactus and Weaver features
    - [V2.0-beta]
        - Date: February 2023 (planned)
        - Goal:
            - Refactoring the architecture codes reflecting the diagram
            - Add a GUI transaction viewer tool for Hyperledger Cacti 
    - [V2.0]
        - Date: March 2023 (planned)
        - Goal:
            - Enhance the code quality of V2.0-beta

## Notes

- Versioning:
    - When we release a new version which does not include API incompatibilities, we should not increment MAJOR version number, according to [SemVer](https://semver.org/) principle.
- Terminology
    - Quarters are defined as:
        - **Q1**: January, February, March
        - **Q2**: April, May, June
        - **Q3**: July, August, September
        - **Q4**: October, November, December
    - Halves are defined as:
        - **H1**: Q1+Q2
        - **H2**: Q3+Q4