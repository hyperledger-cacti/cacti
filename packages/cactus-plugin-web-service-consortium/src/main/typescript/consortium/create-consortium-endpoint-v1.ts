import { Request, Response, NextFunction } from "express";
import secp256k1 from "secp256k1";
import { keccak256 } from "js-sha3";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";
import { IPluginKVStorage } from "@hyperledger/cactus-core-api";
import { Consortium } from "../generated/openapi/typescript-axios";

export interface ICreateConsortiumEndpointOptions {
  storage: IPluginKVStorage;
  privateKey: string;
  path: string;
  hostPlugin: ICactusPlugin;
}

export class CreateConsortiumEndpointV1 implements IWebServiceEndpoint {
  constructor(public readonly options: ICreateConsortiumEndpointOptions) {
    if (!options) {
      throw new Error(`CreateConsortiumEndpointV1#ctor options falsy.`);
    }
    if (!options.privateKey) {
      throw new Error(
        `CreateConsortiumEndpointV1#ctor options.privateKey falsy.`
      );
    }
    if (!options.storage) {
      throw new Error(`CreateConsortiumEndpointV1#ctor options.storage falsy.`);
    }
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return this.options.path;
  }

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const consortium: Consortium = req.body;
      const idAlreadyExists = await this.options.storage.has(consortium.id);
      if (idAlreadyExists) {
        res.status(400);
        res.json({
          success: false,
          message: `Consortium with ID ${consortium.id} already exists.`,
        });
      } else {
        // FIXME: We need a library handling the crypto, how about NodeJS bindings for Ursa?
        const privateKey = this.options.privateKey;
        const privateKeyBytes = Uint8Array.from(Buffer.from(privateKey, "hex"));
        const consortiumJson: string = JSON.stringify(consortium);
        const consortiumBytesHash = Uint8Array.from(
          keccak256.array(consortiumJson)
        );
        const signatureWrapper = secp256k1.ecdsaSign(
          consortiumBytesHash,
          privateKeyBytes
        );
        const signature = Buffer.from(signatureWrapper.signature).toString(
          "hex"
        );
        const consortiumWrapper = {
          signature,
          consortiumJson,
        };
        const wrapperJson = JSON.stringify(consortiumWrapper);
        // tslint:disable-next-line: no-console
        await this.options.storage.set(consortium.id, wrapperJson);
        res.status(201);
        res.json({ success: true, consortiumWrapper });
      }
    } catch (ex) {
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
