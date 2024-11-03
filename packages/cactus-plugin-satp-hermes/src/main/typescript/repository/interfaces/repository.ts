import { LocalLog, RemoteLog } from "../../core/types";

export interface IRepository<T, K> {
  readById(id: K): Promise<T>;
  create(entity: T): any;
  destroy(): any;
  reset(): any;
}

export interface ILocalLogRepository extends IRepository<LocalLog, string> {
  database: any;
  readById(id: string): Promise<LocalLog>;
  readLogsNotProofs(): Promise<LocalLog[]>;
  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<LocalLog[]>;
  readLastestLog(sessionID: string): Promise<LocalLog>;
  create(log: LocalLog): Promise<LocalLog>;
  deleteBySessionId(log: string): any;
  fetchLogsFromSequence(id: string): Promise<LocalLog[]>;
  readLogsBySessionId(sessionId: string): Promise<LocalLog[]>;
  destroy(): any;
  reset(): any;
}

export interface IRemoteLogRepository extends IRepository<RemoteLog, string> {
  database: any;
  readById(id: string): Promise<RemoteLog>;
  create(log: RemoteLog): any;
  destroy(): any;
  reset(): any;
}
