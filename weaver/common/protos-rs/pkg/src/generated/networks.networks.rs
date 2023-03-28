#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct DbName {
    #[prost(string, tag = "1")]
    pub name: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RelayDatabase {
    #[prost(map = "string, string", tag = "1")]
    pub pairs: ::std::collections::HashMap<
        ::prost::alloc::string::String,
        ::prost::alloc::string::String,
    >,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct GetStateMessage {
    #[prost(string, tag = "1")]
    pub request_id: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct NetworkQuery {
    #[prost(string, repeated, tag = "1")]
    pub policy: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(string, tag = "2")]
    pub address: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub requesting_relay: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub requesting_network: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub certificate: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub requestor_signature: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub nonce: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub requesting_org: ::prost::alloc::string::String,
    #[prost(bool, tag = "9")]
    pub confidential: bool,
}
/// Below message is used for network/client to dest-relay communication
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct NetworkEventSubscription {
    #[prost(message, optional, tag = "1")]
    pub event_matcher: ::core::option::Option<
        super::super::common::events::EventMatcher,
    >,
    #[prost(message, optional, tag = "2")]
    pub query: ::core::option::Option<NetworkQuery>,
    #[prost(message, optional, tag = "3")]
    pub event_publication_spec: ::core::option::Option<
        super::super::common::events::EventPublication,
    >,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct NetworkEventUnsubscription {
    #[prost(message, optional, tag = "1")]
    pub request: ::core::option::Option<NetworkEventSubscription>,
    #[prost(string, tag = "2")]
    pub request_id: ::prost::alloc::string::String,
}
/// Generated client implementations.
pub mod network_client {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    use tonic::codegen::http::Uri;
    /// This service is the interface for how the network communicates with
    /// its relay.
    #[derive(Debug, Clone)]
    pub struct NetworkClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl NetworkClient<tonic::transport::Channel> {
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
    impl<T> NetworkClient<T>
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
        ) -> NetworkClient<InterceptedService<T, F>>
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
            NetworkClient::new(InterceptedService::new(inner, interceptor))
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
        /// Data Sharing endpoints
        /// endpoint for a network to request remote relay state via local relay
        pub async fn request_state(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkQuery>,
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
                "/networks.networks.Network/RequestState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// This rpc endpoint is for polling the local relay for request state.
        pub async fn get_state(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::state::RequestState>,
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
                "/networks.networks.Network/GetState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// NOTE: This rpc is just for debugging.
        pub async fn request_database(
            &mut self,
            request: impl tonic::IntoRequest<super::DbName>,
        ) -> Result<tonic::Response<super::RelayDatabase>, tonic::Status> {
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
                "/networks.networks.Network/RequestDatabase",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// Event endpoints
        /// endpoint for a client to subscribe to event via local relay initiating subscription flow.
        pub async fn subscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkEventSubscription>,
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
                "/networks.networks.Network/SubscribeEvent",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// This rpc endpoint is for polling the local relay for subscription state.
        pub async fn get_event_subscription_state(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventSubscriptionState>,
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
                "/networks.networks.Network/GetEventSubscriptionState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// endpoint for a client to subscribe to event via local relay initiating subscription flow.
        pub async fn unsubscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkEventUnsubscription>,
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
                "/networks.networks.Network/UnsubscribeEvent",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        /// endpoint for a client to fetch received events.
        /// Note: events are marked as deleted from relay database as soon as client fetches them.
        pub async fn get_event_states(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventStates>,
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
                "/networks.networks.Network/GetEventStates",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
    }
}
/// Generated server implementations.
pub mod network_server {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    /// Generated trait containing gRPC methods that should be implemented for use with NetworkServer.
    #[async_trait]
    pub trait Network: Send + Sync + 'static {
        /// Data Sharing endpoints
        /// endpoint for a network to request remote relay state via local relay
        async fn request_state(
            &self,
            request: tonic::Request<super::NetworkQuery>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// This rpc endpoint is for polling the local relay for request state.
        async fn get_state(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::state::RequestState>,
            tonic::Status,
        >;
        /// NOTE: This rpc is just for debugging.
        async fn request_database(
            &self,
            request: tonic::Request<super::DbName>,
        ) -> Result<tonic::Response<super::RelayDatabase>, tonic::Status>;
        /// Event endpoints
        /// endpoint for a client to subscribe to event via local relay initiating subscription flow.
        async fn subscribe_event(
            &self,
            request: tonic::Request<super::NetworkEventSubscription>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// This rpc endpoint is for polling the local relay for subscription state.
        async fn get_event_subscription_state(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventSubscriptionState>,
            tonic::Status,
        >;
        /// endpoint for a client to subscribe to event via local relay initiating subscription flow.
        async fn unsubscribe_event(
            &self,
            request: tonic::Request<super::NetworkEventUnsubscription>,
        ) -> Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// endpoint for a client to fetch received events.
        /// Note: events are marked as deleted from relay database as soon as client fetches them.
        async fn get_event_states(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventStates>,
            tonic::Status,
        >;
    }
    /// This service is the interface for how the network communicates with
    /// its relay.
    #[derive(Debug)]
    pub struct NetworkServer<T: Network> {
        inner: _Inner<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
    }
    struct _Inner<T>(Arc<T>);
    impl<T: Network> NetworkServer<T> {
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
    impl<T, B> tonic::codegen::Service<http::Request<B>> for NetworkServer<T>
    where
        T: Network,
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
                "/networks.networks.Network/RequestState" => {
                    #[allow(non_camel_case_types)]
                    struct RequestStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::NetworkQuery>
                    for RequestStateSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkQuery>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).request_state(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = RequestStateSvc(inner);
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
                "/networks.networks.Network/GetState" => {
                    #[allow(non_camel_case_types)]
                    struct GetStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage>
                    for GetStateSvc<T> {
                        type Response = super::super::super::common::state::RequestState;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { (*inner).get_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = GetStateSvc(inner);
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
                "/networks.networks.Network/RequestDatabase" => {
                    #[allow(non_camel_case_types)]
                    struct RequestDatabaseSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::DbName>
                    for RequestDatabaseSvc<T> {
                        type Response = super::RelayDatabase;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::DbName>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).request_database(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = RequestDatabaseSvc(inner);
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
                "/networks.networks.Network/SubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct SubscribeEventSvc<T: Network>(pub Arc<T>);
                    impl<
                        T: Network,
                    > tonic::server::UnaryService<super::NetworkEventSubscription>
                    for SubscribeEventSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkEventSubscription>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).subscribe_event(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = SubscribeEventSvc(inner);
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
                "/networks.networks.Network/GetEventSubscriptionState" => {
                    #[allow(non_camel_case_types)]
                    struct GetEventSubscriptionStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage>
                    for GetEventSubscriptionStateSvc<T> {
                        type Response = super::super::super::common::events::EventSubscriptionState;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).get_event_subscription_state(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = GetEventSubscriptionStateSvc(inner);
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
                "/networks.networks.Network/UnsubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct UnsubscribeEventSvc<T: Network>(pub Arc<T>);
                    impl<
                        T: Network,
                    > tonic::server::UnaryService<super::NetworkEventUnsubscription>
                    for UnsubscribeEventSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkEventUnsubscription>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).unsubscribe_event(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = UnsubscribeEventSvc(inner);
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
                "/networks.networks.Network/GetEventStates" => {
                    #[allow(non_camel_case_types)]
                    struct GetEventStatesSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage>
                    for GetEventStatesSvc<T> {
                        type Response = super::super::super::common::events::EventStates;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                (*inner).get_event_states(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = GetEventStatesSvc(inner);
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
    impl<T: Network> Clone for NetworkServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
            }
        }
    }
    impl<T: Network> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(self.0.clone())
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: Network> tonic::server::NamedService for NetworkServer<T> {
        const NAME: &'static str = "networks.networks.Network";
    }
}
