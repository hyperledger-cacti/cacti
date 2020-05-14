module.exports = (_, options) => {
  return require(`./webpack.${options.env}.${options.target}.js`);
};
