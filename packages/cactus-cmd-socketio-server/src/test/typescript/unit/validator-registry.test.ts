/* verifier/validator-registry.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

import "jest-extended";
import { dump } from "js-yaml";

import { readFileSync } from "fs";
jest.mock("fs");

jest.mock("../../../main/typescript/routing-interface/util/ConfigUtil");
import { ValidatorRegistry } from "../../../main/typescript/verifier/validator-registry";

//////////////////////////
// UNIT TESTS
/////////////////////////

test("ValidatorRegistry constructor parses required fields", () => {
  // Setup config file mock
  const mockLedgerPluginInfo = {
    validatorID: "abc123",
    validatorType: "socketio",
    validatorURL: "https://localhost:1234",
    validatorKeyPath: "./path/to/validator/key.crt",
    ledgerInfo: {
      ledgerAbstract: "Test ledger input",
    },
    apiInfo: [
      {
        apiType: "getNumericBalance",
        requestedData: [
          {
            dataName: "referedAddress",
            dataType: "string",
          },
        ],
      },
    ],
  };

  const mockSignTxInfo = {
    ethereum: {
      chainName: "chain",
      networkID: "123",
      chainID: "123",
      network: "testNet",
      hardfork: "foo",
    },
    fabric: {
      mspID: "id",
      peers: [
        {
          name: "peer.test.com",
          requests: "grpc://localhost/1234",
        },
      ],
      orderer: {
        URL: "grpc://localhost/1234",
      },
      ca: {
        name: "myca.test.com",
        URL: "http://localhost/1234",
      },
      submitter: {
        name: "admin",
        secret: "password",
      },
      channelName: "channel",
      chaincodeID: "chainId",
    },
  };

  const mockConfigObj = {
    ledgerPluginInfo: mockLedgerPluginInfo,
    signTxInfo: mockSignTxInfo,
  };

  const pathToConfig = "/foo/bar/path/config.txt";

  // Setup mock return
  (readFileSync as jest.Mock).mockReturnValue(dump(mockConfigObj));

  // Act
  const sut = new ValidatorRegistry(pathToConfig);

  // Assert
  expect(sut).toBeTruthy();
  expect(sut.ledgerPluginInfo).toEqual(mockLedgerPluginInfo);
  expect(sut.signTxInfo).toEqual(mockSignTxInfo);
  expect(readFileSync).toBeCalledWith(pathToConfig, "utf8");
});

test("ValidatorRegistry constructor fails on malformed config data", () => {
  // Setup mock return
  (readFileSync as jest.Mock).mockReturnValue(dump("foo bar baz"));

  // Act
  const sut = new ValidatorRegistry("/foo/bar/path/config.txt");

  // Assert
  // TODO BUG? Shouldn't throw an error instead of silently setting undefined?
  expect(sut).toBeTruthy();
  expect(sut.ledgerPluginInfo).toBeUndefined();
  expect(sut.signTxInfo).toBeUndefined();
});
