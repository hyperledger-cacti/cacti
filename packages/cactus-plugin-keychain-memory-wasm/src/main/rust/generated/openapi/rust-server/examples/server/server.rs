//! Main library entry point for openapi_client implementation.

#![allow(unused_imports)]

use async_trait::async_trait;
use futures::{future, Stream, StreamExt, TryFutureExt, TryStreamExt};
use hyper::server::conn::Http;
use hyper::service::Service;
use log::info;
#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "ios")))]
use openssl::ssl::SslAcceptorBuilder;
use std::future::Future;
use std::marker::PhantomData;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use swagger::{Has, XSpanIdString};
use swagger::auth::MakeAllowAllAuthenticator;
use swagger::EmptyContext;
use tokio::net::TcpListener;

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "ios")))]
use openssl::ssl::{SslAcceptor, SslFiletype, SslMethod};

use openapi_client::models;

/// Builds an SSL implementation for Simple HTTPS from some hard-coded file names
pub async fn create(addr: &str, https: bool) {
    let addr = addr.parse().expect("Failed to parse bind address");

    let server = Server::new();

    let service = MakeService::new(server);

    let service = MakeAllowAllAuthenticator::new(service, "cosmo");

    let mut service =
        openapi_client::server::context::MakeAddContext::<_, EmptyContext>::new(
            service
        );

    if https {
        #[cfg(any(target_os = "macos", target_os = "windows", target_os = "ios"))]
        {
            unimplemented!("SSL is not implemented for the examples on MacOS, Windows or iOS");
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "ios")))]
        {
            let mut ssl = SslAcceptor::mozilla_intermediate_v5(SslMethod::tls()).expect("Failed to create SSL Acceptor");

            // Server authentication
            ssl.set_private_key_file("examples/server-key.pem", SslFiletype::PEM).expect("Failed to set private key");
            ssl.set_certificate_chain_file("examples/server-chain.pem").expect("Failed to set cerificate chain");
            ssl.check_private_key().expect("Failed to check private key");

            let tls_acceptor = Arc::new(ssl.build());
            let mut tcp_listener = TcpListener::bind(&addr).await.unwrap();
            let mut incoming = tcp_listener.incoming();

            while let (Some(tcp), rest) = incoming.into_future().await {
                if let Ok(tcp) = tcp {
                    let addr = tcp.peer_addr().expect("Unable to get remote address");
                    let service = service.call(addr);
                    let tls_acceptor = Arc::clone(&tls_acceptor);

                    tokio::spawn(async move {
                        let tls = tokio_openssl::accept(&*tls_acceptor, tcp).await.map_err(|_| ())?;

                        let service = service.await.map_err(|_| ())?;

                        Http::new().serve_connection(tls, service).await.map_err(|_| ())
                    });
                }

                incoming = rest;
            }
        }
    } else {
        // Using HTTP
        hyper::server::Server::bind(&addr).serve(service).await.unwrap()
    }
}

#[derive(Copy, Clone)]
pub struct Server<C> {
    marker: PhantomData<C>,
}

impl<C> Server<C> {
    pub fn new() -> Self {
        Server{marker: PhantomData}
    }
}


use openapi_client::{
    Api,
    DeleteKeychainEntryV1Response,
    GetKeychainEntryV1Response,
    GetPrometheusMetricsV1Response,
    HasKeychainEntryV1Response,
    SetKeychainEntryV1Response,
};
use openapi_client::server::MakeService;
use std::error::Error;
use swagger::ApiError;

#[async_trait]
impl<C> Api<C> for Server<C> where C: Has<XSpanIdString> + Send + Sync
{
    /// Deletes an entry from the keychain stored under the provided key.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        context: &C) -> Result<DeleteKeychainEntryV1Response, ApiError>
    {
        let context = context.clone();
        info!("delete_keychain_entry_v1({:?}) - X-Span-ID: {:?}", delete_keychain_entry_request_v1, context.get().0.clone());
        Err("Generic failuare".into())
    }

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        context: &C) -> Result<GetKeychainEntryV1Response, ApiError>
    {
        let context = context.clone();
        info!("get_keychain_entry_v1({:?}) - X-Span-ID: {:?}", get_keychain_entry_request, context.get().0.clone());
        Err("Generic failuare".into())
    }

    /// Get the Prometheus Metrics
    async fn get_prometheus_metrics_v1(
        &self,
        context: &C) -> Result<GetPrometheusMetricsV1Response, ApiError>
    {
        let context = context.clone();
        info!("get_prometheus_metrics_v1() - X-Span-ID: {:?}", context.get().0.clone());
        Err("Generic failuare".into())
    }

    /// Retrieves the information regarding a key being present on the keychain or not.
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        context: &C) -> Result<HasKeychainEntryV1Response, ApiError>
    {
        let context = context.clone();
        info!("has_keychain_entry_v1({:?}) - X-Span-ID: {:?}", has_keychain_entry_request_v1, context.get().0.clone());
        Err("Generic failuare".into())
    }

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        context: &C) -> Result<SetKeychainEntryV1Response, ApiError>
    {
        let context = context.clone();
        info!("set_keychain_entry_v1({:?}) - X-Span-ID: {:?}", set_keychain_entry_request, context.get().0.clone());
        Err("Generic failuare".into())
    }

}
