import { CantonLedgerError } from "../../../main/typescript/canton-ledger-error";
import {
  VALID_COMMAND,
  createSdkMock,
  createConnector,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: ledger-errors", () => {
  describe("Canton ledger errors", () => {
    test.each([
      { grpcCodeValue: 3, code: "INVALID_ARGUMENT", status: 400 },
      { grpcCodeValue: 7, code: "PERMISSION_DENIED", status: 403 },
      { grpcCodeValue: 5, code: "CONTRACT_NOT_FOUND", status: 404 },
      { grpcCodeValue: 6, code: "DUPLICATE_COMMAND", status: 409 },
      { grpcCodeValue: 9, code: "INCONSISTENT", status: 409 },
      { grpcCodeValue: 11, code: "OFFSET_AFTER_LEDGER_END", status: 400 },
      { grpcCodeValue: 10, code: "SUBMISSION_ALREADY_IN_FLIGHT", status: 503 },
      { grpcCodeValue: 14, code: "SERVICE_NOT_RUNNING", status: 503 },
      { grpcCodeValue: 16, code: "UNAUTHENTICATED", status: 502 },
      { grpcCodeValue: undefined, code: "SOMETHING_ELSE", status: 502 },
    ])(
      "maps $code (gRPC $grpcCodeValue) to HTTP $status",
      async ({ grpcCodeValue, code, status }) => {
        const sdk = createSdkMock();
        jest.mocked(sdk.ledger.internal.submit).mockRejectedValue({
          code,
          cause: "Alice::1220 must-not-leak",
          context: { secret: "must-not-leak" },
          errorCategory: 1,
          grpcCodeValue,
        });
        const connector = createConnector({
          create: jest.fn().mockResolvedValue(sdk),
        });

        const error = await connector
          .transact({
            partyId: "Alice::1220",
            commandId: "command-1",
            commands: [VALID_COMMAND],
          })
          .catch((rejection: unknown) => rejection);

        expect(error).toBeInstanceOf(CantonLedgerError);
        expect(error).toMatchObject({
          statusCode: status,
          cantonErrorCode: code,
        });
        expect(JSON.stringify(error)).not.toContain("must-not-leak");
        expect((error as Error).message).not.toContain("must-not-leak");
      },
    );

    test("marks a ledger deadline on a transaction as an unknown outcome", async () => {
      const sdk = createSdkMock();
      jest.mocked(sdk.ledger.internal.submit).mockRejectedValue({
        code: "REQUEST_TIME_OUT",
        cause: "deadline",
        context: {},
        errorCategory: 3,
        grpcCodeValue: 4,
      });
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });

      await expect(
        connector.transact({
          partyId: "Alice::1220",
          commandId: "command-1",
          commands: [VALID_COMMAND],
        }),
      ).rejects.toMatchObject({
        statusCode: 504,
        message: expect.stringMatching(/outcome is unknown/),
      });
    });

    test("leaves non-Canton failures for the opaque 502 handler", async () => {
      const sdk = createSdkMock();
      const failure = new Error("socket hang up");
      jest.mocked(sdk.party.list).mockRejectedValue(failure);
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });

      await expect(connector.listParties()).rejects.toBe(failure);
    });
  });
});
