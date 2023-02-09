/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { build } from 'gluegun/build'
import { customHelp } from './helpers/helpers'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

declare global {
  // eslint-disable-next-line
  namespace NodeJS {
    interface Global {
      __DEFAULT_MSPID__: string
      __DEFAULT_MSPID_ORG2__: string
    }
  }
}
global.__DEFAULT_MSPID__ = process.env.DEFAULT_MSPID || 'Org1MSP'
global.__DEFAULT_MSPID_ORG2__ = process.env.DEFAULT_MSPID_ORG2 || 'Org2MSP'
/**
 * Create the cli and kick it off
 */
async function run(argv) {
  // create a CLI runtime
  const cli = build()
    .exclude(['semver', 'prompt', 'http', 'template', 'patching', 'strings'])
    .brand('fabric-cli')
    .src(__dirname)
    .plugins('./node_modules', { matching: 'fabric-cli-*', hidden: true })
    .help(customHelp)
    .version() // provides default for version, v, --version, -v
    .defaultCommand(customHelp)
    .create()
  // and run it
  const toolbox = await cli.run(argv)
  checkConfig()
  // send it back (for testing, mostly)
  return toolbox
}
const checkConfig = () => {
  const configPath = process.env.CONFIG_PATH
    ? path.join(process.env.CONFIG_PATH)
    : path.join(__dirname, '../config.json')
  try {
    const configJSON = JSON.parse(fs.readFileSync(configPath).toString())
    if (Object.keys(configJSON).length === 0) {
      console.error(
        'ERROR: config.json is not properly configured, no network configurations available. Update configuration file or use `fabric-cli config set-file <path>` to update it.'
      )
    }
  } catch (e) {
    console.error(
      'ERROR: config.json is not properly configured. Update configuration file or use `fabric-cli config set-file <path>` to update it.'
    )
  }
}
module.exports = { run }
