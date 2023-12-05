import "jest-extended";
import createHttpError from "http-errors";
import { createResponse } from "node-mocks-http";

import { safeStringifyException } from "@hyperledger/cactus-common";

import {
  handleRestEndpointException,
  IHandleRestEndpointExceptionOptions,
} from "../../../main/typescript/public-api"; // replace with the correct path to your module

import { LoggerProvider } from "@hyperledger/cactus-common";

const log = LoggerProvider.getOrCreate({
  label: "handle-rest-endpoint-exception.test.ts",
  level: "DEBUG",
});

describe("handleRestEndpointException", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle HttpError with statusCode >= 500", async () => {
    const mockResponse = createResponse();

    const mockOptions: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: new Error("Test error"), // Provide appropriate error objects for testing
      res: mockResponse,
    };

    const mockHttpError = createHttpError(500, "Test HTTP error", {
      expose: true,
    });

    const errorAsSanitizedJson = safeStringifyException(mockHttpError);
    const spyLogDebug = jest.spyOn(mockOptions.log, "debug");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException({ ...mockOptions, error: mockHttpError });

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLogDebug).toHaveBeenCalledWith(
      mockOptions.errorMsg,
      errorAsSanitizedJson,
    );

    expect(spyJson).toHaveBeenCalledWith({
      message: "InternalServerError",
      error: errorAsSanitizedJson,
    });
  });

  it("should handle HttpError with statusCode < 500", async () => {
    const mockResponse = createResponse();

    const mockOptions: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: new Error("Test error"), // Provide appropriate error objects for testing
      res: mockResponse,
    };

    const mockHttpError = createHttpError(404, "Test HTTP error", {
      expose: true,
    });

    const errorAsSanitizedJson = safeStringifyException(mockHttpError);
    const spyLogError = jest.spyOn(mockOptions.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");
    await handleRestEndpointException({ ...mockOptions, error: mockHttpError });

    expect(spyStatus).toHaveBeenCalledWith(404);
    expect(spyLogError).toHaveBeenCalledWith(
      mockOptions.errorMsg,
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

    const mockOptions: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(mockOptions.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException({ ...mockOptions, error: mockError });

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLoggerFn).toHaveBeenCalledWith(
      mockOptions.errorMsg,
      mockErrorJson,
    );

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

    const mockOptions: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(mockOptions.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException({ ...mockOptions, error: mockError });

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLoggerFn).toHaveBeenCalledWith(
      mockOptions.errorMsg,
      mockErrorJson,
    );

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

    const mockOptions: IHandleRestEndpointExceptionOptions = {
      errorMsg: "Test error message",
      log: jest.mocked(log), // Provide a mock logger if needed
      error: mockError,
      res: mockResponse,
    };

    const mockErrorJson = safeStringifyException(mockError);
    const spyLoggerFn = jest.spyOn(mockOptions.log, "error");
    const spyStatus = jest.spyOn(mockResponse, "status");
    const spyJson = jest.spyOn(mockResponse, "json");

    await handleRestEndpointException({ ...mockOptions, error: mockError });

    expect(spyStatus).toHaveBeenCalledWith(500);

    expect(spyLoggerFn).toHaveBeenCalledWith(
      mockOptions.errorMsg,
      mockErrorJson,
    );

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
