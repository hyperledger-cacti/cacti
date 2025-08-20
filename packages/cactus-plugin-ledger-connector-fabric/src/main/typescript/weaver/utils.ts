import { ILoggerOptions, LoggerProvider } from "@hyperledger/cactus-common";
import { Query } from "../generated/protos/common/query_pb";
import {
  FabricViewSchema,
  FabricView as ProtoFabricView,
  FabricView_EndorsedProposalResponseSchema,
} from "../generated/protos/fabric/view_data_pb";
import {
  Meta_Protocol,
  MetaSchema,
  ViewPayloadSchema,
  ViewSchema,
} from "../generated/protos/common/state_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import { FabricView } from "../public-api";

// A better way to handle errors for promises
export function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
  const result: Promise<[T?, Error?]> = promise
    .then((data) => {
      const response: [T?, Error?] = [data, undefined];
      return response;
    })
    .catch((error) => Promise.resolve([undefined, error]));
  return result;
}

export function relayCallback(call: { error?: any; response?: any }) {
  const loggerOptions: ILoggerOptions = {
    level: "INFO",
    label: "RelayCallback",
  };
  const logger = LoggerProvider.getOrCreate(loggerOptions);
  if (call.response) {
    logger.info(`Relay Callback Response: ${JSON.stringify(call.response)}`);
  } else if (call.error) {
    logger.error(`Relay Callback Error: ${call.error}`);
  }
}

export function checkIfArraysAreEqual(x: Array<any>, y: Array<any>): boolean {
  if (x == y) {
    return true;
  } else if (x == null || y == null || x.length != y.length) {
    return false;
  } else {
    // check if all elements of x are present in y
    for (const element of x) {
      const index = y.indexOf(element);
      if (index == -1) {
        return false;
      } else {
        y.splice(index, 1);
      }
    }

    // return false if y has additional elements not in x
    if (y.length != 0) {
      return false;
    }
  }

  return true;
}

// Package view and send to relay
export function packageFabricView(query: Query, viewData: ProtoFabricView) {
  const meta = create(MetaSchema, {
    timestamp: new Date().toISOString(),
    proofType: "Notarization",
    serializationFormat: "STRING",
    protocol: Meta_Protocol.FABRIC,
  });

  const view = create(ViewSchema, {
    meta: meta,
    data: viewData
      ? toBinary(FabricViewSchema, viewData)
      : new Uint8Array(Buffer.from("")),
  });

  const viewPayload = create(ViewPayloadSchema, {
    state: {
      case: "view",
      value: view,
    },
    requestId: query.requestId,
  });
  return viewPayload;
}

export async function delay(ms: number) {
  await new Promise((f) => setTimeout(f, ms));
}

/**
 * Transforms the result.view object to match the MessageInit<FabricView> structure.
 * Adjust this function as needed to match the actual FabricView fields. (From the OAPI spec to the proto spec)
 */
export function transformToFabricView(view: FabricView): ProtoFabricView {
  const endorsedProposalResponses = (view.endorsedProposalResponses ?? []).map(
    (epr) =>
      create(FabricView_EndorsedProposalResponseSchema, {
        payload: {
          proposalHash: Uint8Array.from(
            Buffer.from(epr.payload?.proposalHash || "", "base64"),
          ),
          extension: Uint8Array.from(
            Buffer.from(epr.payload?.extension || "", "base64"),
          ),
        },
        endorsement: {
          endorser: Uint8Array.from(
            Buffer.from(epr.endorsement?.endorser || "", "base64"),
          ),
          signature: Uint8Array.from(
            Buffer.from(epr.endorsement?.signature || "", "base64"),
          ),
        },
      }),
  );
  return create(FabricViewSchema, {
    endorsedProposalResponses: endorsedProposalResponses,
  });
}

export function parseAddress(address: string): {
  channel: string;
  contract: string;
  ccFunc: string;
  args: string[];
} {
  // address format: fabric/<channelName>:<contractName>:<ccFunc>:<arg1>:<arg2>:...
  const addressList = address.split("/");
  const fabricArgs = addressList[2].split(":");
  return {
    channel: fabricArgs[0],
    contract: fabricArgs[1],
    ccFunc: fabricArgs[2],
    args: fabricArgs.slice(3),
  };
}
