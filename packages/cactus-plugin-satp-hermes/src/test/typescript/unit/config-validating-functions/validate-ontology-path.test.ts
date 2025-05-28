import "jest-extended";
import { validateOntologyPath } from "../../../../main/typescript/services/validation/config-validating-functions/validate-ontology-path";

describe("validateOntologyPath", () => {
  it("should pass when path exists and is a file", () => {
    const validPath = "/valid/path.ttl";
    expect(() =>
      validateOntologyPath({
        configValue: validPath,
      }),
    ).not.toThrow();
  });

  it("should throw if path is not a string", () => {
    const validPath = 123;
    expect(() =>
      validateOntologyPath({
        configValue: validPath,
      }),
    ).toThrow();
  });

  /*it("should throw if path is an empty string", () => {
    const validPath = "";
    expect(() =>
      validateOntologyPath({
        configValue: validPath,
      }),
    ).toThrow();
  });*/
});
