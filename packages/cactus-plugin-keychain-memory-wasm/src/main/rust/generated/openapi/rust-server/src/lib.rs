#![allow(missing_docs, trivial_casts, unused_variables, unused_mut, unused_imports, unused_extern_crates, non_camel_case_types)]
#![allow(unused_imports, unused_attributes)]
#![allow(clippy::derive_partial_eq_without_eq, clippy::disallowed_names)]

use async_trait::async_trait;
use futures::Stream;
use std::error::Error;
use std::task::{Poll, Context};
use swagger::{ApiError, ContextWrapper};
use serde::{Serialize, Deserialize};

type ServiceError = Box<dyn Error + Send + Sync + 'static>;

pub const BASE_PATH: &str = "";
pub const API_VERSION: &str = "v2.0.0-alpha.2";

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum DeleteKeychainEntryV1Response {
    /// OK
    OK
    (models::DeleteKeychainEntryResponseV1)
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

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum GetKeychainEntryV1Response {
    /// OK
    OK
    (models::GetKeychainEntryResponseV1)
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
#[must_use]
pub enum HasKeychainEntryV1Response {
    /// OK
    OK
    (models::HasKeychainEntryResponseV1)
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

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[must_use]
pub enum SetKeychainEntryV1Response {
    /// OK
    OK
    (models::SetKeychainEntryResponseV1)
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
#[allow(clippy::too_many_arguments, clippy::ptr_arg)]
pub trait Api<C: Send + Sync> {
    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>> {
        Poll::Ready(Ok(()))
    }

    /// Deletes an entry under a key on the keychain backend.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        context: &C) -> Result<DeleteKeychainEntryV1Response, ApiError>;

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request_v1: models::GetKeychainEntryRequestV1,
        context: &C) -> Result<GetKeychainEntryV1Response, ApiError>;

    ///Get the Prometheus Metrics
        async fn get_prometheus_metrics_v1(
            &self,
            contex: &C) -> Result<GetPrometheusMetricsV1Response, ApiError>;

    /// Checks that an entry exists under a key on the keychain backend
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        context: &C) -> Result<HasKeychainEntryV1Response, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request_v1: models::SetKeychainEntryRequestV1,
        context: &C) -> Result<SetKeychainEntryV1Response, ApiError>;

}

/// API where `Context` isn't passed on every API call
#[async_trait]
#[allow(clippy::too_many_arguments, clippy::ptr_arg)]
pub trait ApiNoContext<C: Send + Sync> {

    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>>;

    fn context(&self) -> &C;

    /// Deletes an entry under a key on the keychain backend.
    async fn delete_keychain_entry_v1(
        &self,
        delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1>,
        ) -> Result<DeleteKeychainEntryV1Response, ApiError>;

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry_v1(
        &self,
        get_keychain_entry_request_v1: models::GetKeychainEntryRequestV1,
        ) -> Result<GetKeychainEntryV1Response, ApiError>;

        /// Get the Prometheus Metrics
        async fn get_prometheus_metrics_v1(
            &self,
        ) -> Result<GetPrometheusMetricsV1Response, ApiError>;

    /// Checks that an entry exists under a key on the keychain backend
    async fn has_keychain_entry_v1(
        &self,
        has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1>,
        ) -> Result<HasKeychainEntryV1Response, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry_v1(
        &self,
        set_keychain_entry_request_v1: models::SetKeychainEntryRequestV1,
        ) -> Result<SetKeychainEntryV1Response, ApiError>;

}

/// Trait to extend an API to make it easy to bind it to a context.
pub trait ContextWrapperExt<C: Send + Sync> where Self: Sized
{
    /// Binds this API to a context.
    fn with_context(self, context: C) -> ContextWrapper<Self, C>;
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

    /// Deletes an entry under a key on the keychain backend.
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
        get_keychain_entry_request_v1: models::GetKeychainEntryRequestV1,
        ) -> Result<GetKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().get_keychain_entry_v1(get_keychain_entry_request_v1, &context).await
    }

    /// Get the Prometheus Metrics
    async fn get_prometheus_metrics_v1(
        &self,
    ) -> Result<GetPrometheusMetricsV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().get_prometheus_metrics_v1(&context).await
    }

    /// Checks that an entry exists under a key on the keychain backend
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
        set_keychain_entry_request_v1: models::SetKeychainEntryRequestV1,
        ) -> Result<SetKeychainEntryV1Response, ApiError>
    {
        let context = self.context().clone();
        self.api().set_keychain_entry_v1(set_keychain_entry_request_v1, &context).await
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
