Thank you for your interest to contribute to Hyperledger Cactus! :tada:

First things first, please review the [Hyperledger Code of Conduct](https://wiki.hyperledger.org/display/HYP/Hyperledger+Code+of+Conduct) before participating.

There are many ways to contribute to Hyperledger Cactus, both as a user and as a developer.

As a user, this can include:
* [Making Feature/Enhancement Proposals](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)
* [Reporting bugs](https://github.com/hyperledger/cactus/issues/new?assignees=&labels=bug&template=bug_report.md&title=)

As a developer:
* if you only have a little time, consider picking up a [“help-wanted”](https://github.com/hyperledger/cactus/labels/help%20wanted) or ["good-first-issue"](https://github.com/hyperledger/cactus/labels/good%20first%20issue) task
* If you can commit to full-time development, then please contact us on our [Rocketchat channel](https://chat.hyperledger.org/channel/cactus) to work through logistics!


### Completing a PR

To protect the Hyperledger Cactus source code, GitHub pull requests are accepted from forked repositories only. There are also quality standards identified and documented here that will be enhanced over time.

1. Fork [hyperledger/cactus](https://github.com/hyperledger/cactus) via Github UI
1. Clone the fork to your local machine
1. Complete the desired changes and where possible test locally (more detail to come here)
1. Commit your changes
    1. Make sure you sign your commit using `git commit -s` for more information see [here](https://gist.github.com/tkuhrt/10211ae0a26a91a8c030d00344f7d11b)
    1. Make sure your commit message follows [Conventional Commits syntax](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#specification); this aids in release notes generation
1. Push your changes to your master
1. Initiate a pull request from your fork to the base repository
1. Await CI, DCO & linting quality checks, as well as any feedback from reviewers

### Adding a new dependency to one of the packages:

For example web3 can be added as a dependency to the besu ledger connector plugin's package this way:

```sh
npx lerna add web3@latest --scope '*/*plugin-ledger-connector-besu' --exact # [--dev] [--peer]
```

If you are adding a development dependency you can use the `--dev` option and `--peer` for a peer dependency.
