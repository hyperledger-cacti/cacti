---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

**Describe the bug**

A clear and concise description of what the bug is.

**To Reproduce**

Steps to reproduce the behavior on a successfully deployed Hyperledger Cactus cluster.

**Expected behavior**

A clear and concise description of what you expected to happen.

**Logs/Stack traces**

Can help maintainers identify root causes

**Screenshots**

If applicable, add screenshots to help explain your problem.

**Cloud provider or hardware configuration:**
Are you running the software on a dev machine or somewhere in the cloud?

**Operating system name, version, build:**

Use this command: `printf "$(uname -srm)\n$(cat /etc/os-release)\n"`

For example

```sh
$ printf "$(uname -srm)\n$(cat /etc/os-release)\n"
Linux 4.15.0-70-generic x86_64
NAME="Ubuntu"
VERSION="18.04.3 LTS (Bionic Beaver)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 18.04.3 LTS"
VERSION_ID="18.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
VERSION_CODENAME=bionic
UBUNTU_CODENAME=bionic
```

**Hyperledger Cactus release version or commit (git rev-parse --short HEAD):**

Either a semantic version of the release you are using such as `1.0.0` or a git
commit hash if you are directly working with code from the git repository.

**Hyperledger Cactus Plugins/Connectors Used**

 - Which DLT connectors are you using (Fabric, Quorum, Corda, Besu, etc.)

**Additional context**

Add any other context about the problem here.
