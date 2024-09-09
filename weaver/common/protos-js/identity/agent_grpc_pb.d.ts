// package: identity.agent
// file: identity/agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as identity_agent_pb from "../identity/agent_pb";
import * as common_ack_pb from "../common/ack_pb";

interface IIINAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    syncExternalState: IIINAgentService_ISyncExternalState;
    requestIdentityConfiguration: IIINAgentService_IRequestIdentityConfiguration;
    sendIdentityConfiguration: IIINAgentService_ISendIdentityConfiguration;
    requestAttestation: IIINAgentService_IRequestAttestation;
    sendAttestation: IIINAgentService_ISendAttestation;
}

interface IIINAgentService_ISyncExternalState extends grpc.MethodDefinition<identity_agent_pb.SecurityDomainMemberIdentity, common_ack_pb.Ack> {
    path: "/identity.agent.IINAgent/SyncExternalState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<identity_agent_pb.SecurityDomainMemberIdentity>;
    requestDeserialize: grpc.deserialize<identity_agent_pb.SecurityDomainMemberIdentity>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IIINAgentService_IRequestIdentityConfiguration extends grpc.MethodDefinition<identity_agent_pb.SecurityDomainMemberIdentityRequest, common_ack_pb.Ack> {
    path: "/identity.agent.IINAgent/RequestIdentityConfiguration";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<identity_agent_pb.SecurityDomainMemberIdentityRequest>;
    requestDeserialize: grpc.deserialize<identity_agent_pb.SecurityDomainMemberIdentityRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IIINAgentService_ISendIdentityConfiguration extends grpc.MethodDefinition<identity_agent_pb.AttestedMembership, common_ack_pb.Ack> {
    path: "/identity.agent.IINAgent/SendIdentityConfiguration";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<identity_agent_pb.AttestedMembership>;
    requestDeserialize: grpc.deserialize<identity_agent_pb.AttestedMembership>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IIINAgentService_IRequestAttestation extends grpc.MethodDefinition<identity_agent_pb.CounterAttestedMembership, common_ack_pb.Ack> {
    path: "/identity.agent.IINAgent/RequestAttestation";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<identity_agent_pb.CounterAttestedMembership>;
    requestDeserialize: grpc.deserialize<identity_agent_pb.CounterAttestedMembership>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IIINAgentService_ISendAttestation extends grpc.MethodDefinition<identity_agent_pb.CounterAttestedMembership, common_ack_pb.Ack> {
    path: "/identity.agent.IINAgent/SendAttestation";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<identity_agent_pb.CounterAttestedMembership>;
    requestDeserialize: grpc.deserialize<identity_agent_pb.CounterAttestedMembership>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const IINAgentService: IIINAgentService;

export interface IIINAgentServer extends grpc.UntypedServiceImplementation {
    syncExternalState: grpc.handleUnaryCall<identity_agent_pb.SecurityDomainMemberIdentity, common_ack_pb.Ack>;
    requestIdentityConfiguration: grpc.handleUnaryCall<identity_agent_pb.SecurityDomainMemberIdentityRequest, common_ack_pb.Ack>;
    sendIdentityConfiguration: grpc.handleUnaryCall<identity_agent_pb.AttestedMembership, common_ack_pb.Ack>;
    requestAttestation: grpc.handleUnaryCall<identity_agent_pb.CounterAttestedMembership, common_ack_pb.Ack>;
    sendAttestation: grpc.handleUnaryCall<identity_agent_pb.CounterAttestedMembership, common_ack_pb.Ack>;
}

export interface IIINAgentClient {
    syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestAttestation(request: identity_agent_pb.CounterAttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAttestation(request: identity_agent_pb.CounterAttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class IINAgentClient extends grpc.Client implements IIINAgentClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public syncExternalState(request: identity_agent_pb.SecurityDomainMemberIdentity, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestIdentityConfiguration(request: identity_agent_pb.SecurityDomainMemberIdentityRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendIdentityConfiguration(request: identity_agent_pb.AttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestAttestation(request: identity_agent_pb.CounterAttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAttestation(request: identity_agent_pb.CounterAttestedMembership, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendAttestation(request: identity_agent_pb.CounterAttestedMembership, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
