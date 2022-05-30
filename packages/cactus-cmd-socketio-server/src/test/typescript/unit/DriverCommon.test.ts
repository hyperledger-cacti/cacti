/* verifier/DriverCommon.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

import "jest-extended";

jest.mock("../../../main/typescript/routing-interface/util/ConfigUtil");
import * as DriverCommon from "../../../main/typescript/verifier/DriverCommon";

//////////////////////////
// UNIT TESTS
/////////////////////////

test("json2str return stringified JSON", () => {
  const input = {
    testKey: "testVal",
    listing: [
      {
        abc: 123,
        cba: 321,
      },
    ],
  };

  expect(DriverCommon.json2str(input)).toEqual(JSON.stringify(input));
});

test("json2str return null when given wrong input", () => {
  // Circular reference input
  const input = {};
  (input as any)["field"] = input;
  expect(DriverCommon.json2str(input)).toBeNull();

  // Undefined input
  // TODO - BUG? Returns undefined
  // expect(DriverCommon.json2str(undefined)).toBeNull();
});
