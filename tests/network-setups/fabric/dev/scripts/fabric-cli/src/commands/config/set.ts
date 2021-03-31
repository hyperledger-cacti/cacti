import { GluegunCommand } from 'gluegun'
import { commandHelp, configKeys } from '../../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'set',
  description: 'Set env variables for the fabric-cli',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli config set MEMBER_CREDENTIAL_FOLDER path/dlt-interoperability/fabric-testnet/organizations`,
        `fabric-cli config set <${configKeys.join('|')}> <value>`,
        [],
        command,
        ['config', 'set']
      )
      return
    }
    if (array.length < 3 || array.length > 3) {
      print.error('Incorrect number of arguments')
      return
    }
    if (!configKeys.includes(array[1])) {
      print.error('Invalid env key')
      print.info(`Valid keys:  ${configKeys}`)
      return
    }

    print.info('Reading config.json file')
    const configPath = path.resolve(
      process.env.CONFIG_PATH ? process.env.CONFIG_PATH : __dirname,
      '..',
      '..',
      '..',
      'config.json'
    )
    !fs.existsSync(configPath) &&
      fs.writeFileSync(configPath, '', { flag: 'wx' })
    const file = JSON.parse(fs.readFileSync(configPath).toString())
    if (file[array[0]]) {
      file[array[0]][array[1]] = array[2]
    } else {
      file[array[0]] = {
        [array[0]]: {
          [array[1]]: array[2]
        }
      }
    }
    fs.writeFileSync(configPath, JSON.stringify(file))
    print.info(`Updated File:\n${JSON.stringify(file)}`)
  }
}

module.exports = command
