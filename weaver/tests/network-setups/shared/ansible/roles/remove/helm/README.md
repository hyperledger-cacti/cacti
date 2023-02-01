<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Role for Helm Binary Removal

This role contains the tasks used to remove the installation of the Helm binary. The tasks are all defined in the `tasks/main.yaml` file, which consumes the variables defined in `vars/main.yaml`. These are the variable currently supported:

- `helm.bin_directory` : installation path for the Helm binary and associated scripts. 

## Running The Role as Part of a Playbook

__NOTE__: When this role is imported into a playbook that specifies an environment file or that customises the inclusion through a `vars` dictionary, the resulting configuration for the role heavily depends on the configured behaviour of the Ansible controller. In particular, the setup defined for the `hash_behaviour` property. By default this is set to `replace` rather than `merge`. This causes the `openshift_cli` dictionary defined in the `vars` folder to be completely replaced rather than merged. Please ensure that all the entries of the dictionary are then defined in the `vars` section of the include or in the environment file. See: [Ansible - Importing Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable) 
