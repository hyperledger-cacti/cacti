import { IRemoteLog, ILocalLog } from "../../plugin-satp-gateway";

export interface IRepository<T, K> {
  readById(id: K): Promise<T>;
  create(entity: T): any;
  destroy(): any;
  reset(): any;
}

export interface ILocalLogRepository extends IRepository<ILocalLog, string> {
  database: any;
  readById(id: string): Promise<ILocalLog>;
  readLogsNotProofs(): Promise<ILocalLog[]>;
  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<ILocalLog[]>;
  readLastestLog(sessionID: string): Promise<ILocalLog>;
  create(log: ILocalLog): Promise<ILocalLog>;
  deleteBySessionId(log: string): any;
  destroy(): any;
  reset(): any;
}

export interface IRemoteLogRepository extends IRepository<IRemoteLog, string> {
  database: any;
  readById(id: string): Promise<IRemoteLog>;
  create(log: IRemoteLog): any;
  destroy(): any;
  reset(): any;
}
