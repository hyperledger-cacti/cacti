/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */

import * as shell from 'shelljs';
shell.cp('-R', 'src/routing-interface/views', 'dist/routing-interface/views/');
