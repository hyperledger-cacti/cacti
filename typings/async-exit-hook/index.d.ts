

declare module "async-exit-hook" {

  export interface IHookEventFunction {
    (signal: string, exitCode: number, filter?: (msg: string) => boolean): void;
  }

  export interface IUnhandledRejectionHandlerFunction {
    (err: Error): void;
  }

  export interface IUncaughtExceptionHandlerFunction {
    (err: Error, doneCallback?: () => void): void;
  }

  export interface IAsyncExitHookDoneCallback {
    (): void;
  }

  export interface IExitHookFunction {
    uncaughtExceptionHandler: IUncaughtExceptionHandlerFunction;
    unhandledRejectionHandler: IUnhandledRejectionHandlerFunction;
    hookEvent: IHookEventFunction;
    forceExitTimeout: (millis: number) => void;

    (theExitHook: () => void): void
    (theExitHook: (doneCallback: IAsyncExitHookDoneCallback) => void): void
  }

  const exitHook: IExitHookFunction;

  export default exitHook;
}


