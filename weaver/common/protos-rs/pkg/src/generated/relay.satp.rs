// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransferProposalClaimsRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub asset_asset_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub asset_profile_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub verified_originator_entity_id: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub verified_beneficiary_entity_id: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub originator_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub beneficiary_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub sender_gateway_network_id: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub recipient_gateway_network_id: ::prost::alloc::string::String,
    #[prost(string, tag = "10")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "11")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "12")]
    pub sender_gateway_owner_id: ::prost::alloc::string::String,
    #[prost(string, tag = "13")]
    pub receiver_gateway_owner_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransferProposalReceiptRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub asset_asset_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub asset_profile_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub verified_originator_entity_id: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub verified_beneficiary_entity_id: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub originator_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub beneficiary_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub sender_gateway_network_id: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub recipient_gateway_network_id: ::prost::alloc::string::String,
    #[prost(string, tag = "10")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "11")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "12")]
    pub sender_gateway_owner_id: ::prost::alloc::string::String,
    #[prost(string, tag = "13")]
    pub receiver_gateway_owner_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransferCommenceRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub hash_transfer_init_claims: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub hash_prev_message: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub client_transfer_number: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub client_signature: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct AckCommenceRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub hash_prev_message: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub server_transfer_number: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub server_signature: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SendAssetStatusRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub hash_prev_message: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub server_transfer_number: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub server_signature: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub status: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct LockAssertionRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub lock_assertion_claim: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub lock_assertion_claim_format: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub lock_assertion_expiration: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub hash_prev_message: ::prost::alloc::string::String,
    #[prost(string, tag = "10")]
    pub client_transfer_number: ::prost::alloc::string::String,
    #[prost(string, tag = "11")]
    pub client_signature: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct LockAssertionReceiptRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub client_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub server_identity_pubkey: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub hash_prev_message: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub server_transfer_number: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub server_signature: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct CommitPrepareRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct CommitReadyRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct CommitFinalAssertionRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct AckFinalReceiptRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransferCompletedRequest {
    #[prost(string, tag = "1")]
    pub message_type: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub session_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transfer_context_id: ::prost::alloc::string::String,
}
/// Generated client implementations.
pub mod satp_client {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    use tonic::codegen::http::Uri;
    #[derive(Debug, Clone)]
    pub struct SatpClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl SatpClient<tonic::transport::Channel> {
        /// Attempt to create a new client by connecting to a given endpoint.
        pub async fn connect<D>(dst: D) -> Result<Self, tonic::transport::Error>
        where
            D: std::convert::TryInto<tonic::transport::Endpoint>,
            D::Error: Into<StdError>,
        {
            let conn = tonic::transport::Endpoint::new(dst)?.connect().await?;
            Ok(Self::new(conn))
        }
    }
    impl<T> SatpClient<T>
    where
        T: tonic::client::GrpcService<tonic::body::BoxBody>,
        T::Error: Into<StdError>,
        T::ResponseBody: Body<Data = Bytes> + Send + 'static,
        <T::ResponseBody as Body>::Error: Into<StdError> + Send,
    {
        pub fn new(inner: T) -> Self {
            let inner = tonic::client::Grpc::new(inner);
            Self { inner }
        }
        pub fn with_origin(inner: T, origin: Uri) -> Self {
            let inner = tonic::client::Grpc::with_origin(inner, origin);
            Self { inner }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> SatpClient<InterceptedService<T, F>>
        where
            F: tonic::service::Interceptor,
            T::ResponseBody: Default,
            T: tonic::codegen::Service<
                http::Request<tonic::body::BoxBody>,
                Response = http::Response<
                    <T as tonic::client::GrpcService<tonic::body::BoxBody>>::ResponseBody,
                >,
            >,
            <T as tonic::codegen::Service<
                http::Request<tonic::body::BoxBody>,
            >>::Error: Into<StdError> + Send + Sync,
        {
            SatpClient::new(InterceptedService::new(inner, interceptor))
        }
        /// Compress requests with the given encoding.
        ///
        /// This requires the server to support it otherwise it might respond with an
        /// error.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.send_compressed(encoding);
            self
        }
        /// Enable decompressing responses.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.accept_compressed(encoding);
            self
        }
        /// The sender gateway sends a TransferProposalClaims request to initiate an asset transfer.
        /// Depending on the proposal, multiple rounds of communication between the two gateways may happen.
        pub async fn transfer_proposal_claims(
            &mut self,
            request: impl tonic::IntoRequest<super::TransferProposalClaimsRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/TransferProposalClaims",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// The sender gateway sends a TransferProposalClaims request to signal to the receiver gateway
        /// that the it is ready to start the transfer of the digital asset
        pub async fn transfer_proposal_receipt(
            &mut self,
            request: impl tonic::IntoRequest<super::TransferProposalReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/TransferProposalReceipt",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// The sender gateway sends a TransferCommence request to signal to the receiver gateway
        /// that the it is ready to start the transfer of the digital asset
        pub async fn transfer_commence(
            &mut self,
            request: impl tonic::IntoRequest<super::TransferCommenceRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/TransferCommence",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// The receiver gateway sends a AckCommence request to the sender gateway to indicate agreement
        /// to proceed with the asset transfe
        pub async fn ack_commence(
            &mut self,
            request: impl tonic::IntoRequest<super::AckCommenceRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/AckCommence",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn send_asset_status(
            &mut self,
            request: impl tonic::IntoRequest<super::SendAssetStatusRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/SendAssetStatus",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// The sender gateway sends a LockAssertion request to convey a signed claim to the receiver gateway
        /// declaring that the asset in question has been locked or escrowed by the sender gateway in
        /// the origin network (e.g. to prevent double spending)
        pub async fn lock_assertion(
            &mut self,
            request: impl tonic::IntoRequest<super::LockAssertionRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/LockAssertion",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// The receiver gateway sends a LockAssertionReceipt request to the sender gateway to indicate acceptance
        /// of the claim(s) delivered by the sender gateway in the previous message
        pub async fn lock_assertion_receipt(
            &mut self,
            request: impl tonic::IntoRequest<super::LockAssertionReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/LockAssertionReceipt",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn commit_prepare(
            &mut self,
            request: impl tonic::IntoRequest<super::CommitPrepareRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/CommitPrepare",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn commit_ready(
            &mut self,
            request: impl tonic::IntoRequest<super::CommitReadyRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/CommitReady",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn commit_final_assertion(
            &mut self,
            request: impl tonic::IntoRequest<super::CommitFinalAssertionRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/CommitFinalAssertion",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn ack_final_receipt(
            &mut self,
            request: impl tonic::IntoRequest<super::AckFinalReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/AckFinalReceipt",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        pub async fn transfer_completed(
            &mut self,
            request: impl tonic::IntoRequest<super::TransferCompletedRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::new(
                        tonic::Code::Unknown,
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.satp.SATP/TransferCompleted",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
    }
}
/// Generated server implementations.
pub mod satp_server {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    /// Generated trait containing gRPC methods that should be implemented for use with SatpServer.
    #[async_trait]
    pub trait Satp: Send + Sync + 'static {
        /// The sender gateway sends a TransferProposalClaims request to initiate an asset transfer.
        /// Depending on the proposal, multiple rounds of communication between the two gateways may happen.
        async fn transfer_proposal_claims(
            &self,
            request: tonic::Request<super::TransferProposalClaimsRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// The sender gateway sends a TransferProposalClaims request to signal to the receiver gateway
        /// that the it is ready to start the transfer of the digital asset
        async fn transfer_proposal_receipt(
            &self,
            request: tonic::Request<super::TransferProposalReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// The sender gateway sends a TransferCommence request to signal to the receiver gateway
        /// that the it is ready to start the transfer of the digital asset
        async fn transfer_commence(
            &self,
            request: tonic::Request<super::TransferCommenceRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// The receiver gateway sends a AckCommence request to the sender gateway to indicate agreement
        /// to proceed with the asset transfe
        async fn ack_commence(
            &self,
            request: tonic::Request<super::AckCommenceRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn send_asset_status(
            &self,
            request: tonic::Request<super::SendAssetStatusRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// The sender gateway sends a LockAssertion request to convey a signed claim to the receiver gateway
        /// declaring that the asset in question has been locked or escrowed by the sender gateway in
        /// the origin network (e.g. to prevent double spending)
        async fn lock_assertion(
            &self,
            request: tonic::Request<super::LockAssertionRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// The receiver gateway sends a LockAssertionReceipt request to the sender gateway to indicate acceptance
        /// of the claim(s) delivered by the sender gateway in the previous message
        async fn lock_assertion_receipt(
            &self,
            request: tonic::Request<super::LockAssertionReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn commit_prepare(
            &self,
            request: tonic::Request<super::CommitPrepareRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn commit_ready(
            &self,
            request: tonic::Request<super::CommitReadyRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn commit_final_assertion(
            &self,
            request: tonic::Request<super::CommitFinalAssertionRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn ack_final_receipt(
            &self,
            request: tonic::Request<super::AckFinalReceiptRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        async fn transfer_completed(
            &self,
            request: tonic::Request<super::TransferCompletedRequest>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
    }
    #[derive(Debug)]
    pub struct SatpServer<T: Satp> {
        inner: _Inner<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
    }
    struct _Inner<T>(Arc<T>);
    impl<T: Satp> SatpServer<T> {
        pub fn new(inner: T) -> Self {
            Self::from_arc(Arc::new(inner))
        }
        pub fn from_arc(inner: Arc<T>) -> Self {
            let inner = _Inner(inner);
            Self {
                inner,
                accept_compression_encodings: Default::default(),
                send_compression_encodings: Default::default(),
            }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> InterceptedService<Self, F>
        where
            F: tonic::service::Interceptor,
        {
            InterceptedService::new(Self::new(inner), interceptor)
        }
        /// Enable decompressing requests with the given encoding.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.accept_compression_encodings.enable(encoding);
            self
        }
        /// Compress responses with the given encoding, if the client supports it.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.send_compression_encodings.enable(encoding);
            self
        }
    }
    impl<T, B> tonic::codegen::Service<http::Request<B>> for SatpServer<T>
    where
        T: Satp,
        B: Body + Send + 'static,
        B::Error: Into<StdError> + Send + 'static,
    {
        type Response = http::Response<tonic::body::BoxBody>;
        type Error = std::convert::Infallible;
        type Future = BoxFuture<Self::Response, Self::Error>;
        fn poll_ready(
            &mut self,
            _cx: &mut Context<'_>,
        ) -> Poll<Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }
        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            let inner = self.inner.clone();
            match req.uri().path() {
                "/relay.satp.SATP/TransferProposalClaims" => {
                    #[allow(non_camel_case_types)]
                    struct TransferProposalClaimsSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::TransferProposalClaimsRequest>
                    for TransferProposalClaimsSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::TransferProposalClaimsRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).transfer_proposal_claims(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = TransferProposalClaimsSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/TransferProposalReceipt" => {
                    #[allow(non_camel_case_types)]
                    struct TransferProposalReceiptSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::TransferProposalReceiptRequest>
                    for TransferProposalReceiptSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::TransferProposalReceiptRequest,
                            >,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).transfer_proposal_receipt(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = TransferProposalReceiptSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/TransferCommence" => {
                    #[allow(non_camel_case_types)]
                    struct TransferCommenceSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::TransferCommenceRequest>
                    for TransferCommenceSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::TransferCommenceRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).transfer_commence(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = TransferCommenceSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/AckCommence" => {
                    #[allow(non_camel_case_types)]
                    struct AckCommenceSvc<T: Satp>(pub Arc<T>);
                    impl<T: Satp> tonic::server::UnaryService<super::AckCommenceRequest>
                    for AckCommenceSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::AckCommenceRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).ack_commence(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = AckCommenceSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/SendAssetStatus" => {
                    #[allow(non_camel_case_types)]
                    struct SendAssetStatusSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::SendAssetStatusRequest>
                    for SendAssetStatusSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SendAssetStatusRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).send_asset_status(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = SendAssetStatusSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/LockAssertion" => {
                    #[allow(non_camel_case_types)]
                    struct LockAssertionSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::LockAssertionRequest>
                    for LockAssertionSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::LockAssertionRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).lock_assertion(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = LockAssertionSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/LockAssertionReceipt" => {
                    #[allow(non_camel_case_types)]
                    struct LockAssertionReceiptSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::LockAssertionReceiptRequest>
                    for LockAssertionReceiptSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::LockAssertionReceiptRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).lock_assertion_receipt(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = LockAssertionReceiptSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/CommitPrepare" => {
                    #[allow(non_camel_case_types)]
                    struct CommitPrepareSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::CommitPrepareRequest>
                    for CommitPrepareSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CommitPrepareRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).commit_prepare(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = CommitPrepareSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/CommitReady" => {
                    #[allow(non_camel_case_types)]
                    struct CommitReadySvc<T: Satp>(pub Arc<T>);
                    impl<T: Satp> tonic::server::UnaryService<super::CommitReadyRequest>
                    for CommitReadySvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CommitReadyRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).commit_ready(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = CommitReadySvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/CommitFinalAssertion" => {
                    #[allow(non_camel_case_types)]
                    struct CommitFinalAssertionSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::CommitFinalAssertionRequest>
                    for CommitFinalAssertionSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CommitFinalAssertionRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).commit_final_assertion(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = CommitFinalAssertionSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/AckFinalReceipt" => {
                    #[allow(non_camel_case_types)]
                    struct AckFinalReceiptSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::AckFinalReceiptRequest>
                    for AckFinalReceiptSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::AckFinalReceiptRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).ack_final_receipt(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = AckFinalReceiptSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/relay.satp.SATP/TransferCompleted" => {
                    #[allow(non_camel_case_types)]
                    struct TransferCompletedSvc<T: Satp>(pub Arc<T>);
                    impl<
                        T: Satp,
                    > tonic::server::UnaryService<super::TransferCompletedRequest>
                    for TransferCompletedSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::TransferCompletedRequest>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).transfer_completed(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = TransferCompletedSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                _ => {
                    Box::pin(async move {
                        Ok(
                            http::Response::builder()
                                .status(200)
                                .header("grpc-status", "12")
                                .header("content-type", "application/grpc")
                                .body(empty_body())
                                .unwrap(),
                        )
                    })
                }
            }
        }
    }
    impl<T: Satp> Clone for SatpServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
            }
        }
    }
    impl<T: Satp> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(self.0.clone())
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: Satp> tonic::server::NamedService for SatpServer<T> {
        const NAME: &'static str = "relay.satp.SATP";
    }
}
