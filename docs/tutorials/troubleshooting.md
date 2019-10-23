_This is part of the main [documentation](../main/index.hmtl)_

### Docker commands require sudo

To use docker commands without sudo: add the user to the docker group to be able to use the docker command without sudo, use : `sudo usermod -aG docker $USER` then restart the session so that the change takes effect.

### Docker Networking

When starting a docker network (such as in ``npm run fed:fabric`` or ``npm run fed:quorum``). You may encounter the following error: 
``'ERROR: Pool overlaps with other one on this address space'``
This means that the local subnet that docker-compose is trying to create already exists, to remove unused docker subnets you can run the following command:
```bash
docker network prune
```

### npm install for git sources

If you try to install the dependencies of the project from a private or restricted network, the npm package download may freeze on certain packages. To change the protocol used for git clone during the installation you can run the following commands.

```bash
git config --global url."https://github.com/".insteadOf git@github.com:
git config --global url."https://".insteadOf git://
```

### Fabric instantiate times out

When running the Fabric client from the Fabric SDK against your Fabric ledger, you may encounter some timeout errors depending on your hardware and your node repartition. To modify the default Fabric client timeout you can follow these steps:

```bash
nano node-module/fabric-client/config/default.json
``` 
increase ``"request-timeout" : 45000,`` l.2
