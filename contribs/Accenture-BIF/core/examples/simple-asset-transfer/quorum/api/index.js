// config should be imported before importing any other file
const config = require('./config/config');
const { app, server } = require('./config/express');

const port = process.argv[2] || config.app.port;

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.info(`Server started on port: ${port} (${config.env})`);
  });
}

module.exports = app;
