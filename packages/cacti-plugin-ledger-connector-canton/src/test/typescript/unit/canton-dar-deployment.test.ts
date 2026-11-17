import {
  BadRequestError,
  ConflictError,
  PayloadTooLargeError,
} from "http-errors-enhanced-cjs";

import { readCantonDar } from "../../../main/typescript/dar/read-dar";
import { InvalidDarError } from "../../../main/typescript/dar/invalid-dar-error";
import {
  createDalf,
  createDarFixture,
  createZip,
} from "../canton-dar-fixtures";
import { createConnector, createSdkMock } from "../canton-test-utilities";

describe("Canton connector: DAR deployment", () => {
  function setUp(options: { readonly maxDarBytes?: number } = {}) {
    const sdk = createSdkMock();
    const connector = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      options,
    );
    return { sdk, connector };
  }

  test("uploads the DAR under the package ID derived from its main DALF", async () => {
    const { sdk, connector } = setUp();
    const { dar, packageId, name } = createDarFixture();

    const response = await connector.deployContract({
      darBase64: dar.toString("base64"),
      synchronizerId: "synchronizer-1",
    });

    expect(response).toEqual({ packageId, darName: name });
    expect(sdk.ledger.dar.upload).toHaveBeenCalledWith(
      dar,
      packageId,
      "synchronizer-1",
      true,
    );
    expect(sdk.ledger.dar.check).toHaveBeenCalledWith(packageId);
  });

  test("reports a conflict when the participant does not register the package", async () => {
    const { sdk, connector } = setUp();
    (sdk.ledger.dar.check as jest.Mock).mockResolvedValue(false);

    await expect(
      connector.deployContract({
        darBase64: createDarFixture().dar.toString("base64"),
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("rejects a DAR larger than maxDarBytes before decoding it", async () => {
    const { dar } = createDarFixture();
    const { sdk, connector } = setUp({ maxDarBytes: dar.length - 1 });

    await expect(
      connector.deployContract({ darBase64: dar.toString("base64") }),
    ).rejects.toBeInstanceOf(PayloadTooLargeError);
    expect(sdk.ledger.dar.upload).not.toHaveBeenCalled();
  });

  test.each([
    ["is not base64", "not base64!"],
    ["is not a ZIP archive", Buffer.from("not a zip").toString("base64")],
    [
      "has a DALF whose hash does not match its payload",
      createDarFixture({
        dalf: createDalf(Buffer.from("payload"), "0".repeat(64)),
      }).dar.toString("base64"),
    ],
    [
      "names a Main-Dalf that is not in the archive",
      createDarFixture({
        manifest: "Manifest-Version: 1.0\r\nMain-Dalf: missing.dalf\r\n",
      }).dar.toString("base64"),
    ],
  ])(
    "rejects a DAR that %s without contacting the ledger",
    async (_, darBase64) => {
      const { sdk, connector } = setUp();

      await expect(
        connector.deployContract({ darBase64 }),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(sdk.ledger.dar.upload).not.toHaveBeenCalled();
    },
  );
});

describe("readCantonDar", () => {
  test("rejects an entry that inflates beyond the limit despite a small declared size", () => {
    const bomb = createZip([
      {
        name: "META-INF/MANIFEST.MF",
        content: Buffer.alloc(1024 * 1024, "a"),
        declaredSize: 16,
      },
    ]);

    expect(() => readCantonDar(bomb, 1024)).toThrow(InvalidDarError);
  });

  test("rejects an archive without a manifest", () => {
    const dar = createZip([
      { name: "main.dalf", content: createDalf(Buffer.from("payload")) },
    ]);

    expect(() => readCantonDar(dar, 1024 * 1024)).toThrow(InvalidDarError);
  });
});
