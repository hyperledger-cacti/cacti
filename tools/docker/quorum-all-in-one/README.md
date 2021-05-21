# quorum-docker-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

An all in one quorum docker image with Tessera included for private transaction support.

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/quorum-all-in-one/ -t qaio
docker run --rm qaio
```


### Visual Studio Code Tasks

Example `.vscode/tasks.json` file for building/running the image:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Docker - BUILD and TAG: Latest",
      "type": "shell",
      "command": "docker build . -t hyperledger/cactus-quorum-all-in-one:latest"
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
