import createKnex, {
  Config as KnexConfig,
  QueryBuilder as KnexQueryBuilder,
} from "knex";
import Knex from "knex";

export { KnexConfig };
export { KnexQueryBuilder };

export interface IKnexOidcAdapterOptions {
  knex: Knex;
  name: string;
  queryBuilder: KnexQueryBuilder;
}

// const sequelize = new Sequelize('databaseName', 'username', 'password', {
//   host: 'databaseHost',
//   dialect: 'postgres',
// });

// const grantable = new Set([
//   'AccessToken',
//   'AuthorizationCode',
//   'RefreshToken',
//   'DeviceCode',
// ]);

// const models = [
//   'Session',
//   'AccessToken',
//   'AuthorizationCode',
//   'RefreshToken',
//   'DeviceCode',
//   'ClientCredentials',
//   'Client',
//   'InitialAccessToken',
//   'RegistrationAccessToken',
//   'Interaction',
//   'ReplayDetection',
//   'PushedAuthorizationRequest',
// ].reduce((map, name) => {
//   map.set(name, sequelize.define(name, {
//     id: { type: Sequelize.STRING, primaryKey: true },
//     ...(grantable.has(name) ? { grantId: { type: Sequelize.STRING } } : undefined),
//     ...(name === 'DeviceCode' ? { userCode: { type: Sequelize.STRING } } : undefined),
//     ...(name === 'Session' ? { uid: { type: Sequelize.STRING } } : undefined),
//     data: { type: Sequelize.JSONB },
//     expiresAt: { type: Sequelize.DATE },
//     consumedAt: { type: Sequelize.DATE },
//   }));

//   return map;
// }, new Map());

// class SequelizeAdapter {
//   constructor(name) {
//     this.querybuilder = models.get(name);
//     this.name = name;
//   }

//   async upsert(id, data, expiresIn) {
//     await this.querybuilder.upsert({
//       id,
//       data,
//       ...(data.grantId ? { grantId: data.grantId } : undefined),
//       ...(data.userCode ? { userCode: data.userCode } : undefined),
//       ...(data.uid ? { uid: data.uid } : undefined),
//       ...(expiresIn ? { expiresAt: new Date(Date.now() + (expiresIn * 1000)) } : undefined),
//     });
//   }

//   async find(id) {
//     const found = await this.querybuilder.findByPk(id);
//     if (!found) return undefined;
//     return {
//       ...found.data,
//       ...(found.consumedAt ? { consumed: true } : undefined),
//     };
//   }

//   async findByUserCode(userCode) {
//     const found = await this.querybuilder.findOne({ where: { userCode } });
//     if (!found) return undefined;
//     return {
//       ...found.data,
//       ...(found.consumedAt ? { consumed: true } : undefined),
//     };
//   }

//   async findByUid(uid) {
//     const found = await this.querybuilder.findOne({ where: { uid } });
//     if (!found) return undefined;
//     return {
//       ...found.data,
//       ...(found.consumedAt ? { consumed: true } : undefined),
//     };
//   }

//   async destroy(id) {
//     await this.querybuilder.destroy({ where: { id } });
//   }

//   async consume(id) {
//     await this.querybuilder.update({ consumedAt: new Date() }, { where: { id } });
//   }

//   async revokeByGrantId(grantId) {
//     await this.querybuilder.destroy({ where: { grantId } });
//   }

//   static async connect() {
//     return sequelize.sync();
//   }
// }

export class KnexOidcAdapter {
  private readonly queryBuilder: KnexQueryBuilder;
  private readonly name: string;
  private readonly knex: Knex;

  constructor(public readonly options: IKnexOidcAdapterOptions) {
    this.knex = options.knex;
    this.name = options.name;
    this.queryBuilder = options.queryBuilder;
  }

  // async upsert(id: string, data: any, expiresInSeconds: number) {
  //   await this.queryBuilder.upsert({
  //     id,
  //     data,
  //     ...(data.grantId ? { grantId: data.grantId } : undefined),
  //     ...(data.userCode ? { userCode: data.userCode } : undefined),
  //     ...(data.uid ? { uid: data.uid } : undefined),
  //     ...(expiresInSeconds ? { expiresAt: new Date(Date.now() + (expiresInSeconds * 1000)) } : undefined),
  //   });
  // }

  // async find(id: string) {
  //   const found = await this.queryBuilder.findByPk(id);
  //   if (!found) return undefined;
  //   return {
  //     ...found.data,
  //     ...(found.consumedAt ? { consumed: true } : undefined),
  //   };
  // }

  // async findByUserCode(userCode: string) {
  //   const found = await this.querybuilder.findOne({ where: { userCode } });
  //   if (!found) return undefined;
  //   return {
  //     ...found.data,
  //     ...(found.consumedAt ? { consumed: true } : undefined),
  //   };
  // }

  // async findByUid(uid: string) {
  //   const found = await this.querybuilder.findOne({ where: { uid } });
  //   if (!found) return undefined;
  //   return {
  //     ...found.data,
  //     ...(found.consumedAt ? { consumed: true } : undefined),
  //   };
  // }

  // async destroy(id: string) {
  //   await this.querybuilder.destroy({ where: { id } });
  // }

  // async consume(id: string) {
  //   await this.querybuilder.update({ consumedAt: new Date() }, { where: { id } });
  // }

  // async revokeByGrantId(grantId: string) {
  //   await this.querybuilder.destroy({ where: { grantId } });
  // }

  // static async connect() {
  //   // create the schema here
  //   return
  //   return sequelize.sync();
  // }

  get tableNames(): string[] {
    return [
      "Session",
      "AccessToken",
      "AuthorizationCode",
      "RefreshToken",
      "DeviceCode",
      "ClientCredentials",
      "Client",
      "InitialAccessToken",
      "RegistrationAccessToken",
      "Interaction",
      "ReplayDetection",
      "PushedAuthorizationRequest",
    ];
  }
}
