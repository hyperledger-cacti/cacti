const { createLogger, format, transports } = require('winston');
const config = require('../config/config');

const { combine, timestamp, label, printf, colorize, align, splat } = format;

const loggsFormat = printf(info => {
  const ts = info.timestamp.slice(0, 19).replace('T', ' ');
  return `${ts} ${info.level} ${info.label}: ${info.message}`;
});

const Logger = fileName => {
  let level = 'info';
  if (config.env === 'development') {
    level = 'debug';
  }
  const consoleLoger = new transports.Console({
    level,
    format: combine(colorize(), timestamp(), align(), label({ label: fileName }), splat(), loggsFormat),
  });
  const processId = process.argv[2] === undefined ? 'def' : process.argv[2];
  const fileLoger = new transports.File({
    filename: `logs/combined_${processId}.log`,
    level: 'debug',
    maxsize: 5242880, // 5 mb
    maxFiles: 2,
    format: combine(colorize(), timestamp(), align(), label({ label: fileName }), splat(), loggsFormat),
  });
  const transportsArray = [fileLoger];
  if (process.env.NODE_ENV !== 'test') {
    transportsArray.push(consoleLoger);
  }
  const logger = createLogger({
    transports: transportsArray,
  });
  return logger;
};

module.exports = Logger;

// {
//   error: 0,
//   warn: 1,
//   info: 2,
//   verbose: 3,
//   debug: 4,
//   silly: 5
// }
