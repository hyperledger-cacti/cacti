## Testing Contract Playground

## Connecting to multiple nodes
* run tmux script which by default connects to nodes 1, 2, and 7.

```
$> ./tmux_connect_to_nodes.sh

# to kill the tmux session run
$> tmux kill-session -t quorum
```

# Creating Contracts 
```
$> cd quorum-examples/examples/7nodes
$> ./runscript.sh contracts/simple-event/private-contract-events.js


```

# Testing Multiple Transactions
* Obtain the address of the contract that was deployed.
* set that address in the test scripts
  `var address="0x1932c48b2bf8102ba33b4a6b545c32236e342f34"`

```
$> cd quorum-examples/examples/7nodes
$> ./runscript.sh contracts/simple-event/private-generate-events.js
```

