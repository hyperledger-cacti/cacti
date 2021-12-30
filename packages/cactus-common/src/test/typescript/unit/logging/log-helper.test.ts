import "jest-extended";
import { RuntimeError } from "run-time-error";
import { LogHelper } from "../../../../main/typescript/logging/log-helper";

describe("log-helper tests", () => {
  const no_message_available = "NO_MESSAGE_INCLUDED_IN_EXCEPTION";
  const no_stack_available = "NO_STACK_INFORMATION_INCLUDED_IN_EXCEPTION";
  const custom_exception_was_thrown = "A CUSTOM EXCEPTION WAS THROWN";
  const errorMessage = "Oops";
  const errorNumber = 2468;

  describe("exception stack-tests", () => {
    it("gets the stack information from a regular Error object", () => {
      let expectedResult: string | undefined = "";
      let stack = no_stack_available;

      try {
        const testError = new Error(errorMessage);
        expectedResult = testError.stack;
        throw testError;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toBe(expectedResult);
    });

    it("gets stack information from a faked Error object which is containing stack information as string type", () => {
      const expectedResult = "Faked stack";
      let stack = no_stack_available;

      const fakeErrorWithStack = {
        message:
          "This is a fake error object with string-type stack information",
        stack: expectedResult,
      };

      try {
        throw fakeErrorWithStack;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toBe(expectedResult);
    });

    it("gets stack information from a faked Error object which is containing stack information as number type and therefore need to be stringified", () => {
      const expectedResult = "123456";
      let stack = no_stack_available;

      const fakeErrorWithStack = {
        message:
          "This is a fake error object with number-type stack information",
        stack: 123456,
      };

      try {
        throw fakeErrorWithStack;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toBe(expectedResult);
    });

    it("gets stringified exception as custom stack information as the faked Error object is not containing any specific stack information", () => {
      const msg = "This is a fake error object without stack information";
      let stack = no_stack_available;

      const fakeErrorWithoutStack = {
        message: msg,
      };

      try {
        throw fakeErrorWithoutStack;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toContain(msg);
      expect(stack).toContain(custom_exception_was_thrown);
    });

    it("handles throwing null successfully and returns NO_STACK_INFORMATION_INCLUDED_IN_EXCEPTION string", () => {
      const expectedResult = no_stack_available;
      let stack = no_stack_available;

      const fakeError = null;

      try {
        throw fakeError;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toBe(expectedResult);
    });

    it("handles throwing undefined successfully and returns NO_STACK_INFORMATION_INCLUDED_IN_EXCEPTION string", () => {
      const expectedResult = no_stack_available;
      let stack = no_stack_available;

      const fakeError = undefined;

      try {
        throw fakeError;
      } catch (error) {
        stack = LogHelper.getExceptionStack(error);
      }

      // check stack
      expect(stack).toBe(expectedResult);
    });
  });

  describe("exception message-tests", () => {
    it("gets the exception message from a regular Error object", () => {
      const expectedResult = errorMessage;
      let message = no_message_available;

      try {
        const testError = new Error(errorMessage);
        throw testError;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toBe(expectedResult);
    });

    it("gets the exception message from a faked Error object which is containing message as string type", () => {
      const expectedResult = errorMessage;
      let message = no_message_available;

      const fakeErrorWithMessage = {
        message: errorMessage,
        stack: expectedResult,
      };

      try {
        throw fakeErrorWithMessage;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toBe(expectedResult);
    });

    it("gets exception message from a faked Error object which is containing message information as number type and therefore need to be stringified", () => {
      const expectedResult = "123456";
      let message = no_message_available;

      const fakeErrorWithNumberMessage = {
        message: 123456,
      };

      try {
        throw fakeErrorWithNumberMessage;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toBe(expectedResult);
    });

    it("gets no exception message information as the faked Error object is not containing any message information and therefore tries to stringify the whole exception", () => {
      const msg = "This is a fake error object without message information";
      const expectedResultPart2 = msg;
      let message = no_message_available;

      const fakeErrorWithoutMessage = {
        stack: "This is a fake error object without message information",
      };

      try {
        throw fakeErrorWithoutMessage;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toContain(custom_exception_was_thrown);
      expect(message).toContain(expectedResultPart2);
    });

    it("handles throwing null successfully and returning NO_MESSAGE_INCLUDED_IN_EXCEPTION string", () => {
      const expectedResult = no_message_available;
      let message = no_message_available;

      const fakeError = null;

      try {
        throw fakeError;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toBe(expectedResult);
    });

    it("handles throwing undefined successfully and returning NO_MESSAGE_INCLUDED_IN_EXCEPTION string", () => {
      const expectedResult = no_message_available;
      let message = no_message_available;

      const fakeError = undefined;

      try {
        throw fakeError;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
      }

      // check message
      expect(message).toBe(expectedResult);
    });
  });

  describe("handling of custom exceptions", () => {
    it("handles a thrown string", () => {
      let message = no_message_available;
      let stack = no_stack_available;

      try {
        throw errorMessage;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
        stack = LogHelper.getExceptionStack(error);
      }

      // check message + stack
      expect(message).toContain(errorMessage);
      expect(message).toContain(custom_exception_was_thrown);
      expect(stack).toContain(errorMessage);
      expect(stack).toContain(custom_exception_was_thrown);
    });

    it("handles a thrown number", () => {
      const expectedMessage = `${errorNumber}`;
      let message = no_message_available;
      let stack = no_stack_available;

      try {
        throw errorNumber;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
        stack = LogHelper.getExceptionStack(error);
      }

      // check message + stack
      expect(message).toContain(expectedMessage);
      expect(message).toContain(custom_exception_was_thrown);
      expect(stack).toContain(expectedMessage);
      expect(stack).toContain(custom_exception_was_thrown);
    });

    it("handles an arbitrary exception", () => {
      let message = no_message_available;
      let stack = no_stack_available;
      const arbitraryException = { error: errorMessage };

      try {
        throw arbitraryException;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
        stack = LogHelper.getExceptionStack(error);
      }

      // check message + stack
      expect(message).toContain(errorMessage);
      expect(message).toContain(custom_exception_was_thrown);
      expect(stack).toContain(errorMessage);
      expect(stack).toContain(custom_exception_was_thrown);
    });

    it("handles nested exceptions", () => {
      const expectedErrorMessage = "RTE3";
      const expectedStackPart = "RTE1";
      let message = no_message_available;
      let stack = no_stack_available;
      const rtE1 = new RuntimeError("RTE1");
      const rtE2 = new RuntimeError("RTE2", rtE1);
      const rtE3 = new RuntimeError("RTE3", rtE2);

      try {
        throw rtE3;
      } catch (error) {
        message = LogHelper.getExceptionMessage(error);
        stack = LogHelper.getExceptionStack(error);
      }

      // check message + stack
      expect(message).toBe(expectedErrorMessage);
      expect(stack).toContain(expectedStackPart);
    });
  });
});
