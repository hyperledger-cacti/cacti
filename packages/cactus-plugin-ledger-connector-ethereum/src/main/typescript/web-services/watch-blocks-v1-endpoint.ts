import Web3, { BlockHeaderOutput, FMT_BYTES, FMT_NUMBER } from "web3";
import { NewHeadsSubscription } from "web3-eth";
import { Socket as SocketIoSocket } from "socket.io";

import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import {
  WatchBlocksV1Options,
  WatchBlocksV1Progress,
  WatchBlocksV1,
  Web3Transaction,
} from "../generated/openapi/typescript-axios";
import {
  ConvertWeb3ReturnToString,
  Web3StringReturnFormat,
} from "../types/util-types";

export interface IWatchBlocksV1EndpointConfiguration {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
  web3: Web3;
  options?: WatchBlocksV1Options;
}

export class WatchBlocksV1Endpoint {
  public static readonly CLASS_NAME = "WatchBlocksV1Endpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket<
    Record<WatchBlocksV1, (next: string) => void>,
    Record<WatchBlocksV1, (next: WatchBlocksV1Progress | string) => void>
  >;
  private readonly web3: Web3;
  private readonly isGetBlockData: boolean;

  public get className(): string {
    return WatchBlocksV1Endpoint.CLASS_NAME;
  }

  constructor(public readonly config: IWatchBlocksV1EndpointConfiguration) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(config, `${fnTag} arg options`);
    Checks.truthy(config.web3, `${fnTag} arg options.web3`);
    Checks.truthy(config.socket, `${fnTag} arg options.socket`);

    this.web3 = config.web3;
    this.socket = config.socket;
    this.isGetBlockData = config.options?.getBlockData == true;

    const level = this.config.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async subscribe(): Promise<NewHeadsSubscription> {
    const { socket, log, web3, isGetBlockData } = this;
    log.info(`${WatchBlocksV1.Subscribe} => ${socket.id}`);

    const newBlocksSubscription = await web3.eth.subscribe(
      "newBlockHeaders",
      undefined,
      Web3StringReturnFormat,
    );

    newBlocksSubscription.on("data", async (blockHeader) => {
      log.debug("newBlockHeaders: BlockHeader=%o", blockHeader);
      let next: WatchBlocksV1Progress;

      if (isGetBlockData) {
        const web3BlockData = await web3.eth.getBlock(
          blockHeader.number,
          true,
          {
            number: FMT_NUMBER.STR,
            bytes: FMT_BYTES.HEX,
          },
        );
        next = {
          blockData: {
            ...web3BlockData,
            // Return with full tx objects is not detected, must manually force correct type
            transactions: (web3BlockData.transactions ??
              []) as unknown as Web3Transaction[],
          },
        };
      } else {
        // Force fix type of sha3Uncles
        let sha3Uncles: string = blockHeader.sha3Uncles as unknown as string;
        if (Array.isArray(blockHeader.sha3Uncles)) {
          sha3Uncles = blockHeader.sha3Uncles.toString();
        }

        next = {
          blockHeader: {
            ...(blockHeader as ConvertWeb3ReturnToString<BlockHeaderOutput>),
            sha3Uncles,
          },
        };
      }

      socket.emit(WatchBlocksV1.Next, next);
    });

    newBlocksSubscription.on("error", async (error) => {
      console.log("Error when subscribing to New block header: ", error);
      socket.emit(WatchBlocksV1.Error, safeStringifyException(error));
      newBlocksSubscription.unsubscribe();
    });

    log.debug("Subscribing to Web3 new block headers event...");

    socket.on("disconnect", async (reason: string) => {
      log.info("WebSocket:disconnect reason=%o", reason);
      await newBlocksSubscription.unsubscribe();
    });

    socket.on(WatchBlocksV1.Unsubscribe, async () => {
      log.debug(`${WatchBlocksV1.Unsubscribe}: unsubscribing Web3...`);
      await newBlocksSubscription.unsubscribe();
      log.debug("Web3 unsubscribe done.");
    });

    log.debug("Subscribing to Web3 new block headers event...");
    return newBlocksSubscription as NewHeadsSubscription;
  }
}
