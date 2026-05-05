import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  checkConfigElementFormat,
  chainConfigElement,
} from "../../../../main/typescript/services/utils";

const log = LoggerProvider.getOrCreate({
  level: "DEBUG",
  label: "utils.test.ts",
});

describe("for...of early return regression", () => {
  it("positive: valid array elements pass validation", () => {
    const config: Record<string, any> = {
      names: ["alice", "bob", "charlie"],
    };
    const element: chainConfigElement<string> = {
      configElement: "names",
      configElementType: "object",
      configSubElementType: "string",
    };

    const result = checkConfigElementFormat(element, config, log, "test");
    expect(result).toBe(true);
  });

  it("negative: invalid array element causes early return", () => {
    const config: Record<string, any> = {
      names: ["alice", 456, "charlie"],
    };
    const element: chainConfigElement<string> = {
      configElement: "names",
      configElementType: "object",
      configSubElementType: "string",
    };

    const result = checkConfigElementFormat(element, config, log, "test");
    expect(result).toBe(false);
  });
});
