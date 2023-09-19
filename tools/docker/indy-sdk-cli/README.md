# Indy SDK Cli
- Base image with working Indy SDK environment.

## Features
- Indy SDK C-callable libraries (`libindy`, `libnullpay`, `libvcx`, `indy-cli`)
- Python 3.8 and `python3-indy` wrapper library.
- nodejs 12 and npm `indy-sdk` wrapper library.
- JS and Python `utils` helper module in `/home/indy/from-indy-sdk`.
- Used as base image for other indy tools in Cactus.

## Build
```
docker build . -t indy-sdk-cli
```

## Notes
- In case of `gpg: keyserver receive failed: Cannot assign requested address` error - retry until it succeeds. This is some spurious error with keyserver connection.
