export const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5,
} as const;
export type LogLevelNumbers = (typeof LogLevel)[keyof typeof LogLevel];
export type LogLevelDesc =
  | LogLevelNumbers
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "silent"
  | keyof typeof LogLevel;
