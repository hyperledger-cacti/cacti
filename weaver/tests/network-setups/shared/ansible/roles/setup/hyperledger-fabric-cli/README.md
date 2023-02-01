<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Role for the Installation of Hyperledger Fabric Tooling

This role downloads and install the Hyperledger Fabric tools into the host. The package relies upon the services provided by the role `setup/simple-package` to download and install the archives required for the installation. These are:

- `hyperledger-fabric-{{ os }}-{{ arch }}-{{ version }}.tar.gz` for the general Fabric tooling.
- `hyperledger-fabric-ca-{{ os }}-{{ arch }}-{{ version }}.tar.gz` for the Fabric CA related tooling.

These packages are retrieved from the corresponding releases in the associated GitHub repositories.

## Behaviour

The role includes `roles/setup/simple-package` to install both packages. Please refer to the documentation of the role for further details of the download and installation behaviour.

## Configuration

The activities of the role are controlled by the parameters supplied via the `fabric_cli` dictionary:

- `fabric_cli.os` : (required) operating system identifier of the host (i.e. `linux`, `darwin`, ...)
- `fabric_cli.arch`: (required) cpu architecture of the host (i.e. `amd64`, ...)
- `fabric_cli.bin_directory`: (required) path to the installation location of the Hyperledger Fabric CLI in the host.
- `fabric_cli.version`: (required) version of the Hyperledger Fabric CLI to install.
- `fabric_cli.ca.bin_directory`: (required) path to the installation location of the Hyperledger Fabric CA CLI in the host.
- `fabric_cli.ca.version`: (required) version of the Hyperledger Fabric CA CLI to install.

The two packages (Hyperledger Fabric and Hyperledger Fabric Ca) can be customised differently in terms of instaltion directory and version to install. The architecture and the operating system are the same.

### Default Settings

The `defaults/main.yaml` contains the default settings for the various url's that the role relies upon for downloading the packages. These are shown below. The `hlf_github_release_url` and `hlf_ca_github_release_url` are completed with the specification of the relative path of the specific the package to download based on version, operating system, and archictecture.

```yaml
hlf_github:  "https://github.com/hyperledger"
hlf_github_releases_url: "{{ hlf_github }}/fabric/releases/download"
hlf_ca_github_releases_url: "{{ hlf_github }}/fabric-ca/releases/download"
```

### Derived Settings

The `vars/main.yaml` contains the settings that are derived by the role based on the supplied setting and the default settings. These variables store the information about the full URLs to both the Hyperledger Fabric and the Hyperledger Fabric CA packages.

```yaml
hlf_package_url: ......
hlf_ca_package_url: .....
```

There is no need to change these parameters as they are automatically resolved.

## Running The Role as Part of a Playbook

__NOTE__: When this role is imported into a playbook that specifies an environment file or that customises the inclusion through a `vars` dictionary, the resulting configuration for the role heavily depends on the configured behaviour of the Ansible controller. In particular, the setup defined for the `hash_behaviour` property. By default this is set to `replace` rather than `merge`. This causes the `openshift_cli` dictionary defined in the `vars` folder to be completely replaced rather than merged. Please ensure that all the entries of the dictionary are then defined in the `vars` section of the include or in the environment file. See: [Ansible - Importing Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable) 



