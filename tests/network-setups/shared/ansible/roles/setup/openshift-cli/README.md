<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Role for OpenShift Container Platform CLI Setup

This folder contains the definition of the setup fole for the OpenShift CLI (i.e. `oc`). This role defines a set of tasks that perform the following activities:

- verification of the local installation of the CLI
- download of the CLI package if not present from the configured binary repository (i.e. Artifactory)
- unpacking and installation of the CLI package in the designated installation directory
- verification of the installation package after download
- login of the CLI into the specified cluster (if required)
- selection of the default project (if required)

The tasks are all defined in the `tasks/main.yaml` file, which consumes the variables defined in `vars/main.yaml`. These are the variable currently supported:

- `tmp_directory`: root path to the temp directory folder as specifed by the OS (this is retrieved via a `lookup('env', 'TMPDIR') | default('/tmp')`). 
- `openshift_cli.os`: operating system family of the Ansible Controller (i.e. `darwin` for MacOS X and `linux` for Linux boxes).
- `openshift_cli.project` : default project to select (i.e. kubernetes namespace) after logging in. 
- `openfhift_cli.login_mode` : selected mode for login (i.e. `oc` for using directly the oc client, `ocl` for using the ocl.sh script, `none` for avoiding login).
- `openshift_cli.bin_directory` : installation path for the client binary and associated scripts. 
- `openshift_cli.repository.url` : url to the repository that contains the package distribution for the OpenShift Container Platform CLI and associated tooling.
- `openshift_cli.reposittory.api_key` : API key to use to perform authentication against the binary repository.
- `openshift_cli.api.token` : API Key to use to perform authentication against the OpenShift cluster API server.
- `openshift_cli.api.cluster_hostname` : Hostanme of the host where the OpenShift cluster API server is running on.
- `openshift_cli.api.cluster_endpoint` : Endpoint where the OpenShift cluster API server is listening on. 


## Login Modes

This playbook implements different login modes to cater for IP resolution issues experienced in some environments when running directly through the `oc` binary. In some cases, the binary is not able to resolve the IP address of the API server given its hostname because of misconfiguration of the DNS. In that case, the script `ocl.sh` pre-fetches the IP given the hostname and replaces the endpoint provided in the configuration with an dynamic endpoint that is composed by using the IP and the form: `https://{{IP}}:6443`. Future versions of the script will also incorporate the management of a custom port.


## Running The Role as Part of a Playbook

__NOTE__: When this role is imported into a playbook that specifies an environment file or that customises the inclusion through a `vars` dictionary, the resulting configuration for the role heavily depends on the configured behaviour of the Ansible controller. In particular, the setup defined for the `hash_behaviour` property. By default this is set to `replace` rather than `merge`. This causes the `openshift_cli` dictionary defined in the `vars` folder to be completely replaced rather than merged. Please ensure that all the entries of the dictionary are then defined in the `vars` section of the include or in the environment file. See: [Ansible - Importing Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable) 
