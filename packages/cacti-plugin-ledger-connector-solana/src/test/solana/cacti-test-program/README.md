# cacti-test-program

A minimal, **self-contained** Anchor program used only by this connector's
tests. It has no dependency on any application program, so the connector's 
test suite is fully self-contained.

It exposes just enough to exercise the connector's ABI layer:

- `initialize(value: u64, label: pubkey)` — creates the `["counter", authority]`
  PDA; emits `Initialized`.
- `increment(amount: u64)` — mutates it; emits `Incremented`.
- `Counter { authority, value, label, bump }` — an account to decode.
- `Initialized` / `Incremented` — events to decode / stream.

Program id: `4JfcF73r9QQ8pmL64UuzCTUt3cSACN2435BQJzWBSL5X`

## Built artifacts (committed, consumed by the tests)

`src/test/resources/cacti-test-program/`:
- `cacti_test_program.so` — loaded into `solana-test-validator`
- `cacti_test_program.json` — the Anchor IDL
- `cacti_test_program-keypair.json` — the program keypair (fixes the program id)

## Rebuilding (only if you change `lib.rs`)

Requires the Solana + Anchor toolchain (`anchor`, `solana`, `cargo-build-sbf`).

```bash
cd src/test/solana/cacti-test-program
anchor build
# copy the refreshed artifacts back into the test resources:
cp target/idl/cacti_test_program.json          ../../resources/cacti-test-program/
cp target/deploy/cacti_test_program.so         ../../resources/cacti-test-program/
cp target/deploy/cacti_test_program-keypair.json ../../resources/cacti-test-program/
```

The `target/` build cache is gitignored (except the program keypair, which keeps
the program id stable across rebuilds).
