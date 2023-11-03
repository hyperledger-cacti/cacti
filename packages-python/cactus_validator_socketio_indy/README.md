# Indy Validator

- Cactus socketio validator to integrate with Hyperledger Indy

## Build

- By default, it assumes that indy pool is available at `172.16.0.2`
- You can modify this behavior by editing `Dockerfile` or by setting arg `pool_ip`

```
./setup_indy.sh
```

## Updating the dependencies

- When updating depedency in `requirements.txt` make sure that it's dependencies are updated as well.
- Make sure you update the package version in `setup.py` as well.
- After each update build and run container to ensure it still works.
- Follow this process when updating the package:

```bash
    # Go to package dir
    cd packages-python/cactus_validator_socketio_indy/validator-python

    # Setup venv and install core dependencies
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade setuptools wheel
    pip install Flask==2.3.2 Flask-SocketIO==5.1.1 PyJWT==2.4.0 PyYAML==5.4.1 python3-indy==1.16.0 eventlet==0.31.1 cryptography==41.0.3

    # Freeze current package listing
    pip freeze > requirements.txt

    # Copy the contents of requirements.txt to setup.py install_requires list (adjust formatting accordingly).
```

## Manual Test

- Validator used by `cactus-example-discounted-asset-trade` sample app.
