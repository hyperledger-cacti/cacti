import { Request, Response, NextFunction, Application } from 'express';
import secp256k1 from 'secp256k1';
import { keccak256 } from 'js-sha3';

import { IPluginKVStorage } from '@hyperledger-labs/bif-core-api';
import { IConsortium } from '../model/consortium';
import { IConsortiumWrapper } from '../model/consortium-wrapper';
import { Config } from 'convict';
import { IBifApiServerOptions } from '../../config/config-service';

export interface ICreateConsortiumEndpointOptions {
  storage: IPluginKVStorage;
  config: Config<IBifApiServerOptions>;
}

export class CreateConsortiumEndpointV1 {

  constructor(public readonly options: ICreateConsortiumEndpointOptions) {
    if (!options) {
      throw new Error(`CreateConsortiumEndpointV1#ctor options falsy.`);
    }
    if (!options.config) {
      throw new Error(`CreateConsortiumEndpointV1#ctor options.config falsy.`);
    }
    if (!options.storage) {
      throw new Error(`CreateConsortiumEndpointV1#ctor options.storage falsy.`);
    }
  }

  getPath(): string {
    return '/api/v1/consortium';
  }

  async handleRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const consortium: IConsortium = req.body;
    const idAlreadyExists = await this.options.storage.has(consortium.id);
    if (idAlreadyExists) {
      res.json({ success: false, message: `Consortium with ID ${consortium.id} already exists.` });
      res.status(400);
    }
    // FIXME: We need a library handling the crypto, how about NodeJS bindings for Ursa?
    const privateKey = this.options.config.get('privateKey');
    const privateKeyBytes = Uint8Array.from(Buffer.from(privateKey, 'hex'));
    const consortiumJson: string = JSON.stringify(consortium);
    const consortiumBytesHash = Uint8Array.from(keccak256.array(consortiumJson));
    const signatureWrapper = secp256k1.ecdsaSign(consortiumBytesHash, privateKeyBytes);
    const signature = Buffer.from(signatureWrapper.signature).toString('hex');
    const consortiumWrapper: IConsortiumWrapper = {
      signature,
      consortiumJson,
    };
    const wrapperJson = JSON.stringify(consortiumWrapper);
    // tslint:disable-next-line: no-console
    await this.options.storage.set(consortium.id, wrapperJson);
    res.json({ success: true, consortiumWrapper });
    res.status(201);
  }
}
