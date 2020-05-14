import { ApiClient } from "../api-client";

export interface IConsortiumServiceOptions {
  apiClient: ApiClient;
}

export class ConsortiumService {
  constructor(public readonly options: IConsortiumServiceOptions) {}

  async create(): Promise<void> {
    return;
  }
}
