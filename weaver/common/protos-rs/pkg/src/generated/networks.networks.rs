#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct DbName {
    #[prost(string, tag = "1")]
    pub name: std::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct RelayDatabase {
    #[prost(map = "string, string", tag = "1")]
    pub pairs: ::std::collections::HashMap<std::string::String, std::string::String>,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct GetStateMessage {
    #[prost(string, tag = "1")]
    pub request_id: std::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct NetworkQuery {
    #[prost(string, repeated, tag = "1")]
    pub policy: ::std::vec::Vec<std::string::String>,
    #[prost(string, tag = "2")]
    pub address: std::string::String,
    #[prost(string, tag = "3")]
    pub requesting_relay: std::string::String,
    #[prost(string, tag = "4")]
    pub requesting_network: std::string::String,
    #[prost(string, tag = "5")]
    pub certificate: std::string::String,
    #[prost(string, tag = "6")]
    pub requestor_signature: std::string::String,
    #[prost(string, tag = "7")]
    pub nonce: std::string::String,
    #[prost(string, tag = "8")]
    pub requesting_org: std::string::String,
    #[prost(bool, tag = "9")]
    pub confidential: bool,
}
/// Below message is used for network/client to dest-relay communication
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct NetworkEventSubscription {
    #[prost(message, optional, tag = "1")]
    pub event_matcher: ::std::option::Option<super::super::common::events::EventMatcher>,
    #[prost(message, optional, tag = "2")]
    pub query: ::std::option::Option<NetworkQuery>,
    #[prost(message, optional, tag = "3")]
    pub event_publication_spec:
        ::std::option::Option<super::super::common::events::EventPublication>,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct NetworkEventUnsubscription {
    #[prost(message, optional, tag = "1")]
    pub request: ::std::option::Option<NetworkEventSubscription>,
    #[prost(string, tag = "2")]
    pub request_id: std::string::String,
}
#[doc = r" Generated client implementations."]
pub mod network_client {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    #[doc = " This service is the interface for how the network communicates with"]
    #[doc = " its relay."]
    pub struct NetworkClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl NetworkClient<tonic::transport::Channel> {
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
    impl<T> NetworkClient<T>
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
        #[doc = " Data Sharing endpoints"]
        #[doc = " endpoint for a network to request remote relay state via local relay"]
        pub async fn request_state(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkQuery>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/networks.networks.Network/RequestState");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " This rpc endpoint is for polling the local relay for request state."]
        pub async fn get_state(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::state::RequestState>, tonic::Status>
        {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static("/networks.networks.Network/GetState");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " NOTE: This rpc is just for debugging."]
        pub async fn request_database(
            &mut self,
            request: impl tonic::IntoRequest<super::DbName>,
        ) -> Result<tonic::Response<super::RelayDatabase>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/networks.networks.Network/RequestDatabase");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " Event endpoints"]
        #[doc = " endpoint for a client to subscribe to event via local relay initiating subscription flow."]
        pub async fn subscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkEventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/networks.networks.Network/SubscribeEvent");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " This rpc endpoint is for polling the local relay for subscription state."]
        pub async fn get_event_subscription_state(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventSubscriptionState>,
            tonic::Status,
        > {
            self.inner.ready().await.map_err(|e| {
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
        #[doc = " endpoint for a client to subscribe to event via local relay initiating subscription flow."]
        pub async fn unsubscribe_event(
            &mut self,
            request: impl tonic::IntoRequest<super::NetworkEventUnsubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/networks.networks.Network/UnsubscribeEvent");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " endpoint for a client to fetch received events. "]
        #[doc = " Note: events are marked as deleted from relay database as soon as client fetches them."]
        pub async fn get_event_states(
            &mut self,
            request: impl tonic::IntoRequest<super::GetStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::events::EventStates>, tonic::Status>
        {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/networks.networks.Network/GetEventStates");
            self.inner.unary(request.into_request(), path, codec).await
        }
    }
    impl<T: Clone> Clone for NetworkClient<T> {
        fn clone(&self) -> Self {
            Self {
                inner: self.inner.clone(),
            }
        }
    }
    impl<T> std::fmt::Debug for NetworkClient<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "NetworkClient {{ ... }}")
        }
    }
}
#[doc = r" Generated server implementations."]
pub mod network_server {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    #[doc = "Generated trait containing gRPC methods that should be implemented for use with NetworkServer."]
    #[async_trait]
    pub trait Network: Send + Sync + 'static {
        #[doc = " Data Sharing endpoints"]
        #[doc = " endpoint for a network to request remote relay state via local relay"]
        async fn request_state(
            &self,
            request: tonic::Request<super::NetworkQuery>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " This rpc endpoint is for polling the local relay for request state."]
        async fn get_state(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::state::RequestState>, tonic::Status>;
        #[doc = " NOTE: This rpc is just for debugging."]
        async fn request_database(
            &self,
            request: tonic::Request<super::DbName>,
        ) -> Result<tonic::Response<super::RelayDatabase>, tonic::Status>;
        #[doc = " Event endpoints"]
        #[doc = " endpoint for a client to subscribe to event via local relay initiating subscription flow."]
        async fn subscribe_event(
            &self,
            request: tonic::Request<super::NetworkEventSubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " This rpc endpoint is for polling the local relay for subscription state."]
        async fn get_event_subscription_state(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<
            tonic::Response<super::super::super::common::events::EventSubscriptionState>,
            tonic::Status,
        >;
        #[doc = " endpoint for a client to subscribe to event via local relay initiating subscription flow."]
        async fn unsubscribe_event(
            &self,
            request: tonic::Request<super::NetworkEventUnsubscription>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " endpoint for a client to fetch received events. "]
        #[doc = " Note: events are marked as deleted from relay database as soon as client fetches them."]
        async fn get_event_states(
            &self,
            request: tonic::Request<super::GetStateMessage>,
        ) -> Result<tonic::Response<super::super::super::common::events::EventStates>, tonic::Status>;
    }
    #[doc = " This service is the interface for how the network communicates with"]
    #[doc = " its relay."]
    #[derive(Debug)]
    #[doc(hidden)]
    pub struct NetworkServer<T: Network> {
        inner: _Inner<T>,
    }
    struct _Inner<T>(Arc<T>, Option<tonic::Interceptor>);
    impl<T: Network> NetworkServer<T> {
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
    impl<T, B> Service<http::Request<B>> for NetworkServer<T>
    where
        T: Network,
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
                "/networks.networks.Network/RequestState" => {
                    #[allow(non_camel_case_types)]
                    struct RequestStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::NetworkQuery> for RequestStateSvc<T> {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkQuery>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.request_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = RequestStateSvc(inner);
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
                "/networks.networks.Network/GetState" => {
                    #[allow(non_camel_case_types)]
                    struct GetStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage> for GetStateSvc<T> {
                        type Response = super::super::super::common::state::RequestState;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.get_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = GetStateSvc(inner);
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
                "/networks.networks.Network/RequestDatabase" => {
                    #[allow(non_camel_case_types)]
                    struct RequestDatabaseSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::DbName> for RequestDatabaseSvc<T> {
                        type Response = super::RelayDatabase;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(&mut self, request: tonic::Request<super::DbName>) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.request_database(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = RequestDatabaseSvc(inner);
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
                "/networks.networks.Network/SubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct SubscribeEventSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::NetworkEventSubscription>
                        for SubscribeEventSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkEventSubscription>,
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
                "/networks.networks.Network/GetEventSubscriptionState" => {
                    #[allow(non_camel_case_types)]
                    struct GetEventSubscriptionStateSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage>
                        for GetEventSubscriptionStateSvc<T>
                    {
                        type Response = super::super::super::common::events::EventSubscriptionState;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut =
                                async move { inner.get_event_subscription_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = GetEventSubscriptionStateSvc(inner);
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
                "/networks.networks.Network/UnsubscribeEvent" => {
                    #[allow(non_camel_case_types)]
                    struct UnsubscribeEventSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::NetworkEventUnsubscription>
                        for UnsubscribeEventSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::NetworkEventUnsubscription>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.unsubscribe_event(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = UnsubscribeEventSvc(inner);
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
                "/networks.networks.Network/GetEventStates" => {
                    #[allow(non_camel_case_types)]
                    struct GetEventStatesSvc<T: Network>(pub Arc<T>);
                    impl<T: Network> tonic::server::UnaryService<super::GetStateMessage> for GetEventStatesSvc<T> {
                        type Response = super::super::super::common::events::EventStates;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetStateMessage>,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.get_event_states(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = GetEventStatesSvc(inner);
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
    impl<T: Network> Clone for NetworkServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self { inner }
        }
    }
    impl<T: Network> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(self.0.clone(), self.1.clone())
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: Network> tonic::transport::NamedService for NetworkServer<T> {
        const NAME: &'static str = "networks.networks.Network";
    }
}
