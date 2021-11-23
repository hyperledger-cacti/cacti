class DummyPlugin {
  onPluginInit() {
    console.log("DummyPlugin#onPluginInit() OK");
    return Promise.resolve();
  }
  getInstanceId() {
    console.log("DummyPlugin#getInstanceId() OK");
    return "dummy_instance_id";
  }
  getPackageName() {
    console.log("DummyPlugin#getPackageName() OK");
    return "@hyperledger/cactus-dummy-package";
  }
}

class DummyPluginFactory {
  create() {
    return Promise.resolve(new DummyPlugin());
  }
}

module.exports.createPluginFactory = (options) => {
  return Promise.resolve(new DummyPluginFactory(options));
};
