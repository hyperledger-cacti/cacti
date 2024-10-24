// package: relay.satp
// file: relay/satp.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as relay_satp_pb from "../relay/satp_pb";
import * as common_ack_pb from "../common/ack_pb";

interface ISATPService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    transferProposalClaims: ISATPService_ITransferProposalClaims;
    transferProposalReceipt: ISATPService_ITransferProposalReceipt;
    transferCommence: ISATPService_ITransferCommence;
    ackCommence: ISATPService_IAckCommence;
    sendAssetStatus: ISATPService_ISendAssetStatus;
    lockAssertion: ISATPService_ILockAssertion;
    lockAssertionReceipt: ISATPService_ILockAssertionReceipt;
    commitPrepare: ISATPService_ICommitPrepare;
    commitReady: ISATPService_ICommitReady;
    commitFinalAssertion: ISATPService_ICommitFinalAssertion;
    ackFinalReceipt: ISATPService_IAckFinalReceipt;
    transferCompleted: ISATPService_ITransferCompleted;
}

interface ISATPService_ITransferProposalClaims extends grpc.MethodDefinition<relay_satp_pb.TransferProposalClaimsRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/TransferProposalClaims";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.TransferProposalClaimsRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.TransferProposalClaimsRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ITransferProposalReceipt extends grpc.MethodDefinition<relay_satp_pb.TransferProposalReceiptRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/TransferProposalReceipt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.TransferProposalReceiptRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.TransferProposalReceiptRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ITransferCommence extends grpc.MethodDefinition<relay_satp_pb.TransferCommenceRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/TransferCommence";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.TransferCommenceRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.TransferCommenceRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_IAckCommence extends grpc.MethodDefinition<relay_satp_pb.AckCommenceRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/AckCommence";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.AckCommenceRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.AckCommenceRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ISendAssetStatus extends grpc.MethodDefinition<relay_satp_pb.SendAssetStatusRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/SendAssetStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.SendAssetStatusRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.SendAssetStatusRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ILockAssertion extends grpc.MethodDefinition<relay_satp_pb.LockAssertionRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/LockAssertion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.LockAssertionRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.LockAssertionRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ILockAssertionReceipt extends grpc.MethodDefinition<relay_satp_pb.LockAssertionReceiptRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/LockAssertionReceipt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.LockAssertionReceiptRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.LockAssertionReceiptRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ICommitPrepare extends grpc.MethodDefinition<relay_satp_pb.CommitPrepareRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/CommitPrepare";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.CommitPrepareRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.CommitPrepareRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ICommitReady extends grpc.MethodDefinition<relay_satp_pb.CommitReadyRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/CommitReady";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.CommitReadyRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.CommitReadyRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ICommitFinalAssertion extends grpc.MethodDefinition<relay_satp_pb.CommitFinalAssertionRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/CommitFinalAssertion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.CommitFinalAssertionRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.CommitFinalAssertionRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_IAckFinalReceipt extends grpc.MethodDefinition<relay_satp_pb.AckFinalReceiptRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/AckFinalReceipt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.AckFinalReceiptRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.AckFinalReceiptRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface ISATPService_ITransferCompleted extends grpc.MethodDefinition<relay_satp_pb.TransferCompletedRequest, common_ack_pb.Ack> {
    path: "/relay.satp.SATP/TransferCompleted";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<relay_satp_pb.TransferCompletedRequest>;
    requestDeserialize: grpc.deserialize<relay_satp_pb.TransferCompletedRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const SATPService: ISATPService;

