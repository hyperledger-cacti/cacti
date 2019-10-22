'use strict';
const fs = require('fs');
const uuid = require('uuid');
const homedir = require('home-dir');
const config = require('./config');

const PATH = homedir('/.indy_client/' + config.walletName + '_store.json');
const BASE = JSON.stringify({
  pendingMessages: [],
  pendingRelationships: [],
  pendingCredentialOffers: [],
  pendingCredentialRequests: [],
  pendingProofRequests: [],
});

let store;

function init() {
  if (!store) {
    if (!fs.existsSync(PATH)) {
      fs.writeFileSync(PATH, BASE);
    }
    store = JSON.parse(fs.readFileSync(PATH));
  }
}

function syncChanges() {
  fs.writeFileSync(PATH, JSON.stringify(store));
}

exports.clear = function() {
  store.messages.clear();
  store.pendingRelationships.clear();
};

exports.messages = {
  getAll: function() {
    init();
    return store.pendingMessages;
  },
  write: function(did, message) {
    init();
    let id = uuid();
    store.pendingMessages.push({
      id: id,
      timestamp: new Date(),
      did: did,
      message: message,
    });
    syncChanges();
    return id;
  },
  clear: function() {
    init();
    store.pendingMessages = [];
    syncChanges();
  },
  getMessage: function(id) {
    init();
    for (let message of store.pendingMessages) {
      if (message.id === id) {
        return message;
      }
    }
    return null;
  },
  deleteMessage: function(id) {
    init();
    for (let i = 0; i < store.pendingMessages.length; i++) {
      if (store.pendingMessages[i].id === id) {
        store.pendingMessages.splice(i, 1);
      }
    }
    syncChanges();
  },
};

exports.pendingRelationships = {
  getAll: function() {
    init();
    return store.pendingRelationships;
  },
  write: function(myNewDid, theirEndpointDid, nonce) {
    init();
    store.pendingRelationships.push({
      id: uuid(),
      timestamp: new Date(),
      myNewDid: myNewDid,
      theirEndpointDid: theirEndpointDid,
      nonce: nonce,
    });
    syncChanges();
  },
  delete: function(id) {
    init();
    for (let i = 0; i < store.pendingRelationships.length; i++) {
      if (store.pendingRelationships[i].id === id) {
        store.pendingRelationships.splice(i, 1);
        break;
      }
    }
    syncChanges();
  },
  clear: function() {
    init();
    store.pendingRelationships = [];
    syncChanges();
  },
};

exports.pendingCredentialOffers = {
  getAll: function() {
    init();
    return store.pendingCredentialOffers;
  },
  write: function(credOffer) {
    init();
    let id = uuid();
    store.pendingCredentialOffers.push({
      id: id,
      offer: credOffer,
    });
    syncChanges();
    return id;
  },
  clear: function() {
    init();
    store.pendingCredentialOffers = [];
    syncChanges();
  },
  get: function(id) {
    init();
    for (let message of store.pendingCredentialOffers) {
      if (message.id === id) {
        return message;
      }
    }
    return null;
  },
  delete: function(id) {
    init();
    for (let i = 0; i < store.pendingCredentialOffers.length; i++) {
      if (store.pendingCredentialOffers[i].id === id) {
        store.pendingCredentialOffers.splice(i, 1);
      }
    }
    syncChanges();
  },
};

exports.pendingCredentialRequests = {
  getAll: function() {
    init();
    return store.pendingCredentialRequests;
  },
  write: function(credRequestJson, credRequestMetadataJson) {
    init();
    let id = uuid();
    store.pendingCredentialRequests.push({
      id: id,
      credRequestJson: credRequestJson,
      credRequestMetadataJson: credRequestMetadataJson,
    });
    syncChanges();
    return id;
  },
  clear: function() {
    init();
    store.pendingCredentialRequests = [];
    syncChanges();
  },
  get: function(id) {
    init();
    for (let message of store.pendingCredentialRequests) {
      if (message.id === id) {
        return message;
      }
    }
    return null;
  },
  delete: function(id) {
    init();
    for (let i = 0; i < store.pendingCredentialRequests.length; i++) {
      if (store.pendingCredentialRequests[i].id === id) {
        store.pendingCredentialRequests.splice(i, 1);
      }
    }
    syncChanges();
  },
};

exports.pendingProofRequests = {
  getAll: function() {
    init();
    return store.pendingProofRequests;
  },
  write: function(proofRequest) {
    init();
    let id = uuid();
    store.pendingProofRequests.push({
      id: id,
      proofRequest: proofRequest,
    });
    syncChanges();
    return id;
  },
  clear: function() {
    init();
    store.pendingProofRequests = [];
    syncChanges();
  },
  get: function(id) {
    init();
    for (let message of store.pendingProofRequests) {
      if (message.id === id) {
        return message;
      }
    }
    return null;
  },
  delete: function(id) {
    init();
    for (let i = 0; i < store.pendingProofRequests.length; i++) {
      if (store.pendingProofRequests[i].id === id) {
        store.pendingProofRequests.splice(i, 1);
      }
    }
    syncChanges();
  },
};
