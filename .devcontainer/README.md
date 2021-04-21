
- [Summary](#summary)
- [Prerequisites](#prerequisites)
  - [Windows](#windows)
  - [Linux](#linux)
- [Usage](#usage)

## Summary

The .devcontainer utilises a Dockerfile and devcontainer.json to create a docker container within Visual Studio Code that comes prebuilt with all dependancies needed to start contributing to Hyperledger Cactus.

## Prerequisites

Detailed below are the prerequisites for Windows and Linux

### Windows

1. Visual Studio Code
2. Docker Desktop 2.0+ (Windows 10 Pro/Enterprise) or Docker Desktop 2.3+ and the [WSL 2 back-end](https://docs.docker.com/docker-for-windows/wsl/)(Wndows 10 Home)

For more guidance please see [developing inside a container](https://code.visualstudio.com/docs/remote/containers)

### Linux

1. Visual Studio Code
2. Follow the [official install instructions for Docker CE/EE for your distribution](https://docs.docker.com/get-docker/). If you are using Docker Compose, follow the [Docker Compose directions](https://docs.docker.com/compose/install/) as well.
3. Add your user to the docker group - sudo usermod -aG docker $USER
4. Sign out and back in

For more guidance please see [developing inside a container](https://code.visualstudio.com/docs/remote/containers)

## Usage

1. Install the "Remote - Containers" VSC [extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Clone the repo 
3. In VSC click the two green arrows at the bottom left
4. Click "Remote Containers: Open Folder In Container"
5. Navigate to repo and open at a root level

You should see a pop up at the bottom right stating the container is starting. Once the container is ready you will see the repo opened, you should now be ready to start contributing to Hyperledger Cactus.

Note - The first time you initiate the container it may take a while to complete. All other loads from then should be much faster.
