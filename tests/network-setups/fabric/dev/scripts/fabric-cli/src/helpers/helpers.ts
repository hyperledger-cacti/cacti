import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import { GluegunPrint } from 'gluegun/build/types/toolbox/print-types'
import { invoke, Query } from './fabric-functions'
import * as crypto from 'crypto'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import logger from './logger'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Valid keys for .env
const validKeys = [
  'DEFAULT_CHANNEL',
  'DEFAULT_CHAINCODE',
  'MEMBER_CREDENTIAL_FOLDER',
  'LOCAL'
]
// Valid keys for config
const configKeys = ['connProfilePath', 'relayEndpoint']

const signMessage = (message, privateKey) => {
  const sign = crypto.createSign('sha256')
  sign.write(message)
  sign.end()
  return sign.sign(privateKey)
}
// Basic function to add data to network, it assumes function is CREATE
const addData = ({
  filename,
  networkName,
  connProfilePath,
  query,
  mspId = global.__DEFAULT_MSPID__,
  logger
}: {
  filename: string
  networkName: string
  connProfilePath: string
  query?: Query
  mspId?: string
  logger?: any
}): void => {
  const filepath = path.resolve(__dirname, '..', 'data', filename)
  const data = JSON.parse(fs.readFileSync(filepath).toString())
  const valuesList = Object.entries(data)
  valuesList.forEach((item: [string, string]) => {
    const currentQuery = query
      ? query
      : {
          channel: process.env.DEFAULT_CHANNEL
            ? process.env.DEFAULT_CHANNEL
            : 'mychannel',
          contractName: process.env.DEFAULT_APPLICATION_CHAINCODE
            ? process.env.DEFAULT_APPLICATION_CHAINCODE
            : 'simplestate',
          ccFunc: 'Create',
          args: []
        }
    currentQuery.args = [...currentQuery.args, item[0], item[1]]
    invoke(currentQuery, connProfilePath, networkName, mspId, logger)
  })
}

// Custom Command help is to generate the help text used when running --help on a command. 
// 1. If usage string is provided print usage section
// 2. if example string is provided print example section
// 3. if options list has options provided print options section
// 4. If there are subcommands it will print subcommands, this uses the commandRoot array where each item are the commands in order.
// Logic is also in place to fix spacing based on length. 
const commandHelp = (
  print: GluegunPrint,
  toolbox: Toolbox,
  exampleString: string,
  usageString: string,
  optionsList: { name: string; description: string }[],
  command: GluegunCommand,
  commandRoot: string[]
): void => {
  print.info(command.description)
  print.info('')
  // 1
  if (usageString) {
    print.info(toolbox.print.colors.bold('USAGE'))
    print.info('')
    print.info(usageString)
    print.info('')
  }
  // 2
  if (exampleString) {
    print.info(toolbox.print.colors.bold('EXAMPLE'))
    print.info('')
    print.info(`$ ${exampleString}`)
    print.info('')
  }
  // 3
  if (optionsList.length > 0) {
    // To calculate how long each title should be to make the formatting consistent
    const spaces = optionsList.reduce((acc, val) => {
      const stringLength = val.name.length
      if (stringLength > acc) {
        return stringLength
      } else {
        return acc
      }
    }, 0)
    print.info(toolbox.print.colors.bold('OPTIONS'))
    print.info('')
    optionsList.forEach(command => {
      const val = spaces - command.name.length
      const numberOfSpaces = val > 0 ? val : 0
      toolbox.print.info(
        `${command.name} ${Array(numberOfSpaces)
          .fill('\xa0')
          .join('')} ${command.description}`
      )
    })
    print.info('')
  }
  // 4
  toolbox.print.info(toolbox.print.colors.bold('COMMANDS'))
  toolbox.print.printCommands(toolbox, commandRoot)
  toolbox.print.info('')
}

