#![allow(missing_docs, trivial_casts, unused_variables, unused_mut, unused_imports, unused_extern_crates, non_camel_case_types)]

use async_trait::async_trait;
use futures::Stream;
use std::error::Error;
use std::task::{Poll, Context};
use swagger::{ApiError, ContextWrapper};

type ServiceError = Box<dyn Error + Send + Sync + 'static>;

pub const BASE_PATH: &'static str = "";
pub const API_VERSION: &'static str = "0.3.0";

#[derive(Debug, PartialEq)]
#[must_use]
pub enum GetKeychainEntryResponse {
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

#[derive(Debug, PartialEq)]
#[must_use]
pub enum SetKeychainEntryResponse {
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

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        context: &C) -> Result<GetKeychainEntryResponse, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        context: &C) -> Result<SetKeychainEntryResponse, ApiError>;

}

/// API where `Context` isn't passed on every API call
#[async_trait]
pub trait ApiNoContext<C: Send + Sync> {

    fn poll_ready(&self, _cx: &mut Context) -> Poll<Result<(), Box<dyn Error + Send + Sync + 'static>>>;

    fn context(&self) -> &C;

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        ) -> Result<GetKeychainEntryResponse, ApiError>;

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        ) -> Result<SetKeychainEntryResponse, ApiError>;

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

    /// Retrieves the contents of a keychain entry from the backend.
    async fn get_keychain_entry(
        &self,
        get_keychain_entry_request: models::GetKeychainEntryRequest,
        ) -> Result<GetKeychainEntryResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().get_keychain_entry(get_keychain_entry_request, &context).await
    }

    /// Sets a value under a key on the keychain backend.
    async fn set_keychain_entry(
        &self,
        set_keychain_entry_request: models::SetKeychainEntryRequest,
        ) -> Result<SetKeychainEntryResponse, ApiError>
    {
        let context = self.context().clone();
        self.api().set_keychain_entry(set_keychain_entry_request, &context).await
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
