---
id: besu-besu
title: "Asset Exchange: Besu with Besu"
sidebar_label: Besu with Besu
pagination_label: Besu with Besu
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

We divide this page into two sections, if you used default configuration in ledger initialization step, then go to section [AliceERC721 with BobERC20](#aliceerc721-with-boberc20), otherwise if you used hybrid tokens in `network`, then go to section [AliceERC1155 with BobERC20](#aliceerc1155-with-boberc20)

| Notes |
|:------|
| The hash used in following steps can be replaced by any valid `SHA256` hash. |

## AliceERC721 with BobERC20

One Besu network transfers an non-fungible `AliceERC721` token with id `0` from Alice to Bob in exchange for a transfer of `10 BobERC20` tokens from Bob to Alice in the other network. We will use account `1` for Alice and account `2` for Bob in both networks.

Run the following steps:

1. Navigate to the `weaver/samples/besu/besu-cli` folder in your clone of the Cacti repository.
2. Run the following to verify the status of the assets owned by `alice` and `bob` in the two networks:
   ```bash
   ./bin/besu-cli asset get-balance --network=network1 --account=1
   ./bin/besu-cli asset get-balance --network=network1 --account=2
   ./bin/besu-cli asset get-balance --network=network2 --account=1
   ./bin/besu-cli asset get-balance --network=network2 --account=2
   ```
3. Generate Secret-Hash Pair using following command (prints hash in base64):
  ```
  ./bin/besu-cli hash --hash_fn=SHA256 secrettext
  ```
4. Run the following to trigger `alice` locking `AliceERC721` token with id `0` for `bob` in `network1` for 1 hour
  ```bash
  ./bin/besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --token_id=0 --asset_type=ERC721 --timeout=3600 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
  ```
  Value set to `hash_base64` argument corresponds to what was generated in Step 3. Note the `contract-id` printed as output in above command. The output line containing `contract-id` (text in base64 after `Lock contract ID:`) would like this:
  ```bash
  Lock contract ID: 48f59da2ac632117bf79b4aa986f5ece8a2439dc143d576965c17bc8275b0925
  ```
5. Run the following to verify `alice`'s lock, replacing `<contract-id>` with actual `contract-id`:
 ```bash
 ./bin/besu-cli asset is-locked --network=network1 --lock_contract_id=<contract-id>
 ```
6. Run the following to trigger `bob` locking `10` units of `BobERC20` tokens for `alice` in `network2` for 30 mins:
 ```bash
 ./bin/besu-cli asset lock --network=network2 --sender_account=2 --recipient_account=1 --amount=10 --timeout=1800 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
 ```
 Note the `contract-id` again for this lock printed as output in above command. Let's refer it `<contract-id-2>` for this demonstration.
7. Run the following to verify `bob`'s lock:
 ```bash
 ./bin/besu-cli asset is-locked --network=network2 --lock_contract_id=<contract-id-2>
 ```
8. Run the following to trigger `alice`'s claim for `10` units of `BobERC20` tokens locked by `bob` in `network2`:
 ```bash
 ./bin/besu-cli asset claim --network=network2 --recipient_account=1 --preimage=secrettext --lock_contract_id=<contract-id-2>
 ```
9. Run the following to trigger `bob`'s claim for `AliceERC721` NFT with id `0` locked by `alice` in `network1`:
 ```bash
 ./bin/besu-cli asset claim --network=network1 --recipient_account=2 --preimage=secrettext --token_id=0 --lock_contract_id=<contract-id>
 ```
 
The above steps complete a successful asset exchange between two Besu networks. 
In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

- If `alice` wants to unlock the asset, run the following to trigger `alice`'s re-claim for `AliceERC721` NFT with id `0` locked in `network1`:
 ```bash
 ./bin/besu-cli asset unlock --network=network1 --lock_contract_id=<contract-id> --sender_account=1 --token_id=0
 ```

- If `bob` wants to unlock the token asset, run the following to trigger `bob`'s re-claim for `10 BobERC20` tokens locked in `network2`:
 ```bash
 ./bin/besu-cli asset unlock --network=network2 --lock_contract_id=<contract-id-2> --sender_account=2
 ```
   
## AliceERC1155 with BobERC20

One Besu network transfers an non-fungible `5 AliceERC1155` tokens with id `0` from Alice to Bob in exchange for a transfer of `50 BobERC20` tokens from Bob to Alice in the other network. We will use account `1` for Alice and account `2` for Bob in both networks.

Run the following steps:

1. Navigate to the `weaver/samples/besu/besu-cli` folder in your clone of the Cacti repository.
2. Run the following to verify the status of the assets owned by `alice` and `bob` in the two networks:
   ```bash
   ./bin/besu-cli asset get-balance --network=network1 --account=1
   ./bin/besu-cli asset get-balance --network=network1 --account=2
   ./bin/besu-cli asset get-balance --network=network2 --account=1
   ./bin/besu-cli asset get-balance --network=network2 --account=2
   ```
3. Generate Secret-Hash Pair using following command (prints hash in base64):
  ```
  ./bin/besu-cli hash --hash_fn=SHA256 secrettext
  ```
4. Run the following to trigger `alice` locking `5 AliceERC1155` token with id `0` for `bob` in `network1` for 1 hour
  ```bash
  ./bin/besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --amount=5 --token_id=0 --asset_type=ERC1155 --timeout=3600 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
  ```
  Value set to `hash_base64` argument corresponds to what was generated in Step 3. Note the `contract-id` printed as output in above command. The output line containing `contract-id` (text in base64 after `Lock contract ID:`) would like this:
  ```bash
  Lock contract ID: 48f59da2ac632117bf79b4aa986f5ece8a2439dc143d576965c17bc8275b0925
  ```
5. Run the following to verify `alice`'s lock, replacing `<contract-id>` with actual `contract-id`:
 ```bash
 ./bin/besu-cli asset is-locked --network=network1 --lock_contract_id=<contract-id>
 ```
6. Run the following to trigger `bob` locking `50` units of `BobERC20` tokens for `alice` in `network2`:
 ```bash
 ./bin/besu-cli asset lock --network=network2 --sender_account=2 --recipient_account=1 --amount=50 --timeout=3600 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
 ```
 Note the `contract-id` again for this lock printed as output in above command. Let's refer it `<contract-id-2>` for this demonstration.
7. Run the following to verify `bob`'s lock:
 ```bash
 ./bin/besu-cli asset is-locked --network=network2 --lock_contract_id=<contract-id-2>
 ```
8. Run the following to trigger `alice`'s claim for `50` units of `BobERC20` tokens locked by `bob` in `network2`:
 ```bash
 ./bin/besu-cli asset claim --network=network2 --recipient_account=1 --preimage=secrettext --lock_contract_id=<contract-id-2>
 ```
9. Run the following to trigger `bob`'s claim for `5 AliceERC1155` tokens with id `0` locked by `alice` in `network1`:
 ```bash
 ./bin/besu-cli asset claim --network=network1 --recipient_account=2 --preimage=secrettext --token_id=0 --lock_contract_id=<contract-id>
 ```
 
The above steps complete a successful asset exchange between two Besu networks. 
In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

- If `alice` wants to unlock the asset, run the following to trigger `alice`'s re-claim for `5 AliceERC1155` tokens with id `0` locked in `network1`:
 ```bash
 ./bin/besu-cli asset unlock --network=network1 --lock_contract_id=<contract-id> --sender_account=1 --token_id=0
 ```

- If `bob` wants to unlock the token asset, run the following to trigger `bob`'s re-claim for `50 BobERC20` tokens locked in `network2`:
 ```bash
 ./bin/besu-cli asset unlock --network=network2 --lock_contract_id=<contract-id-2> --sender_account=2
 ```

Run the following to verify the status of the assets owned by `alice` and `bob` in the two networks:
```bash
./bin/besu-cli asset get-balance --network=network1 --account=1
./bin/besu-cli asset get-balance --network=network1 --account=2
./bin/besu-cli asset get-balance --network=network2 --account=1
./bin/besu-cli asset get-balance --network=network2 --account=2
```