export interface ISATPServer extends grpc.UntypedServiceImplementation {
    transferProposalClaims: grpc.handleUnaryCall<relay_satp_pb.TransferProposalClaimsRequest, common_ack_pb.Ack>;
    transferProposalReceipt: grpc.handleUnaryCall<relay_satp_pb.TransferProposalReceiptRequest, common_ack_pb.Ack>;
    transferCommence: grpc.handleUnaryCall<relay_satp_pb.TransferCommenceRequest, common_ack_pb.Ack>;
    ackCommence: grpc.handleUnaryCall<relay_satp_pb.AckCommenceRequest, common_ack_pb.Ack>;
    sendAssetStatus: grpc.handleUnaryCall<relay_satp_pb.SendAssetStatusRequest, common_ack_pb.Ack>;
    lockAssertion: grpc.handleUnaryCall<relay_satp_pb.LockAssertionRequest, common_ack_pb.Ack>;
    lockAssertionReceipt: grpc.handleUnaryCall<relay_satp_pb.LockAssertionReceiptRequest, common_ack_pb.Ack>;
    commitPrepare: grpc.handleUnaryCall<relay_satp_pb.CommitPrepareRequest, common_ack_pb.Ack>;
    commitReady: grpc.handleUnaryCall<relay_satp_pb.CommitReadyRequest, common_ack_pb.Ack>;
    commitFinalAssertion: grpc.handleUnaryCall<relay_satp_pb.CommitFinalAssertionRequest, common_ack_pb.Ack>;
    ackFinalReceipt: grpc.handleUnaryCall<relay_satp_pb.AckFinalReceiptRequest, common_ack_pb.Ack>;
    transferCompleted: grpc.handleUnaryCall<relay_satp_pb.TransferCompletedRequest, common_ack_pb.Ack>;
}

export interface ISATPClient {
    transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCommence(request: relay_satp_pb.TransferCommenceRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCommence(request: relay_satp_pb.TransferCommenceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCommence(request: relay_satp_pb.TransferCommenceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackCommence(request: relay_satp_pb.AckCommenceRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackCommence(request: relay_satp_pb.AckCommenceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackCommence(request: relay_satp_pb.AckCommenceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertion(request: relay_satp_pb.LockAssertionRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertion(request: relay_satp_pb.LockAssertionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertion(request: relay_satp_pb.LockAssertionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitPrepare(request: relay_satp_pb.CommitPrepareRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitPrepare(request: relay_satp_pb.CommitPrepareRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitPrepare(request: relay_satp_pb.CommitPrepareRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitReady(request: relay_satp_pb.CommitReadyRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitReady(request: relay_satp_pb.CommitReadyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitReady(request: relay_satp_pb.CommitReadyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCompleted(request: relay_satp_pb.TransferCompletedRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCompleted(request: relay_satp_pb.TransferCompletedRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    transferCompleted(request: relay_satp_pb.TransferCompletedRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class SATPClient extends grpc.Client implements ISATPClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferProposalClaims(request: relay_satp_pb.TransferProposalClaimsRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferProposalReceipt(request: relay_satp_pb.TransferProposalReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCommence(request: relay_satp_pb.TransferCommenceRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCommence(request: relay_satp_pb.TransferCommenceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCommence(request: relay_satp_pb.TransferCommenceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackCommence(request: relay_satp_pb.AckCommenceRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackCommence(request: relay_satp_pb.AckCommenceRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackCommence(request: relay_satp_pb.AckCommenceRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAssetStatus(request: relay_satp_pb.SendAssetStatusRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertion(request: relay_satp_pb.LockAssertionRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertion(request: relay_satp_pb.LockAssertionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertion(request: relay_satp_pb.LockAssertionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public lockAssertionReceipt(request: relay_satp_pb.LockAssertionReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitPrepare(request: relay_satp_pb.CommitPrepareRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitPrepare(request: relay_satp_pb.CommitPrepareRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitPrepare(request: relay_satp_pb.CommitPrepareRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitReady(request: relay_satp_pb.CommitReadyRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitReady(request: relay_satp_pb.CommitReadyRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitReady(request: relay_satp_pb.CommitReadyRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public commitFinalAssertion(request: relay_satp_pb.CommitFinalAssertionRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public ackFinalReceipt(request: relay_satp_pb.AckFinalReceiptRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCompleted(request: relay_satp_pb.TransferCompletedRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCompleted(request: relay_satp_pb.TransferCompletedRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public transferCompleted(request: relay_satp_pb.TransferCompletedRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
