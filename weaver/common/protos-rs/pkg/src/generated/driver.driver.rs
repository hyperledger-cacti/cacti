/// Data for a View processing by dest-driver
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct WriteExternalStateMessage {
    #[prost(message, optional, tag = "1")]
    pub view_payload: ::core::option::Option<super::super::common::state::ViewPayload>,
    #[prost(message, optional, tag = "2")]
    pub ctx: ::core::option::Option<super::super::common::events::ContractTransaction>,
}
/// Generated client implementations.
pub mod driver_communication_client {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    use tonic::codegen::http::Uri;
    #[derive(Debug, Clone)]
    pub struct DriverCommunicationClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl DriverCommunicationClient<tonic::transport::Channel> {
        /// Attempt to create a new client by connecting to a given endpoint.
        pub async fn connect<D>(dst: D) -> Result<Self, tonic::transport::Error>
        where
            D: TryInto<tonic::transport::Endpoint>,
            D::Error: Into<StdError>,
        {
            let conn = tonic::transport::Endpoint::new(dst)?.connect().await?;
            Ok(Self::new(conn))
        }
    }
    impl<T> DriverCommunicationClient<T>
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
        ) -> DriverCommunicationClient<InterceptedService<T, F>>
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
            DriverCommunicationClient::new(InterceptedService::new(inner, interceptor))
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
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_decoding_message_size(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_encoding_message_size(limit);
            self
        }
        /// Data Sharing
        /// the remote relay sends a RequestDriverState request to its driver with a
        /// query defining the data it wants to receive
        pub async fn request_driver_state(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::query::Query>,
        ) -> std::result::Result<
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
                "/driver.driver.DriverCommunication/RequestDriverState",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "driver.driver.DriverCommunication",
                        "RequestDriverState",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        /// Events Subscription
        /// the src-relay uses this endpoint to forward the event subscription request from dest-relay to driver
        pub async fn subscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<
                super::super::super::common::events::EventSubscription,
            >,
        ) -> std::result::Result<
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
                "/driver.driver.DriverCommunication/SubscribeEvent",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "driver.driver.DriverCommunication",
                        "SubscribeEvent",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        /// Recommended to have TLS mode on for this unsafe endpoint
        /// Relay uses this to get Query.requestor_signature and
        /// Query.certificate required for event subscription
        pub async fn request_signed_event_subscription_query(
            &mut self,
            request: impl tonic::IntoRequest<
                super::super::super::common::events::EventSubscription,
            >,
        ) -> std::result::Result<
            tonic::Response<super::super::super::common::query::Query>,
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
                "/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "driver.driver.DriverCommunication",
                        "RequestSignedEventSubscriptionQuery",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        /// Events Publication
        /// the dest-relay calls the dest-driver on this end point to write the remote network state to the local ledger
        pub async fn write_external_state(
            &mut self,
            request: impl tonic::IntoRequest<super::WriteExternalStateMessage>,
        ) -> std::result::Result<
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
                "/driver.driver.DriverCommunication/WriteExternalState",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "driver.driver.DriverCommunication",
                        "WriteExternalState",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
    }
}
/// Generated server implementations.
pub mod driver_communication_server {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;
    /// Generated trait containing gRPC methods that should be implemented for use with DriverCommunicationServer.
    #[async_trait]
    pub trait DriverCommunication: Send + Sync + 'static {
        /// Data Sharing
        /// the remote relay sends a RequestDriverState request to its driver with a
        /// query defining the data it wants to receive
        async fn request_driver_state(
            &self,
            request: tonic::Request<super::super::super::common::query::Query>,
        ) -> std::result::Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// Events Subscription
        /// the src-relay uses this endpoint to forward the event subscription request from dest-relay to driver
        async fn subscribe_event(
            &self,
            request: tonic::Request<
                super::super::super::common::events::EventSubscription,
            >,
        ) -> std::result::Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
        /// Recommended to have TLS mode on for this unsafe endpoint
        /// Relay uses this to get Query.requestor_signature and
        /// Query.certificate required for event subscription
        async fn request_signed_event_subscription_query(
            &self,
            request: tonic::Request<
                super::super::super::common::events::EventSubscription,
            >,
        ) -> std::result::Result<
            tonic::Response<super::super::super::common::query::Query>,
            tonic::Status,
        >;
        /// Events Publication
        /// the dest-relay calls the dest-driver on this end point to write the remote network state to the local ledger
        async fn write_external_state(
            &self,
            request: tonic::Request<super::WriteExternalStateMessage>,
        ) -> std::result::Result<
            tonic::Response<super::super::super::common::ack::Ack>,
            tonic::Status,
        >;
    }
    #[derive(Debug)]
    pub struct DriverCommunicationServer<T: DriverCommunication> {
        inner: _Inner<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
        max_decoding_message_size: Option<usize>,
        max_encoding_message_size: Option<usize>,
    }
    struct _Inner<T>(Arc<T>);
    impl<T: DriverCommunication> DriverCommunicationServer<T> {
        pub fn new(inner: T) -> Self {
            Self::from_arc(Arc::new(inner))
        }
        pub fn from_arc(inner: Arc<T>) -> Self {
            let inner = _Inner(inner);
            Self {
                inner,
                accept_compression_encodings: Default::default(),
                send_compression_encodings: Default::default(),
                max_decoding_message_size: None,
                max_encoding_message_size: None,
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
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.max_decoding_message_size = Some(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.max_encoding_message_size = Some(limit);
            self
        }
    }
    impl<T, B> tonic::codegen::Service<http::Request<B>> for DriverCommunicationServer<T>
    where
        T: DriverCommunication,
        B: Body + Send + 'static,
        B::Error: Into<StdError> + Send + 'static,
    {
        type Response = http::Response<tonic::body::BoxBody>;
        type Error = std::convert::Infallible;
        type Future = BoxFuture<Self::Response, Self::Error>;
        fn poll_ready(
            &mut self,
            _cx: &mut Context<'_>,
        ) -> Poll<std::result::Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }
        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            let inner = self.inner.clone();
            match req.uri().path() {
                "/driver.driver.DriverCommunication/RequestDriverState" => {
                    #[allow(non_camel_case_types)]
                    struct RequestDriverStateSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<
                        T: DriverCommunication,
                    > tonic::server::UnaryService<
                        super::super::super::common::query::Query,
                    > for RequestDriverStateSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::query::Query,
                            >,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as DriverCommunication>::request_driver_state(
                                        &inner,
                                        request,
                                    )
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = RequestDriverStateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/SubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct SubscribeEventSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<
                        T: DriverCommunication,
                    > tonic::server::UnaryService<
                        super::super::super::common::events::EventSubscription,
                    > for SubscribeEventSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::events::EventSubscription,
                            >,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as DriverCommunication>::subscribe_event(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = SubscribeEventSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery" => {
                    #[allow(non_camel_case_types)]
                    struct RequestSignedEventSubscriptionQuerySvc<
                        T: DriverCommunication,
                    >(
                        pub Arc<T>,
                    );
                    impl<
                        T: DriverCommunication,
                    > tonic::server::UnaryService<
                        super::super::super::common::events::EventSubscription,
                    > for RequestSignedEventSubscriptionQuerySvc<T> {
                        type Response = super::super::super::common::query::Query;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::events::EventSubscription,
                            >,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as DriverCommunication>::request_signed_event_subscription_query(
                                        &inner,
                                        request,
                                    )
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = RequestSignedEventSubscriptionQuerySvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/WriteExternalState" => {
                    #[allow(non_camel_case_types)]
                    struct WriteExternalStateSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<
                        T: DriverCommunication,
                    > tonic::server::UnaryService<super::WriteExternalStateMessage>
                    for WriteExternalStateSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::WriteExternalStateMessage>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as DriverCommunication>::write_external_state(
                                        &inner,
                                        request,
                                    )
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let inner = inner.0;
                        let method = WriteExternalStateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
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
    impl<T: DriverCommunication> Clone for DriverCommunicationServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
                max_decoding_message_size: self.max_decoding_message_size,
                max_encoding_message_size: self.max_encoding_message_size,
            }
        }
    }
    impl<T: DriverCommunication> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(Arc::clone(&self.0))
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: DriverCommunication> tonic::server::NamedService
    for DriverCommunicationServer<T> {
        const NAME: &'static str = "driver.driver.DriverCommunication";
    }
}
