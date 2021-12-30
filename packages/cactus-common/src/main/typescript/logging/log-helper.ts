export class LogHelper {
  public static getExceptionStack(exception: unknown): string {
    // handle unknown exception input
    const defaultStack = "NO_STACK_INFORMATION_INCLUDED_IN_EXCEPTION";
    const invalidStack = "INVALID_STACK_INFORMATION";
    let stack = defaultStack;

    // 1st need to check that exception is not null or undefined before trying to access the wanted stack information
    if (exception && typeof exception === "object") {
      // 2nd need to check if a stack property is available
      if (Object.hasOwnProperty.call(exception, "stack")) {
        // 3rd check if the stack property is already of type string
        if (typeof (exception as Record<string, unknown>).stack === "string") {
          stack = (exception as { stack: string }).stack;
        } else {
          // need to stringify stack information first
          try {
            stack = JSON.stringify((exception as { stack: unknown }).stack);
          } catch (error) {
            // stringify failed -> maybe due to cyclic dependency stack etc.
            stack = invalidStack;
          }
        }
      }
    }
    return stack;
  }

  public static getExceptionMessage(exception: unknown): string {
    // handle unknown exception input
    const defaultMessage = "NO_MESSAGE_INCLUDED_IN_EXCEPTION";
    const invalidMessage = "INVALID_EXCEPTION_MESSAGE";
    let message = defaultMessage;

    // 1st need to check that exception is not null or undefined before trying to access the wanted message information
    if (exception && typeof exception === "object") {
      // 2nd need to check if a message property is available
      if (Object.hasOwnProperty.call(exception, "message")) {
        // 3rd check if the message property is already of type string
        if (
          typeof (exception as Record<string, unknown>).message === "string"
        ) {
          message = (exception as { message: string }).message;
        } else {
          // need to stringify message information first
          try {
            message = JSON.stringify(
              (exception as { message: unknown }).message,
            );
          } catch (error) {
            // stringify failed -> maybe due to invalid message content etc.
            message = invalidMessage;
          }
        }
      }
    }
    return message;
  }
}
