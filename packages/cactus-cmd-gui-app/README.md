# `@hyperledger/cactus-cmd-gui-app`

This component allows viewing ledger data in Supabase. The data is fed to supabase by persistence plugins for each ledgers.

## Summary

- [Remarks](#remarks)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Remarks

- Plugin requires running Supabase and persistence plugins in order to properly view ledger data.
- Currently, only ethereum based ledgers are supported.

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

In the root of the project, execute the command to install and build the dependencies. It will also build this GUI front-end component:

```sh
yarn run build
```

### Usage
- Run Supabase instance (see documentation for detailed instructions). For development purposes, you can use our image located in `tools/docker/supabase-all-in-one`.
- Run one or more persistence plugins:
    - [Ethereum](../cactus-plugin-persistence-ethereum)
- Edit [Supabase configuration file](./src/supabase-client.tsx), set correct supabase API URL and service_role key.
- Execute `yarn run start` in this package directory.
- The running application address: http://localhost:3001/ (can be changed in [Vite configuration](./vite.config.ts))

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments