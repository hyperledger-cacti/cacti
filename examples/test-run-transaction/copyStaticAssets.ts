/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */

import * as shell from "shelljs";

// NOTE: Copy the static assets to the dist folder.
//      Example:
//        shell.cp('-R', 'src/routing-interface/views', 'dist/routing-interface/views/');
shell.cp("-R", "config/default.yaml", "/etc/cactus/");
shell.cp("-R", "config/usersetting.yaml", "/etc/cactus/");
