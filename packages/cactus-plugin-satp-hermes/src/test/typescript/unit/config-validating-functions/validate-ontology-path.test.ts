import "jest-extended";
import path from "path";
import { validateOntologyPath } from "../../../../main/typescript/services/validation/config-validating-functions/validate-ontology-path";

describe("validateOntologyPath", () => {
  it("should pass when the path exists and is a directory", () => {
    const validPath = path.resolve(__dirname, "../../../../test/ontologies");
    const result = validateOntologyPath({
      configValue: validPath,
    });
    expect(result).toEqual(validPath);
  });

  it("should fail when the path exists and is a file", () => {
    const invalidPath = path.resolve(
      __dirname,
      "../../../../test/ontologies/ontology-satp-erc20-interact-besu.json",
    );
    expect(() =>
      validateOntologyPath({
        configValue: invalidPath,
      }),
    ).toThrowError(
      `Invalid config.ontologyPath: ${invalidPath}. Directory does not exist or is not a folder.`,
    );
  });

  it("should fail when the path does not exist or is not a file", () => {
    const invalidPath = "/invalid/path";
    expect(() =>
      validateOntologyPath({
        configValue: invalidPath,
      }),
    ).toThrowError(
      `Invalid config.ontologyPath: ${invalidPath}. Directory does not exist or is not a folder.`,
    );
  });

  it("should throw if path is not a string", () => {
    const inValidPath = 123;
    expect(() =>
      validateOntologyPath({
        configValue: inValidPath,
      }),
    ).toThrowError(
      `Invalid config.ontologyPath: ${JSON.stringify(
        inValidPath,
      )}. Expected a string.`,
    );
  });

  it("should throw if path is an empty string", () => {
    const inValidPath = "";
    const result = validateOntologyPath({
      configValue: inValidPath,
    });
    expect(result).toEqual(undefined);
  });
});
