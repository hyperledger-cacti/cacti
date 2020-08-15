# fabric-docker-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

An all in one fabric docker image with 1 peer, 1 orderer and 1 channel.

Example `.vscode/tasks.json` file for building/running the image:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Docker - BUILD and TAG: Latest",
      "type": "shell",
      "command": "docker build . -t hyperledger/cactus-fabric-all-in-one:latest"
    },
    {
      "label": "Docker Compose - BUILD",
      "type": "shell",
      "command": "docker-compose build --force-rm"
    },
    {
      "label": "Docker Compose - UP",
      "type": "shell",
      "command": "docker-compose up --force-recreate "
    }
  ]
}
```