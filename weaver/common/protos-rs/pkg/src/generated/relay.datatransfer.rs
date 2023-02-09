#[doc = r" Generated client implementations."]
pub mod data_transfer_client {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    #[doc = " definitions of all messages used in the datatransfer protocol"]
    pub struct DataTransferClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl DataTransferClient<tonic::transport::Channel> {
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
    impl<T> DataTransferClient<T>
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
        #[doc = " the requesting relay sends a RequestState request to the remote relay with a"]
        #[doc = " query defining the data it wants to receive"]
        pub async fn request_state(
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
                "/relay.datatransfer.DataTransfer/RequestState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " the remote relay asynchronously sends back the requested data with"]
        #[doc = " SendState"]
        pub async fn send_state(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::state::ViewPayload>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path =
                http::uri::PathAndQuery::from_static("/relay.datatransfer.DataTransfer/SendState");
            self.inner.unary(request.into_request(), path, codec).await
        }
        #[doc = " Handling state sent from the driver."]
        pub async fn send_driver_state(
            &mut self,
            request: impl tonic::IntoRequest<super::super::super::common::state::ViewPayload>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status> {
            self.inner.ready().await.map_err(|e| {
                tonic::Status::new(
                    tonic::Code::Unknown,
                    format!("Service was not ready: {}", e.into()),
                )
            })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/relay.datatransfer.DataTransfer/SendDriverState",
            );
            self.inner.unary(request.into_request(), path, codec).await
        }
    }
    impl<T: Clone> Clone for DataTransferClient<T> {
        fn clone(&self) -> Self {
            Self {
                inner: self.inner.clone(),
            }
        }
    }
    impl<T> std::fmt::Debug for DataTransferClient<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "DataTransferClient {{ ... }}")
        }
    }
}
#[doc = r" Generated server implementations."]
pub mod data_transfer_server {
    #![allow(unused_variables, dead_code, missing_docs)]
    use tonic::codegen::*;
    #[doc = "Generated trait containing gRPC methods that should be implemented for use with DataTransferServer."]
    #[async_trait]
    pub trait DataTransfer: Send + Sync + 'static {
        #[doc = " the requesting relay sends a RequestState request to the remote relay with a"]
        #[doc = " query defining the data it wants to receive"]
        async fn request_state(
            &self,
            request: tonic::Request<super::super::super::common::query::Query>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " the remote relay asynchronously sends back the requested data with"]
        #[doc = " SendState"]
        async fn send_state(
            &self,
            request: tonic::Request<super::super::super::common::state::ViewPayload>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
        #[doc = " Handling state sent from the driver."]
        async fn send_driver_state(
            &self,
            request: tonic::Request<super::super::super::common::state::ViewPayload>,
        ) -> Result<tonic::Response<super::super::super::common::ack::Ack>, tonic::Status>;
    }
    #[doc = " definitions of all messages used in the datatransfer protocol"]
    #[derive(Debug)]
    #[doc(hidden)]
    pub struct DataTransferServer<T: DataTransfer> {
        inner: _Inner<T>,
    }
    struct _Inner<T>(Arc<T>, Option<tonic::Interceptor>);
    impl<T: DataTransfer> DataTransferServer<T> {
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
    impl<T, B> Service<http::Request<B>> for DataTransferServer<T>
    where
        T: DataTransfer,
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
                "/relay.datatransfer.DataTransfer/RequestState" => {
                    #[allow(non_camel_case_types)]
                    struct RequestStateSvc<T: DataTransfer>(pub Arc<T>);
                    impl<T: DataTransfer>
                        tonic::server::UnaryService<super::super::super::common::query::Query>
                        for RequestStateSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::super::super::common::query::Query>,
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
                "/relay.datatransfer.DataTransfer/SendState" => {
                    #[allow(non_camel_case_types)]
                    struct SendStateSvc<T: DataTransfer>(pub Arc<T>);
                    impl<T: DataTransfer>
                        tonic::server::UnaryService<super::super::super::common::state::ViewPayload>
                        for SendStateSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::state::ViewPayload,
                            >,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.send_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = SendStateSvc(inner);
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
                "/relay.datatransfer.DataTransfer/SendDriverState" => {
                    #[allow(non_camel_case_types)]
                    struct SendDriverStateSvc<T: DataTransfer>(pub Arc<T>);
                    impl<T: DataTransfer>
                        tonic::server::UnaryService<super::super::super::common::state::ViewPayload>
                        for SendDriverStateSvc<T>
                    {
                        type Response = super::super::super::common::ack::Ack;
                        type Future = BoxFuture<tonic::Response<Self::Response>, tonic::Status>;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                super::super::super::common::state::ViewPayload,
                            >,
                        ) -> Self::Future {
                            let inner = self.0.clone();
                            let fut = async move { inner.send_driver_state(request).await };
                            Box::pin(fut)
                        }
                    }
                    let inner = self.inner.clone();
                    let fut = async move {
                        let interceptor = inner.1.clone();
                        let inner = inner.0;
                        let method = SendDriverStateSvc(inner);
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
    impl<T: DataTransfer> Clone for DataTransferServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self { inner }
        }
    }
    impl<T: DataTransfer> Clone for _Inner<T> {
        fn clone(&self) -> Self {
            Self(self.0.clone(), self.1.clone())
        }
    }
    impl<T: std::fmt::Debug> std::fmt::Debug for _Inner<T> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{:?}", self.0)
        }
    }
    impl<T: DataTransfer> tonic::transport::NamedService for DataTransferServer<T> {
        const NAME: &'static str = "relay.datatransfer.DataTransfer";
    }
}
