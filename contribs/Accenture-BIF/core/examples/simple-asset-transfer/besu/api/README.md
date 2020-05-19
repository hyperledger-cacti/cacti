# Examples / Simple Asset Transfer / Besu / API <!-- omit in toc -->

- [Troubleshooting](#troubleshooting)
  - [npm postinstall web3 patching fails](#npm-postinstall-web3-patching-fails)

## Troubleshooting

### npm postinstall web3 patching fails

Check if the version of the `web3` dependency has been  changed (either by your or someone else's change)
The `./node_modules/web3-core-helpers/src/formatters.js` file may have had it's souce updated on account of the latter
which would result in the patching to be outdated. You can fix it by inspecting the line number in
`examples/simple-asset-transfer/besu/api/web3_timestamp_fix.patch` and adjusting it to the new line number of the
same line of code in `./node_modules/web3-core-helpers/src/formatters.js`.
It is also possible that after an update of `web3` the whole patching mechanism is no longer needed because they adjusted
their code to work out of the box with ours. This is something that has to be determined on a case by case basis every
time the web3 dependency is updated.
We aim to eliminate the need for patching altogether in the future.
