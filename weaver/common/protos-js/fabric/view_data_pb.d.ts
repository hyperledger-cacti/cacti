// package: fabric.view_data
// file: fabric/view_data.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";

export class FabricView extends jspb.Message { 
    clearEndorsedProposalResponsesList(): void;
    getEndorsedProposalResponsesList(): Array<FabricView.EndorsedProposalResponse>;
    setEndorsedProposalResponsesList(value: Array<FabricView.EndorsedProposalResponse>): FabricView;
    addEndorsedProposalResponses(value?: FabricView.EndorsedProposalResponse, index?: number): FabricView.EndorsedProposalResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): FabricView.AsObject;
    static toObject(includeInstance: boolean, msg: FabricView): FabricView.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: FabricView, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): FabricView;
    static deserializeBinaryFromReader(message: FabricView, reader: jspb.BinaryReader): FabricView;
}

export namespace FabricView {
    export type AsObject = {
        endorsedProposalResponsesList: Array<FabricView.EndorsedProposalResponse.AsObject>,
    }


    export class EndorsedProposalResponse extends jspb.Message { 

        hasPayload(): boolean;
        clearPayload(): void;
        getPayload(): peer_proposal_response_pb.ProposalResponsePayload | undefined;
        setPayload(value?: peer_proposal_response_pb.ProposalResponsePayload): EndorsedProposalResponse;

        hasEndorsement(): boolean;
        clearEndorsement(): void;
        getEndorsement(): peer_proposal_response_pb.Endorsement | undefined;
        setEndorsement(value?: peer_proposal_response_pb.Endorsement): EndorsedProposalResponse;

        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): EndorsedProposalResponse.AsObject;
        static toObject(includeInstance: boolean, msg: EndorsedProposalResponse): EndorsedProposalResponse.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: EndorsedProposalResponse, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): EndorsedProposalResponse;
        static deserializeBinaryFromReader(message: EndorsedProposalResponse, reader: jspb.BinaryReader): EndorsedProposalResponse;
    }

    export namespace EndorsedProposalResponse {
        export type AsObject = {
            payload?: peer_proposal_response_pb.ProposalResponsePayload.AsObject,
            endorsement?: peer_proposal_response_pb.Endorsement.AsObject,
        }
    }

}
