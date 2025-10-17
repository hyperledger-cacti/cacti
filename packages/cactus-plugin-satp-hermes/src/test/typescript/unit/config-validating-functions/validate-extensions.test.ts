import "jest-extended";
import { ExtensionType } from "../../../../main/typescript/extensions/extensions-utils";
import { validateExtensions } from "../../../../main/typescript/services/validation/config-validating-functions/validate-extensions";

describe("Validate CC Config", () => {
  it("should pass with a valid cc config (extensionsConfig)", async () => {
    const extensionsConfig = [
      {
        name: ExtensionType.CARBON_CREDIT,
        networksConfig: [
          {
            network_name: "Polygon",
            rpc_url: "http://localhost:8545",
          },
          {
            network_name: "Celo",
            rpc_url: "http://localhost:8546",
          },
        ],
        signingCredential: {
          ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
          secret: "test",
          type: "PRIVATE_KEY_HEX",
        },
      },
    ];
    const result = validateExtensions({ configValue: extensionsConfig });
    expect(result).toBeArray();
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject(extensionsConfig[0]);
  });

  it("should return undefined when config is undefined", async () => {
    const result = validateExtensions({ configValue: undefined });
    expect(result).toBeUndefined();
  });

  it("should throw an error when config is not an array", async () => {
    expect(() => {
      validateExtensions({ configValue: {} });
    }).toThrow(TypeError);
  });

  it("should return undefined when no valid extension is found", async () => {
    const extensionsConfig = [
      {
        name: "INVALID_EXTENSION_NAME",
        networksConfig: [
          {
            network_name: "Polygon",
            rpc_url: "http://localhost:8545",
          },
        ],
        signingCredential: {
          ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
          secret: "test",
          type: "PRIVATE_KEY_HEX",
        },
      },
    ];
    const result = validateExtensions({ configValue: extensionsConfig });
    expect(result).toBeUndefined();
  });

  it("should return undefined when extension has invalid networksConfig", async () => {
    const extensionsConfig = [
      {
        name: ExtensionType.CARBON_CREDIT,
        networksConfig: [
          {
            network_name: "Polygon",
            rpc_url: "",
          },
        ],
        signingCredential: {
          ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
          secret: "test",
          type: "PRIVATE_KEY_HEX",
        },
      },
    ];
    const result = validateExtensions({ configValue: extensionsConfig });
    expect(result).toBeUndefined();
  });

  it("should return undefined when extension has invalid signingCredential", async () => {
    const extensionsConfig = [
      {
        name: ExtensionType.CARBON_CREDIT,
        networksConfig: [
          {
            network_name: "Polygon",
            rpc_url: "http://localhost:8545",
          },
        ],
        signingCredential: {
          ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
          secret: "test",
          type: "INVALID_TYPE",
        },
      },
    ];
    const result = validateExtensions({ configValue: extensionsConfig });
    expect(result).toBeUndefined();
  });
});
