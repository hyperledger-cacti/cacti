<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Roles Main Folder

This folder contains the Ansible roles used by the playbook. The roles are organised based on the type of activities that they perform:

- `setup`: contains all the roles for setting up dependencies and tooling.
- `remove`: contains all the roles for removing installed dependencies and tooling.
- `check`: contains all the roles for verifying various prerequisites.

Current roles:

- `check/setup`: checks prerequisites.
- `setup/helm`: sets up Helm in the Ansible controller.
- `setup/openshift-cli`: sets up the OpenShift Container Platform CLI in the Ansible controller.
- `remove/helm`: removes the Helm installation in the Ansible controller.
- `remove/openshift-cli`: removes the OpenShift Container Platform CLI installation from the Ansible controller.

Please refer to the README.md files of each of the roles to understand in detail their use and function.

