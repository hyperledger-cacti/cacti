<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ansible Role for Download and Installation of Simple Packages

This Ansible role facilitate the implementation of other tasks that naturally require the installation of one of more file in a single rooted directory structure.

## Behaviour

The main logic of the role is implemented in `tasks/main.yaml`, and performs the following operations:

- it checks whether the package is already installed
- it downloads the package from a remote url (if not locally cached)
- it unpacks the package if needed into a temporary folder (optional)
- it moves the content of the package to the designated install path
- it verifies the content of the of the package with a custom command (optional)
- it updates the package cache based on the cache behaviour for the package.

## Configuration

The role require the definition of the following parameters to perform the installation of the package. These are to be provided by th invocation context of the role:

- `package.name` : (required) name of the package being installed.
- `package.install_path` : (required) location where the package is to be installed.
- `package.url` : (required) remote url where to download the package from.
- `package.headers` : (optional, default: {}) a dictionary containing the headers to supply when downloading the package.
- `package.unpack` : (required) determines whether the remote package needs to be unpacked.
- `package.command` : (optional) command to be execute to verify the correct installation.
- `package.cache_refresh` : (optional, default: False) determines whether we should force the cache refresh.
- `package.cache_remove` : (optional, default: False) determines whether the package should be cached.
- `package.archive_path` : (optional, default: '') determines the sub-path within the unpack folder to copy into the installation path.

### Default Settings

The default settings are store in the `defaults/main.yaml` file and at present time they only comprise of these parameters:

```yaml
simple_package_cache_path: ~/.simple-package/cache/
simple_package_metadata_file: package.yaml
simple_package_unpack_directory: unpack/
simple_package_download_directory: download/
```

This parameter control the location of the package cache and its sub-paths. These are usually host wide settings and it is not neccessary to change them per host.

### Additional (Derived) Settings

For the purpose of file system management the role relies upon additional variables which are derived both by the default settings and the `package` dictionary supplied during invocation. These are defined in the `vars/main.yaml` and control the internal sub-path of the cache that are used to download and install the package:

```yaml
package_cache_key: "{{ package.url | hash('md5') }}"
package_cache_directory: "{{ simple_package_cache_path }}{{ package_cache_key }}/"
package_cache_metadata_path: "{{ package_cache_directory }}{{ simple_package_metadata_file }}"
package_cache_unpack_directory: "{{ package_cache_directory }}{{ simple_package_unpack_directory }}"
package_cache_unpack_path: "{{ package_cache_unpack_directory }}{{ package.archive_path | default('') }}"
package_cache_download_directory: "{{ package_cache_directory }}{{ simple_package_download_directory }}"
package_cache_download_file: "{{ package_cache_download_directory }}{{ package.url | basename }}"
```

As happens for the default settings there is no need to change these variables as these are updated automatically by the role:

- `package_cache_key`: unique identifier for the package in the cache, this is derived from the package download url which is hashed via md5.
- `package_cache_directory`: the directory in the host where the package cache for the packacge being installed is located.
- `package_cache_unpack_directory`: the full path to the unpack location where the package is unpacked before being installed in the final location, if the `package.unpack` flag is set to `True`.
- `package_cache_metadata_path`: location of the metadata file that contains the information about the instsalled package.
- `package_cache_unpack_path`: the full path to the portion of the file system to copy in the installation directory. This may coincide with the value of `package_cache_unpack_directory` if `package.archive_path` is not defined or an empty string.
- `package_cache_download_directory`: the full path to the downlaod directory where the package is saved when remotelyb downloaded from the specified url.
- `package_cache_download_file`: the full path to the file that represents the downloaded package. This is the file being copied into the installation path if the package does not require unpacking (i.e. `package.unpack` is `False`).


## Running The Role as Part of a Playbook

__NOTE__: When this role is imported into a playbook that specifies an environment file or that customises the inclusion through a `vars` dictionary, the resulting configuration for the role heavily depends on the configured behaviour of the Ansible controller. In particular, the setup defined for the `hash_behaviour` property. By default this is set to `replace` rather than `merge`. This causes the `package` dictionary defined in the `vars` folder to be completely replaced rather than merged. Please ensure that all the entries of the dictionary are then defined in the `vars` section of the include or in the environment file. See: [Ansible - Importing Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable) 