// Custom Help is used as the default help when running --help on no commands.
// filters out subcommands by using the root of each toplevel command and filters them out. When adding a command it will need to be added to the array to filter out. 
const customHelp = (toolbox: Toolbox): void => {
  toolbox.print.info(toolbox.print.colors.bold('VERSION'))
  toolbox.print.info('')
  toolbox.print.info(
    toolbox.print.colors.cyan(`  fabric-cli/${toolbox.meta.version()}`)
  )
  toolbox.print.info('')
  toolbox.print.info(toolbox.print.colors.bold('COMMANDS'))
  toolbox.print.info('')
  // Filter out commands that shouldn't be listed
  const commandList = toolbox.plugin.commands
    .filter(
      command =>
        !command.commandPath.includes('chaincode') &&
        !command.commandPath.includes('interop') &&
        !command.commandPath.includes('relay') &&
        !command.commandPath.includes('configure') &&
        !command.commandPath.includes('fabric-cli') &&
        !command.commandPath.includes('env') &&
        !command.commandPath.includes('helper') &&
        !command.commandPath.includes('config')
    )
    // Maps commands to include alias in title
    .map(command => {
      const aliasesString =
        command.aliases.length > 0 ? `(${command.aliases.join(',')})` : ''
      const commandTitle = `  ${command.name} ${aliasesString}`

      return {
        commandTitle,
        description: command.description ? command.description : '-'
      }
    })
  // To calculate how long each title should be to make the formatting consistent
  const spaces = commandList.reduce((acc, val) => {
    const stringLength = val.commandTitle.length
    if (stringLength > acc) {
      return stringLength
    } else {
      return acc
    }
  }, 0)
  commandList.forEach(command => {
    const val = spaces - command.commandTitle.length
    const numberOfSpaces = val > 0 ? val : 0
    toolbox.print.info(
      `${command.commandTitle} ${Array(numberOfSpaces)
        .fill('\xa0')
        .join('')} ${command.description}`
    )
  })
  toolbox.print.info('')
}

// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
  const result: Promise<[T?, Error?]> = promise
    .then(data => {
      const response: [T?, Error?] = [data, undefined]
      return response
    })
    .catch(error => Promise.resolve([undefined, error]))
  return result
}

// Necessary until gRPC provides a native async friendly solution https://github.com/grpc/grpc-node/issues/54
function promisifyAll(client): any {
  const to = {}
  for (const k in client) {
    if (typeof client[k] != 'function') continue
    to[k] = promisify(client[k].bind(client))
  }
  return to
}

const readJSONFromFile = (jsonfile, logger = console) => {
  let data = null
  const filepath = path.resolve(jsonfile)
  logger.debug('jsonfile is ' + jsonfile)
  logger.debug('filepath is ' + filepath)

  try {
    const contents = fs.readFileSync(filepath).toString()
    logger.debug('contents ' + contents)
    data = JSON.parse(contents)
    logger.debug('data - ' + JSON.stringify(data))
  } catch (e) {
    logger.debug('Error ' + e.message + ' while parsing JSON config file')
    throw e
  }
  return data
}

// Used for getting network configuration from config.json file.
const getNetworkConfig = (
  networkId: string
): { relayEndpoint: string; connProfilePath: string; username?: string } => {
  const configPath = process.env.CONFIG_PATH
    ? path.join(process.env.CONFIG_PATH)
    : path.join(__dirname, '../../config.json')
  try {
    const configJSON = JSON.parse(fs.readFileSync(configPath).toString())
    if (!configJSON[networkId]) {
      logger.error(
        `Network: ${networkId} does not exist in the config.json file`
      )
      return { relayEndpoint: '', connProfilePath: '', username: '' }
    }
    return configJSON[networkId]
  } catch (err) {
    logger.error(`Network: ${networkId} does not exist in the config.json file`)
    return { relayEndpoint: '', connProfilePath: '', username: '' }
  }
}
export {
  commandHelp,
  customHelp,
  addData,
  handlePromise,
  promisifyAll,
  readJSONFromFile,
  signMessage,
  getNetworkConfig,
  validKeys,
  configKeys
}
