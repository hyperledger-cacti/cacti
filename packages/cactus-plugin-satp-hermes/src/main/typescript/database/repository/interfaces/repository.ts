import type { SATPLocalLog, SATPRemoteLog, Log } from "../../../core/types";

export interface IRepository<T, K> {
  readById(id: K): Promise<T>;
  create(entity: T): any;
  destroy(): any;
  reset(): any;
}

export interface ILocalLogRepository extends IRepository<SATPLocalLog, string> {
  database: any;
  readById(id: string): Promise<SATPLocalLog>;
  readLogsNotProofs(): Promise<SATPLocalLog[]>;
  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<SATPLocalLog[]>;
  readLastestLog(sessionID: string): Promise<SATPLocalLog>;
  create(log: Log): Promise<Log>;
  deleteBySessionId(log: string): any;
  fetchLogsFromSequence(
    sessionId: string,
    sequenceNumber: number,
  ): Promise<SATPLocalLog[]>;
  destroy(): any;
  reset(): any;
  getCreated(): boolean;
}

export interface IRemoteLogRepository
  extends IRepository<SATPRemoteLog, string> {
  database: any;
  readById(id: string): Promise<SATPRemoteLog>;
  create(log: SATPRemoteLog): any;
  destroy(): any;
  reset(): any;
}
