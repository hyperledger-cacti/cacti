import { v4 as uuidV4 } from "uuid";
import "jest-extended";

import { createRuntimeErrorWithCause } from "../../../../main/typescript/public-api";
import stringify from "fast-safe-stringify";
import { RuntimeError } from "run-time-error-cjs";

describe("createRuntimeErrorWithCause() & newRex()", () => {
  it("avoids losing information of inner exception: RuntimeError instance", () => {
    const aCauseMessage = uuidV4();
    const eMsg = uuidV4();

    const anError = new RuntimeError(aCauseMessage);

    try {
      throw anError;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toContain(aCauseMessage);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(aCauseMessage);
    }
  });

  it("avoids losing information of inner exception: nested RuntimeError instances", () => {
    const aCauseMessage = uuidV4();
    const eMsg = uuidV4();
    const innerEMsg1 = uuidV4();
    const innerEMsg2 = uuidV4();

    const innerEx1 = new RuntimeError(innerEMsg1);
    const innerEx2 = new RuntimeError(innerEMsg2, innerEx1);

    const anError = new RuntimeError(aCauseMessage, innerEx2);

    try {
      throw anError;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toContain(aCauseMessage);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(aCauseMessage);
      expect(rexAsJson).toContain(innerEMsg1);
      expect(rexAsJson).toContain(innerEMsg2);
    }
  });

  it("avoids losing information of inner exception: Error instance", () => {
    const aCauseMessage = uuidV4();
    const eMsg = uuidV4();

    const anError = new Error(aCauseMessage);

    try {
      throw anError;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toContain(aCauseMessage);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(aCauseMessage);
    }
  });

  it("avoids losing information of inner exception: Error shaped POJO", () => {
    const aCauseMessage = uuidV4();
    const aStack = uuidV4();
    const eMsg = uuidV4();

    const fakeErrorWithStack = {
      message: aCauseMessage,
      stack: aStack,
    };

    try {
      throw fakeErrorWithStack;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toContain(aCauseMessage);
      expect((cause as Error).stack).toContain(aStack);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(aCauseMessage);
      expect(rexAsJson).toContain(aStack);
    }
  });

  it("avoids losing information of inner exception: Error shaped circular POJO", () => {
    const aCauseMessage = uuidV4();
    const aStack = uuidV4();
    const eMsg = uuidV4();

    const fakeErrorWithStack = {
      message: aCauseMessage,
      stack: aStack,
      circularPropertyReference: {},
    };
    fakeErrorWithStack.circularPropertyReference = fakeErrorWithStack;

    try {
      throw fakeErrorWithStack;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect((cause as Error).message).toContain(aCauseMessage);
      expect((cause as Error).stack).toContain(aStack);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(aCauseMessage);
      expect(rexAsJson).toContain(aStack);
    }
  });

  it("avoids losing information of inner exception: undefined", () => {
    const eMsg = uuidV4();

    try {
      throw undefined;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: null", () => {
    const eMsg = uuidV4();

    try {
      throw null;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: NaN", () => {
    const eMsg = uuidV4();

    try {
      throw NaN;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: 0", () => {
    const eMsg = uuidV4();

    try {
      throw 0;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: empty POJO", () => {
    const eMsg = uuidV4();

    try {
      throw {};
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: empty array", () => {
    const eMsg = uuidV4();

    try {
      throw [];
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: filled array", () => {
    const eMsg = uuidV4();
    const id1 = uuidV4();
    const id2 = uuidV4();
    const id3 = uuidV4();

    try {
      throw [id1, id2, id3];
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(id1);
      expect(rexAsJson).toContain(id2);
      expect(rexAsJson).toContain(id3);
    }
  });

  it("avoids losing information of inner exception: Symbol", () => {
    const eMsg = uuidV4();
    const id1 = uuidV4();

    try {
      const symbolToThrow = Symbol(id1);
      throw symbolToThrow;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromSymbol");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(id1);
    }
  });

  it("avoids losing information of inner exception: BigInt", () => {
    const eMsg = uuidV4();
    // BigInt(Number.MAX_SAFE_INTEGER) * BigInt(Number.MAX_SAFE_INTEGER);
    // =>
    // 81129638414606663681390495662081n
    const maxSafeIntSquaredAsStr = "81129638414606663681390495662081";
    const maxSafeIntSquared = BigInt(maxSafeIntSquaredAsStr);

    try {
      throw maxSafeIntSquared;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
      expect(rexAsJson).toContain(maxSafeIntSquaredAsStr);
    }
  });

  it("avoids losing information of inner exception: Int32", () => {
    const throwable: number = Math.random() * 10e7;
    const eMsg = uuidV4();
    try {
      throw throwable;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });

  it("avoids losing information of inner exception: String", () => {
    const eMsg = uuidV4();
    try {
      throw eMsg;
    } catch (ex: unknown) {
      const rex = createRuntimeErrorWithCause(eMsg, ex);
      const { cause, message, name, stack } = rex;
      expect(cause).toBeInstanceOf(Error);
      expect(name).toBe("RuntimeError");
      expect(message).toBeString();
      expect(message).toEqual(eMsg);
      expect(stack).toContain(eMsg);
      expect(cause?.constructor.name).toEqual("ErrorFromUnknownThrowable");

      const rexAsJson = stringify(rex);
      expect(rexAsJson).toContain(eMsg);
    }
  });
});
