/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import logger from '../helpers/logger'
import { commandHelp } from '../helpers/helpers'
import { HashFunctions } from '@hyperledger-labs/weaver-fabric-interop-sdk'

const command: GluegunCommand = {
  name: 'hash',
  description: 'Get Hash for given pre image in base64',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli hash --hash_fn=SHA256 abc`,
        'fabric-cli hash --hash_fn=<hash-function-name> --random <preimage-array-of-strings-seprated-by-space>',
        [
          {
            name: '--hash_fn',
            description:
              'hash function to be used for HTLC. Supported: SHA256, SHA512. (Optional: Default: SHA256)'
          },
          {
            name: '--random',
            description:
              'Flag to generate random preimage with hash. (Array of preimage is not required if random is set)'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['hash']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['random'] && array.length==0) {
        print.error(`Either set random flag, or provide preimage as array of strings, at end, separated by space`)
        return
    }    
    // Hash
    let hash: HashFunctions.Hash
    if(options['hash_fn'] == 'SHA512') {
        hash = new HashFunctions.SHA512()
        if(!options['random']) {
            hash.setPreimage(array[0])
        }
    } else {
        hash = new HashFunctions.SHA256()
        if(!options['random']) {
            hash.setPreimage(array[0])
        }
    }
    if(options['random'])
        hash.generateRandomPreimage(22)
        
    const hashValue = hash.getSerializedHashBase64()
    console.log(`HashValue: ${hash.getSerializedHashBase64()} \nPreimage: ${hash.getPreimage()}`)

    process.exit()
  }
}


module.exports = command
