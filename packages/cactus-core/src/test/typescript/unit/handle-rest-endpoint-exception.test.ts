import "jest-extended";
import createHttpError from "http-errors";
import { createResponse } from "node-mocks-http";

import { safeStringifyException } from "@hyperledger/cactus-common";

import {
  handleRestEndpointException,
  IHandleRestEndpointExceptionOptions,
} from "../../../main/typescript/public-api"; // replace with the correct path to your module

import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  identifierByCodes,
  INTERNAL_SERVER_ERROR,
} from "http-errors-enhanced-cjs";

// Since we are testing error handling, lots of false positive error logs appear
// that are hard to untangle/confusing when reading the test log output.
// The SILENT level suppresses these.
const log = LoggerProvider.getOrCreate({
  label: "handle-rest-endpoint-exception.test.ts",
  level: "SILENT",
});

describe("handleRestEndpointException", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle HttpError with statusCode gte 500", async () => {
    const mockResponse = createResponse();

    const rootCauseErrorMsg = "Root Cause Exception that should cause gte 500";
    const rootError = new Error(rootCauseErrorMsg);

    const reThrowErrorMsg =
      "Message of the Re-thrown Exception that should have some context for debugging on top of the information already available in the rootCauseErrorMsg.";

    const ctx: IHandleRestEndpointExceptionOptions = {
      errorMsg: reThrowErrorMsg,
      log: jest.mocked(log), // Provide a mock logger if needed
      error: rootError, // Provide appropriate error objects for testing
      res: mockResponse,
    };

    const spyLog = jest.spyOn(ctx.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException(ctx);

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLog).toHaveBeenCalledWith(
      ctx.errorMsg,
      safeStringifyException(rootError),
    );

    expect(spyJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(
          identifierByCodes[INTERNAL_SERVER_ERROR],
        ),
        error: expect.stringContaining(reThrowErrorMsg),
      }),
    );

    expect(spyJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(
          identifierByCodes[INTERNAL_SERVER_ERROR],
        ),
        error: expect.stringContaining(rootCauseErrorMsg),
      }),
    );
  });

  it("should handle HttpError with statusCode < 500", async () => {
    const mockResponse = createResponse();

    const rootErrorStr = "Test HTTP 404 error";
    const mockHttpError = createHttpError(404, rootErrorStr, {
      expose: true,
    });

    const ctx: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockHttpError, // Provide appropriate error objects for testing
      res: mockResponse,
    };

    const errorAsSanitizedJson = safeStringifyException(mockHttpError);
    const spyLogError = jest.spyOn(ctx.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException(ctx);

    expect(spyStatus).toHaveBeenCalledWith(404);

    expect(spyLogError).toHaveBeenCalledWith(
      ctx.errorMsg,
      errorAsSanitizedJson,
    );

    expect(spyJson).toHaveBeenCalledWith({
      message: "NotFound",
      error: errorAsSanitizedJson,
    });
  });

  it("should handle non-HttpError", async () => {
    const mockResponse = createResponse();
    const mockError = new Error("An unexpected exception. Ha!");

    const ctx: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(ctx.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException(ctx);

    expect(spyStatus).toHaveBeenCalledWith(500);
    expect(spyLoggerFn).toHaveBeenCalledWith(ctx.errorMsg, mockErrorJson);
    expect(spyJson).toHaveBeenCalledOnce();

    const mostRecentCall = spyJson.mock.lastCall;
    expect(mostRecentCall).toBeTruthy();

    expect(mostRecentCall?.[0].message).toBeString();
    expect(mostRecentCall?.[0].message).toEqual("InternalServerError");
    expect(mostRecentCall?.[0].error).toMatch(
      /RuntimeError: Test error message(.*)An unexpected exception. Ha!/,
    );
  });

  it("should escape malicious payloads in exception messages", async () => {
    const mockResponse = createResponse();

    const dummyXssPayload = `<script>stealAndUploadPrivateKeys();</script>`;
    const mockError = new Error(dummyXssPayload);

    const ctx: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(ctx.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException(ctx);

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLoggerFn).toHaveBeenCalledWith(ctx.errorMsg, mockErrorJson);

    expect(spyJson).toHaveBeenCalledOnce();

    const mostRecentCall = spyJson.mock.lastCall;
    expect(mostRecentCall).toBeTruthy();

    expect(mostRecentCall?.[0].message).toBeString();
    expect(mostRecentCall?.[0].message).toEqual("InternalServerError");
    expect(mostRecentCall?.[0].error).toMatch(
      /RuntimeError: Test error message(.*)/,
    );
    expect(mostRecentCall?.[0].error).not.toMatch(
      /.*stealAndUploadPrivateKeys.*/,
    );
  });

  it("should escape malicious payloads in strings thrown", async () => {
    const mockResponse = createResponse();

    const dummyXssPayload = `<script>stealAndUploadPrivateKeys();</script>`;
    const mockError = dummyXssPayload;

    const ctx: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(ctx.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException(ctx);

    expect(spyStatus).toHaveBeenCalledWith(500);
    expect(spyLoggerFn).toHaveBeenCalledWith(ctx.errorMsg, mockErrorJson);
    expect(spyJson).toHaveBeenCalledOnce();

    const mostRecentCall = spyJson.mock.lastCall;
    expect(mostRecentCall).toBeTruthy();

    expect(mostRecentCall?.[0].message).toBeString();
    expect(mostRecentCall?.[0].message).toEqual("InternalServerError");
    expect(mostRecentCall?.[0].error).toMatch(
      /RuntimeError: Test error message(.*)/,
    );
    expect(mostRecentCall?.[0].error).not.toMatch(
      /.*stealAndUploadPrivateKeys.*/,
    );
  });
});
