const fs = require('fs');
const logger = require('../utils/logger')('fsHandler');

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      const curPath = `${path}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recursion
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function createFolderIfNotExists(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, err => {
      if (err) {
        if (err.code === 'EEXIST') {
          resolve();
        } else {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  });
}

function saveObjectToJsonFile(pathToFile, object) {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(object, null, 2);
    fs.writeFile(pathToFile, jsonData, 'utf8', (err, data) => {
      if (err) {
        logger.log('debug', 'Error writing json file! %s %s', pathToFile, err);
        reject(err);
      } else {
        logger.log('debug', 'Successfully writing json file! %s', pathToFile);
        resolve(data);
      }
    });
  });
}

function readObjectFromJsonFile(pathToFile) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(pathToFile)) {
      fs.readFile(pathToFile, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          logger.log('debug', 'Error reading json file!  %s %s', pathToFile, err);
        } else {
          const object = JSON.parse(data);
          logger.log('debug', 'Successfully reading json file! %s', pathToFile);
          resolve(object);
        }
      });
    } else {
      reject();
    }
  });
}

function readFile(pathToFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(pathToFile, 'utf8', (err, fileData) => {
      if (err) {
        reject(err);
      } else {
        resolve(fileData);
      }
    });
  });
}

function removeFile(pathToFile) {
  return new Promise((resolve, reject) => {
    fs.unlink(pathToFile, err => {
      if (err) {
        reject(err);
      }
      logger.log('debug', 'Successfully deleting file', pathToFile);
      resolve();
    });
  });
}

function pipeWriteStreamToFile(filePath, data) {
  return new Promise((resolve, reject) => {
    const file = data.pipe(fs.createWriteStream(filePath));
    file.on('finish', () => {
      resolve(true);
    });
    file.on('error', reject);
  });
}

module.exports = {
  deleteFolderRecursive,
  createFolderIfNotExists,
  saveObjectToJsonFile,
  readObjectFromJsonFile,
  readFile,
  removeFile,
  pipeWriteStreamToFile,
};
