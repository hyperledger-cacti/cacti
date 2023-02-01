/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper, getKeyAndCertForRemoteRequestbyUserName } from '../../helpers/fabric-functions'
import logger from '../../helpers/logger'
import { Utils, ICryptoKey } from 'fabric-common'
import { commandHelp, getNetworkConfig, handlePromise } from '../../helpers/helpers'
import { EventsManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import { EventSubscriptionState, EventType } from "@hyperledger-labs/weaver-protos-js/common/events_pb";
import * as fs from 'fs'
import * as path from 'path'
import * as express from 'express';
import * as bodyParser from 'body-parser';

const command: GluegunCommand = {
  name: 'receive',
  alias: ['-r'],
  description: 'Start simple http server to receive event',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli event receive --port=8080"`,
        'fabric-cli event receive --port=<port_num>',
        [
            {
                name: '--network',
                description:
                    'Local network for command. <network1|network2>'
            },
            {
                name: '--port',
                description:
                    'Port at which to start http server (Optional). Default: 8080'
            },
            {
                name: '--debug',
                description:
                    'Shows debug logs when running. Disabled by default. To enable --debug=true'
            }
        ],
        command,
        ['event', 'receive']
      )
      return
    }
    console.log("Start HTTP Server for handling events from remote network")
    if (options.debug === 'true') {
        logger.level = 'debug'
        logger.debug('Debugging is enabled')
    }
    var port = 8080
    if (options.port) {
        port = options.port
    }
    
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    
    app.post('/simple-event-callback', (req, res) => {
        console.log("Received Event State: ", req.body.state)
        if (req.body.state) {
            const data = Buffer.from(req.body.state.View.data).toString('utf8');
            console.log("Received Event Data:", data);
        } else {
            console.log("Received Error Event:", req.body.error);
        }
        res.status(200).send('Ok');
    });
    console.log(`Server is running at https://localhost:${port}`);
    console.log(`Use endpoint '/simple-event-callback' for event publishing`);
    await app.listen(port);
  }
}


module.exports = command
