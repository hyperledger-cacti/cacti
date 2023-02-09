/// Data for a View processing by dest-driver
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct WriteExternalStateMessage {
    #[prost(message, optional, tag = "1")]
    pub view_payload: ::std::option::Option<super::super::common::state::ViewPayload>,
    #[prost(message, optional, tag = "2")]
    pub ctx: ::std::option::Option<super::super::common::events::ContractTransaction>,
}
#[doc = r" Generated client implementations."]
pub mod driver_communication_client {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    pub struct DriverCommunicationClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl DriverCommunicationClient<tonic::transport::Channel> {
        #[doc = r" Attempt to create a new client by connecting to a given endpoint."]
        pub async fn connect<D>(dst: D) -> Result<Self, tonic::transport::Error>
        where
            D: std::convert::TryInto<tonic::transport::Endpoint>,
            D::Error: Into<StdError>,
        {
            let conn = tonic::transport::Endpoint::new(dst)?.connect().await?;
            Ok(Self::new(conn))
        }
    }
    impl<T> DriverCommunicationClient<T>
    where
        T: tonic::client::GrpcService<tonic::body::BoxBody>,
        T::ResponseBody: Body + HttpBody + Send + 'static,
        T::Error: Into<StdError>,
        <T::ResponseBody as HttpBody>::Error: Into<StdError> + Send,
    {
        pub fn new(inner: T) -> Self {
            let inner = tonic::client::Grpc::new(inner);
            Self { inner }
        }
        pub fn with_interceptor(inner: T, interceptor: impl Into<tonic::Interceptor>) -> Self {
            let inner = tonic::client::Grpc::with_interceptor(inner, interceptor);
            Self { inner }
        }
        #[doc = " Data Sharing "]
        #[doc = " the remote relay sends a RequestDriverState request to its driver with a"]
        #[doc = " query defining the data it wants to receive"]
        pub async fn request_driver_state(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::query::Query>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/driver.driver.DriverCommunication/RequestDriverState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " Events Subscription"]
        #[doc = " the src-relay uses this endpoint to forward the event subscription request from dest-relay to driver"]
        pub async fn subscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::events::EventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/driver.driver.DriverCommunication/SubscribeEvent",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " Recommended to have TLS mode on for this unsafe endpoint"]
        #[doc = " Relay uses this to get Query.requestor_signature and "]
        #[doc = " Query.certificate required for event subscription"]
        pub async fn request_signed_event_subscription_query(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::events::EventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::query::Query>, tonic::Status>
        {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " Events Publication"]
        #[doc = " the dest-relay calls the dest-driver on this end point to write the remote network state to the local ledger"]
        pub async fn write_external_state(
            &mut self,
            request: impl tonic::IntoRequest<super::WriteExternalStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/driver.driver.DriverCommunication/WriteExternalState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
    }
    impl<T: Clone> Clone for DriverCommunicationClient<T> {
        fn clone(&self) -> Self {
            Self {
                inner: self.inner.clone(),
            }
        }
    }
    impl<T> std::fmt::Debug for DriverCommunicationClient<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "DriverCommunicationClient {{ ... }}")
        }
    }
}
#[doc = r" Generated server implementations."]
pub mod driver_communication_server {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    #[doc = "Generated trait containing gRPC methods that should be implemented for use with DriverCommunicationServer."]
    #[async_trait]
    pub trait DriverCommunication: Send + Sync + 'static {
        #[doc = " Data Sharing "]
        #[doc = " the remote relay sends a RequestDriverState request to its driver with a"]
        #[doc = " query defining the data it wants to receive"]
        async fn request_driver_state(
            &self,
            request: tonic::Request<super::super::super::common::query::Query>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " Events Subscription"]
        #[doc = " the src-relay uses this endpoint to forward the event subscription request from dest-relay to driver"]
        async fn subscribe_event(
            &self,
            request: tonic::Request<super::super::super::common::events::EventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " Recommended to have TLS mode on for this unsafe endpoint"]
        #[doc = " Relay uses this to get Query.requestor_signature and "]
        #[doc = " Query.certificate required for event subscription"]
        async fn request_signed_event_subscription_query(
            &self,
            request: tonic::Request<super::super::super::common::events::EventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::query::Query>, tonic::Status>;
        #[doc = " Events Publication"]
        #[doc = " the dest-relay calls the dest-driver on this end point to write the remote network state to the local ledger"]
        async fn write_external_state(
            &self,
            request: tonic::Request<super::WriteExternalStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
    }
    #[derive(Debug)]
    #[doc(hidden)]
    pub struct DriverCommunicationServer<T: DriverCommunication> {
        inner: _Inner<T>,
    }
    struct _Inner<T>(Arc<T>, Option<tonic::Interceptor>);
    impl<T: DriverCommunication> DriverCommunicationServer<T> {
        pub fn new(inner: T) -> Self {
            let inner = Arc::new(inner);
            let inner = _Inner(inner, None);
            Self { inner }
        }
        pub fn with_interceptor(inner: T, interceptor: impl Into<tonic::Interceptor>) -> Self {
            let inner = Arc::new(inner);
            let inner = _Inner(inner, Some(interceptor.into()));
            Self { inner }
        }
    }
    impl<T, B> Service<http::Request<B>> for DriverCommunicationServer<T>
    where
        T: DriverCommunication,
        B: HttpBody + Send + Sync + 'static,
        B::Error: Into<StdError> + Send + 'static,
    {
        type Response = http::Response<tonic::body::BoxBody>;
        type Error = Never;
        type Future = BoxFuture<Self::Response, Self::Error>;
        fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }
        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            let inner = self.inner.clone();
            match req.uri().path() {
                "/driver.driver.DriverCommunication/RequestDriverState" => {
                    #[allow(non_camel_case_types)]
                    struct RequestDriverStateSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<T: DriverCommunication>
                        tonic::server::UnaryService<super::super::super::common::query::Query>
                        for RequestDriverStateSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::super::super::common::query::Query>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.request_driver_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = RequestDriverStateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = if let Some(interceptor) = interceptor {
                            tonic::server::Grpc::with_interceptor(codec, interceptor)
                        } else {
                            tonic::server::Grpc::new(codec)
                        };
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/SubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct SubscribeEventSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<T: DriverCommunication>
                        tonic::server::UnaryService<
                            super::super::super::common::events::EventSubscription,
                        > for SubscribeEventSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::events::EventSubscription,
                            >,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.subscribe_event(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = SubscribeEventSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = if let Some(interceptor) = interceptor {
                            tonic::server::Grpc::with_interceptor(codec, interceptor)
                        } else {
                            tonic::server::Grpc::new(codec)
                        };
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery" => {
                    #[allow(non_camel_case_types)]
                    struct RequestSignedEventSubscriptionQuerySvc<T: DriverCommunication>(
                        pub Arc<T>,
                    );
                    impl<T: DriverCommunication>
                        tonic::server::UnaryService<
                            super::super::super::common::events::EventSubscription,
                        > for RequestSignedEventSubscriptionQuerySvc<T>
                    {
                        type Response = super::super::super::common::query::Query;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::events::EventSubscription,
                            >,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move {
                                inner.request_signed_event_subscription_query(request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = RequestSignedEventSubscriptionQuerySvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = if let Some(interceptor) = interceptor {
                            tonic::server::Grpc::with_interceptor(codec, interceptor)
                        } else {
                            tonic::server::Grpc::new(codec)
                        };
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/driver.driver.DriverCommunication/WriteExternalState" => {
                    #[allow(non_camel_case_types)]
                    struct WriteExternalStateSvc<T: DriverCommunication>(pub Arc<T>);
                    impl<T: DriverCommunication>
                        tonic::server::UnaryService<super::WriteExternalStateMessage>
                        for WriteExternalStateSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::WriteExternalStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.write_external_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = WriteExternalStateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = if let Some(interceptor) = interceptor {
                            tonic::server::Grpc::with_interceptor(codec, interceptor)
                        } else {
                            tonic::server::Grpc::new(codec)
                        };
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                _ => Box::pin(async move {
                    Ok(http::Response::builder()
                        .status(200)
                        .header("grpc-status", "12")
                        .body(tonic::body::BoxBody::empty())
                        .unwrap())
                }),
            }
        }
    }
    impl<T: DriverCommunication> Clone for DriverCommunicationServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self { inner }
        }
    }
    impl<T: DriverCommunication> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(self.0.clone(), self.1.clone())
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: DriverCommunication> tonic::transport::NamedService for DriverCommunicationServer<T> {
        const NAME: &'static str = "driver.driver.DriverCommunication";
    }
}
