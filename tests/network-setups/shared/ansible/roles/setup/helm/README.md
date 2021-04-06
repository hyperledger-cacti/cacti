<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Role for the Installation of the Helm Binary 

This folder contains the definition of the setup for the Helm binary (i.e. `helm`). This role defines a set of tasks that perform the following activities:

- verification of the local installation of the Helm binary
- download of the binary package if not present from the configured Helm website
- unpacking and installation of the package in the designated installation directory
- verification of the installation package after download

The tasks are all defined in the `tasks/main.yaml` file, which consumes the variables defined in `vars/main.yaml`. These are the variable currently supported:

- `tmp_directory`: root path to the temp directory folder as specifed by the OS (this is retrieved via a `lookup('env', 'TMPDIR') | default('/tmp')`). 
- `helm.os`: operating system family of the machine where the Ansible Controller (i.e. `darwin` for MacOS X and `linux` for Linux boxes).
- `helm.arch` : operating system architecture of the machine where the Ansible Controller is running. 
- `helm.version` : selected version of the Helm binary to downlaod.
- `helm.bin_directory` : installation path for the Helm binary and associated scripts. 
- `helm.checksum` : checksum of the installation package file used for the purpose of verification.

To specify the values for the helm dictionary please refer to: [Helm Releases](https://github.com/helm/helm/releases). The resulting file name is composed by using version, os, and architecture.

## Running The Role as Part of a Playbook

__NOTE__: When this role is imported into a playbook that specifies an environment file or that customises the inclusion through a `vars` dictionary, the resulting configuration for the role heavily depends on the configured behaviour of the Ansible controller. In particular, the setup defined for the `hash_behaviour` property. By default this is set to `replace` rather than `merge`. This causes the `openshift_cli` dictionary defined in the `vars` folder to be completely replaced rather than merged. Please ensure that all the entries of the dictionary are then defined in the `vars` section of the include or in the environment file. See: [Ansible - Importing Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable) 
