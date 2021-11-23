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

type GenericError = Box<dyn Error + Send + Sync>;
type YoloResult<T> = Result<T, GenericError>;

extern crate hashicorp_vault as vault;

/// Builds an SSL implementation for Simple HTTPS from some hard-coded file names
pub async fn create(addr: &str, _https: bool, _vault_host: &str, _vault_token: &str) -> YoloResult<()> {
    let addr = addr.parse().expect("Failed to parse bind address");

    // let vaulthost = vaulthost.parse().expect("Failed to parse Vault address");

    let server = Server::new();

    let service = MakeService::new(server);

    let service = MakeAllowAllAuthenticator::new(service, "cosmo");

    let service =
        openapi_client::server::context::MakeAddContext::<_, EmptyContext>::new(
            service
        );

    eprintln!("Binding server to network interface ...");

    let hyper_server = hyper::server::Server::bind(&addr).serve(service);
    println!("Listening on http://{}", addr);
    hyper_server.await?;
    Ok(())
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
    GetKeychainEntryResponse,
    SetKeychainEntryResponse,
};
use openapi_client::server::MakeService;
use std::error::Error;
use swagger::ApiError;
use std::env;

#[async_trait]
impl<C> Api<C> for Server<C> where C: Has<XSpanIdString> + Send + Sync
{
    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        context: &C) -> Result<GetKeychainEntryResponse, ApiError>
    {
        let context = context.clone();
        info!("get_keychain_entry({:?}) - X-Span-ID: {:?}", get_keychain_entry_request, context.get().0.clone());

        // FIXME implement connection pooling
        // FIXME move configuration parsing logic to main instead
        let temp_host;
        let host: &str;
        if (env::var("VAULT_HOST").is_err()) {
            host = "http://localhost:8200"
        } else {
            temp_host = env::var("VAULT_HOST").unwrap();
            host = &*temp_host;
        }
        let token = env::var("VAULT_TOKEN").unwrap();
        let client = vault::Client::new(host, token).unwrap();

        let secret = client.get_secret(get_keychain_entry_request.key.clone()).unwrap();

        Ok(GetKeychainEntryResponse::OK(models::GetKeychainEntryResponse::new(get_keychain_entry_request.key.clone(), secret.to_string())))
    }

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        context: &C) -> Result<SetKeychainEntryResponse, ApiError>
    {
        let context = context.clone();
        info!("set_keychain_entry({:?}) - X-Span-ID: {:?}", set_keychain_entry_request, context.get().0.clone());

        // FIXME implement connection pooling
        // FIXME move configuration parsing logic to main instead
        let temp_host;
        let host: &str;
        if (env::var("VAULT_HOST").is_err()) {
            host = "http://localhost:8200"
        } else {
            temp_host = env::var("VAULT_HOST").unwrap();
            host = &*temp_host;
        }
        let token = env::var("VAULT_TOKEN").unwrap();
        let client = vault::Client::new(host, token).unwrap();

        let _ = client.set_secret(set_keychain_entry_request.key.clone(), set_keychain_entry_request.value.clone());

        Ok(SetKeychainEntryResponse::OK(models::SetKeychainEntryResponse::new(set_keychain_entry_request.key.clone())))
    }

}
