<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Welcome

This repository contains the configurations of the business networks used to test and demonstrate the interoperability protocol in various environment (local, test, ...). The repository contains both the configuration and the scripting logic that is necessary to bring the environments up with a desired configuration.

## Structure and Layout

The repository is organised in different folder for each environment, plus a shared folder that contains the common artifacts and scripts that are used across environments (e.g. these could be the crypto material or any other configuration settins and script that are of use in more than one environment).

- the `shared` folder contains the common artifacts and scripts.
- the `dev` folder contains the configuration and setup for the local environments.
- the `test` folder contqins the configuration and setup for the integration test environment.

More folders can be added as the time passes if we do support multiple environment.


