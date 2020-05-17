// tslint:disable: max-classes-per-file
// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { Objects } from "../../../../main/typescript/public-api";

class Base {
  private readonly y: string;

  constructor() {
    this.y = "y";
  }

  getX() {
    return "x";
  }
}

class A extends Base {
  private readonly b: string;

  constructor() {
    super();
    this.b = "b";
  }

  getA() {
    return "a";
  }
}

tap.test("handles inheritance correctly", (assert: any) => {
  const a = new A();
  const methodNames = Objects.getAllMethodNames(a);
  assert.ok(Array.isArray(methodNames), "expect an arran of strings returned");
  assert.ok(
    methodNames.length === 2,
    "expect two items in said array of strings"
  );
  assert.ok(
    methodNames.includes("getX"),
    'expect "getX" in said array of strings'
  );
  assert.ok(
    methodNames.includes("getA"),
    'expect "getA" in said array of strings'
  );
  assert.end();
});
