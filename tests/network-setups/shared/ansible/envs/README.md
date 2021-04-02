<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Environment Files Folder

This folder contains the variables that are used by the playbooks in this repository.

The following playbookn variables are defined:

| Variable Name                    | Description | Used By | Default Value  |
|----------------------------------|-------------|---------|----------------|
| `cloud_provider`                 | Unique identifier of the cloud provider used to provision and operate with the cluster. | `setup.yaml` | `openshift` |
| `install_os`                     | Unique identifier of the operating system the ansible controller is running on. Use `darwin` for MacOS X and `linux` for Linux. | `setup.yaml` | depends on file |
| `install_arch`                   | Unique identifier of the architecture of the ansible controller is running on. Use `amd64` for AMD. This flag is used to retrieve the various binaries (i.e. helm) | `setup.yaml` | 'amd64' |
| `bin_install_dir`                | Path to the installation directory in the ansible controller where all the binaries will be installed. | `setup.yaml` and `reset.yaml` | `~/bin` |
| `artifactory_api_key`            | API Key to access the Artifactory repository to pull binaries (used to retrieve OpenShift CLI). | `setup.yaml` | maps the `ARTIFACTORY_API_KEY` environment variable. |
| `openshift_login_mode`           | Name of the OpenShift project that the client will be configuring as default. | `setup.yaml` | `dlt-interop` (it can be set to "") |
| `openshift_project`              | API Key used to access the configured OpenShift Cluster. | `setup.yaml` | maps the `OPENSHIFT_API_TOKEN` environment variable. |
| `openshift_api_token`            | API Key used to access the configured OpenShift Cluster. | `setup.yaml` | maps the `OPENSHIFT_API_TOKEN` environment variable. | 
| `openshift_api_cluster_hostname` | Hostname of the OpenShift cluster API Server. | `setup.yaml` | `api.ros2.sl.cloud9.ibm.com` |
| `openshift_api_cluster_port`     | Port on the OpenShift cluster where the API Server is listening. | `setup.yaml` | `6443` |
| `openshift_api_cluster_endpoint` | Endpoint of the OpenShift cluster API server. | `setup.yaml` | composed as `https://{{hostname}}:{{port}}` with the above. |


__NOTE__: please ensure to setup the environment variables: `ARTIFACTORY_API_KEY` and `OPENSHFT_API_TOKEN` to the corresponding authentication tokens before running the playbooks. These are only needed by the `setup.yaml` playbook.
