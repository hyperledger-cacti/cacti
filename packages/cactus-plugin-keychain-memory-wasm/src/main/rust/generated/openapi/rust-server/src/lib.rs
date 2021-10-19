#![allow(missing_docs, trivial_casts, unused_variables, unused_mut, unused_imports, unused_extern_crates, non_camel_case_types)]

use async_trait::async_trait;
use futures::Stream;
use std::error::Error;
use std::task::{Poll, Context};
use swagger::{ApiError, ContextWrapper};
use serde::{Serialize, Deserialize};

type ServiceError = Box<dyn Error + Send + Sync + 'static>;

pub const BASE_PATH: &'static str = "";
pub const API_VERSION: &'static str = "0.3.0";

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub enum DeleteKeychainEntryV1Response {
    /// OK
    OK
    (models::DeleteKeychainEntryResponseV1)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum GetKeychainEntryV1Response {
    /// OK
    OK
    (models::GetKeychainEntryResponse)
    ,
    /// Bad request. Key must be a string and longer than 0, shorter than 1024 characters.
    BadRequest
    ,
    /// Authorization information is missing or invalid.
    AuthorizationInformationIsMissingOrInvalid
    ,
    /// A keychain item with the specified key was not found.
    AKeychainItemWithTheSpecifiedKeyWasNotFound
    ,
    /// Unexpected error.
    UnexpectedError
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub enum GetPrometheusMetricsV1Response {
    /// OK
    OK
    (String)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub enum HasKeychainEntryV1Response {
    /// OK
    OK
    (models::HasKeychainEntryResponseV1)
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum SetKeychainEntryV1Response {
    /// OK
    OK
    (models::SetKeychainEntryResponse)
    ,
    /// Bad request. Key must be a string and longer than 0, shorter than 1024 characters.
    BadRequest
    ,
    /// Authorization information is missing or invalid.
    AuthorizationInformationIsMissingOrInvalid
    ,
    /// Unexpected error.
    UnexpectedError
}

/// API
#[async_trait]
pub trait Api<C: Send + Sync> {
    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>> {
        Poll::Ready(Ok(()))
    }

    /// Deletes an entry from the keychain stored under the provided key.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        context: &C) -> Result<DeleteKeychainEntryV1Response, ApiError>;

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        context: &C) -> Result<GetKeychainEntryV1Response, ApiError>;

    /// Get the Prometheus Metrics
    async fn get_prometheus_metrics_v1(
        &self,
        context: &C) -> Result<GetPrometheusMetricsV1Response, ApiError>;

    /// Retrieves the information regarding a key being present on the keychain or not.
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        context: &C) -> Result<HasKeychainEntryV1Response, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        context: &C) -> Result<SetKeychainEntryV1Response, ApiError>;

}

/// API where `Context` isn't passed on every API call
#[async_trait]
pub trait ApiNoContext<C: Send + Sync> {

    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>>;

    fn context(&self) -> &C;

    /// Deletes an entry from the keychain stored under the provided key.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        ) -> Result<DeleteKeychainEntryV1Response, ApiError>;

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        ) -> Result<GetKeychainEntryV1Response, ApiError>;

    /// Get the Prometheus Metrics
    async fn get_prometheus_metrics_v1(
        &self,
        ) -> Result<GetPrometheusMetricsV1Response, ApiError>;

    /// Retrieves the information regarding a key being present on the keychain or not.
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        ) -> Result<HasKeychainEntryV1Response, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        ) -> Result<SetKeychainEntryV1Response, ApiError>;

}

/// Trait to extend an API to make it easy to bind it to a context.
pub trait ContextWrapperExt<C: Send + Sync> where Self: Sized
{
    /// Binds this API to a context.
    fn with_context(self: Self, context: C) -> ContextWrapper<Self, C>;
}

impl<T: Api<C> + Send + Sync, C: Clone + Send + Sync> ContextWrapperExt<C> for T {
    fn with_context(self: T, context: C) -> ContextWrapper<T, C> {
         ContextWrapper::<T, C>::new(self, context)
    }
}

#[async_trait]
impl<T: Api<C> + Send + Sync, C: Clone + Send + Sync> ApiNoContext<C> for ContextWrapper<T, C> {
    fn poll_ready(&self, cx: &mut Context) -> Poll<Result<(), ServiceError>> {
        self.api().poll_ready(cx)
    }

    fn context(&self) -> &C {
        ContextWrapper::context(self)
    }

    /// Deletes an entry from the keychain stored under the provided key.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        ) -> Result<DeleteKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().delete_keychain_entry_v1(delete_keychain_entry_request_v1, &context).await
    }

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        ) -> Result<GetKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().get_keychain_entry_v1(get_keychain_entry_request, &context).await
    }

    /// Get the Prometheus Metrics
    async fn get_prometheus_metrics_v1(
        &self,
        ) -> Result<GetPrometheusMetricsV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().get_prometheus_metrics_v1(&context).await
    }

    /// Retrieves the information regarding a key being present on the keychain or not.
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        ) -> Result<HasKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().has_keychain_entry_v1(has_keychain_entry_request_v1, &context).await
    }

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        ) -> Result<SetKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().set_keychain_entry_v1(set_keychain_entry_request, &context).await
    }

}


#[cfg(feature = "client")]
pub mod client;

// Re-export Client as a top-level name
#[cfg(feature = "client")]
pub use client::Client;

#[cfg(feature = "server")]
pub mod server;

// Re-export router() as a top-level name
#[cfg(feature = "server")]
pub use self::server::Service;

#[cfg(feature = "server")]
pub mod context;

pub mod models;

#[cfg(any(feature = "client", feature = "server"))]
pub(crate) mod header;
