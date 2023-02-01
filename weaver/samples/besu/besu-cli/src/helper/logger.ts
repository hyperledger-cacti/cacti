/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as winston from 'winston'
import * as path from 'path'
const { format, transports } = winston

const logFormat = format.printf(
  info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
)

const logger = winston.createLogger({
  format: format.combine(
    format.label({ label: path.basename(process.mainModule.filename) }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat)
    })
  ],
  exitOnError: false
})

export default logger
