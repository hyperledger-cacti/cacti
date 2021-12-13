import "jest-extended";

import { envNodeToDocker } from "../../../../main/typescript/public-api";
import { envMapToDocker } from "../../../../main/typescript/public-api";
import { envNodeToMap } from "../../../../main/typescript/public-api";

describe("test-tooling#envMapToDocker()", () => {
  test("Empty Map", () => {
    expect(envMapToDocker(new Map())).toBeArrayOfSize(0);
  });

  test("Non-empty Map", () => {
    const data = new Map();
    data.set("X", "Y");
    const out = envMapToDocker(data);
    expect(out).toBeArrayOfSize(1);
    expect(out[0]).toEqual("X=Y");
  });
});

describe("test-tooling#envNodeToDocker()", () => {
  test("Empty POJO", () => {
    expect(envNodeToDocker({})).toBeArrayOfSize(0);
  });

  test("Non-empty POJO", () => {
    const data = { X: "Y" };
    const out = envNodeToDocker(data);
    expect(out).toBeArrayOfSize(1);
    expect(out[0]).toEqual("X=Y");
  });
});

describe("test-tooling#envNodeToMap()", () => {
  test("Empty POJO", () => {
    const out = envNodeToMap({});
    expect(out).toBeTruthy();
    expect(out).toBeInstanceOf(Map);
    expect(out.size).toStrictEqual(0);
  });

  test("Non-empty POJO", () => {
    const data = { X: "Y" };
    const out = envNodeToMap(data);
    expect(out).toBeTruthy();
    expect(out).toBeInstanceOf(Map);
    expect(out.size).toStrictEqual(1);
    expect(out.get("X")).toStrictEqual("Y");
  });
});
