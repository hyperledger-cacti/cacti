import knex, { Config as KnexConfig } from "knex";
import Knex from "knex";
import { KnexOidcAdapter } from "./knex-oidc-adapter";

export { KnexConfig };

export interface IKnexOidcAdapterFactoryOptions {
  knexConfig: KnexConfig;
}

export class KnexOidcAdapterFactory {
  private readonly knex: Knex;

  constructor(public readonly options: IKnexOidcAdapterFactoryOptions) {
    this.knex = knex(options.knexConfig);
  }

  public create(name: string): KnexOidcAdapter {
    const queryBuilder = this.knex(name);
    return new KnexOidcAdapter({ knex: this.knex, name, queryBuilder });
  }
}
