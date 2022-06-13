### Cactus BUILD instruction

`apt` is available on Debian and its downstream distros. Windows and Mac installation instructions are provided below. Alternatively, you can use `choco` on Windows and `brew` on MacOS (although they aren't as maintained as `apt`).

#### Installing Git
Git is a tool for version control that you will need to build and maintain Hyperledger Cactus from source. To install Git on a Debian-based Linux system, you should run the following command.

```shell
sudo apt install git-all
```

Installation methods for other systems can be found [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

#### Installing Docker
 
Docker is a tool for containerization of softwares. It helps ship software and mitigates compatibility issues. To install Docker, please follow the installation guide provided [here](https://docs.docker.com/engine/install/).

To install Docker on Debian, one would follow the following steps.

```shell=
### Uninstall old Docker versions
sudo apt-get remove docker docker-engine docker.io containerd runc

### Setup your repositories
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
    
### Add Docker's GPG keys
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \ $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  
### Install the Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

### Check that the package has been correctly installed
sudo docker run hello-world

```

#### Installing nvm, nodejs and yarn

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
nvm install --lts

curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install yarn
```

#### Installing JDK 11

```
sudo apt-get update && sudo apt-get upgrade
sudo apt-get install openjdk-11-jdk
java -version

### If you're using bash, you may need to set this in your bashrc file
export JAVA_HOME=<path_to_java_home>
```

For Windows, you can follow the guide provided [here](https://docs.oracle.com/en/java/javase/11/install/installation-jdk-microsoft-windows-platforms.html#GUID-371F38CC-248F-49EC-BB9C-C37FC89E52A0). For MacOS, you can follow the instructions [here](https://docs.oracle.com/en/java/javase/11/install/installation-jdk-macos.html#GUID-F575EB4A-70D3-4AB4-A20E-DBE95171AB5F).

#### Installing VS Code 

You can download and install VS Code from [here](https://code.visualstudio.com/download). It is suggested to install the git-graph and Docker plugins. 

#### Clone and compile the Cactus repository 🌵

```
git clone https://github.com/hyperledger/cactus
yarn add
yarn configure

### To test all your packages, you can run
yarn test:all
```

## Getting Started

* Install OS level dependencies:
  * Windows Only
    * WSL2 or any virtual machine running Ubuntu 20.04 LTS
  * Git
  * NodeJS v16.14.2, npm v8.5.0 (we recommend using the Node Version Manager (nvm) if available for your OS)
    ```
    nvm install 16.14.2
    nvm use 16.14.2
    ```
  * Yarn 
    * `npm run install-yarn` (from within the project directory)
  * [Docker Engine](https://docs.docker.com/engine/install/ubuntu/). Make sure that Docker is working and running, for example, running ``docker ps -aq``  
  * Docker Compose  

  * OpenJDK (Corda support Java 8 JDK but do not currently support Java 9 or higher)
    * `sudo apt install openjdk-8-jdk-headless`

* Clone the repository

```sh
git clone https://github.com/hyperledger/cactus.git
```


Windows specific gotcha: `File paths too long` error when cloning. To fix:
Open PowerShell with administrative rights and then run the following:

```sh
git config --system core.longpaths true
```

* Change directories to the project root

```sh
cd cactus
```

* Run the initial configuration script (can take a long time, 10+ minutes on a low-spec laptop)

```sh
yarn run configure
```

At this point you should have all packages built for development.

You can start making your changes (use your own fork and a feature branch)
or just run existing tests and debug them to see how things fit together.

For example you can *run a ledger single status endpoint test* via the
REST API with this command:

```sh
npx tap --ts --timeout=600 packages/cactus-test-plugin-htlc-eth-besu/src/test/typescript/integration/plugin-htlc-eth-besu/get-single-status-endpoint.test.ts
```

*You can also start the API server* and verify more complex scenarios with an
arbitrary list of plugins loaded into Cactus. This is useful for when you intend
to develop your plugin either as a Cactus maintained plugin or one on your own.

```sh
npm run generate-api-server-config
```

Notice how this task created a .config.json file in the project root with an
example configuration that can be used a good starting point for you to make
changes to it specific to your needs or wants.

The most interesting part of the `.config.json` file is the plugins array which
takes a list of plugin package names and their options (which can be anything
that you can fit into a generic JSON object).

Notice that to include a plugin, all you need is specify it's npm package name.
This is important since it allows you to have your own plugins in their respective,
independent Github repositories and npm packages where you do not have to seek
explicit approval from the Cactus maintainers to create/maintain your plugin at all.

Once you are satisfied with the `.config.json` file's contents you can just:

```sh
npm run start:api-server
```

After starting the API server, you will see in the logs that plugins were loaded
and that the API is reachable on the port you specified (4000 by default). The Web UI (Cockpit)
is disabled by default but can be enabled by changing the property value 'cockpitEnabled'
to true and it is reachable through port on the port your config
specified (3000 by default).

> You may need to enable manually the CORS patterns in the configuration file.
This may be slightly inconvenient, but something we are unable to compromise on
despite valuing developer experience very much. We have decided that the
software should be `secure by default` above all else and allow for
customization/degradation of security as an opt-in feature rather than starting
from that state.

At this point, with the running API server, you can
* Test the REST API directly with tools like cURL or Postman
* Develop your own applications against it with the `Cactus API Client(s)`
* Create and test your own plugins


#### Random Windows specific issues not covered here

We recommend that you use WSL2 or any Linux VM (or bare metal).
We test most frequently on Ubuntu 20.04 LTS

## Build Script Decision Tree

The `npm run watch` script should cover 99% of the cases when it comes to working
on Cactus code and having it recompile, but for that last 1% you'll need to
get your hands dirty with the rest of the build scripts. Usually this is only
needed when you are adding new dependencies (npm packages) as part of something
that you are implementing.

There are a lot of different build scripts in Cactus in order to provide contributors
fine(r) grained control over what parts of the framework they wish build.

> Q: Why the complexity of so many build scripts?
>
> A: We could just keep it simple with a single build script that builds everything
always, but that would be a nightmare to wait for after having changed a single
line of code for example.

To figure out which script could work for rebuilding Cactus, please follow
the following decision tree (and keep in mind that we have `npm run watch` too)

![Build Script Decision Tree](./docs/images/build-script-decision-tree-2021-03-06.png)

## Configuring SSH to use upterm
Upload your public key onto github if not done so already. A public key is necessary to join the ssh connection to use upterm. For a comprehensive guide, see the [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

Locate the `ci.yml` within `.github/workflows` and add to the `ci.yml` code listed below: 
  - name: Setup upterm session
    uses: lhotari/action-upterm@v1
    with: 
      repo-token: ${{ secrets.GITHUB_TOKEN }}

Keep in mind that the SSH upterm session should come after the checkout step (uses: actions/checkout@v2.3.4) to ensure that the CI doesn't hang without before the debugging step occurs. Editing the `ci.yml` will create a new upterm session within `.github/workflows` by adding a new build step. For more details, see the [Debug your GitHub Actions by using ssh](https://github.com/marketplace/actions/debugging-with-ssh). 

By creating a PR for the edited `ci.yml` file, this will the CI to run their tests. There are two ways to navigate to CIs. 
  1) Go to the PR and click the `checks` tab
  2) Go to the `Actions` tab within the main Hyperledger Cactus Repository

Click on the `CI Cactus workflow`. There should be a new job you've created be listed underneath the `build (ubuntu-20.04)` jobs. Click on the the new job (what's you've named your build) and locate the SSH Session within the `Setup Upterm Session` dropdown. Copy the SSH command that start with `ssh` and ends in `.dev` (ex. ssh **********:***********@uptermd.upterm.dev). Open your OS and paste the SSH command script in order to begin an upterm session. 
