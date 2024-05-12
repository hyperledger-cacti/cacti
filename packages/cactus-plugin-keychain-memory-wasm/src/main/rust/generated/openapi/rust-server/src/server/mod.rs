use futures::{future, future::BoxFuture, Stream, stream, future::FutureExt, stream::TryStreamExt};
use hyper::{Request, Response, StatusCode, Body, HeaderMap};
use hyper::header::{HeaderName, HeaderValue, CONTENT_TYPE};
use log::warn;
#[allow(unused_imports)]
use std::convert::{TryFrom, TryInto};
use std::error::Error;
use std::future::Future;
use std::marker::PhantomData;
use std::task::{Context, Poll};
use swagger::{ApiError, BodyExt, Has, RequestParser, XSpanIdString};
pub use swagger::auth::Authorization;
use swagger::auth::Scopes;
use url::form_urlencoded;

#[allow(unused_imports)]
use crate::models;
use crate::header;

pub use crate::context;

type ServiceFuture = BoxFuture<'static, Result<Response<Body>, crate::ServiceError>>;

use crate::{Api,
     DeleteKeychainEntryV1Response,
     GetKeychainEntryV1Response,
     GetPrometheusMetricsV1Response,
     HasKeychainEntryV1Response,
     SetKeychainEntryV1Response
};

mod paths {
    use lazy_static::lazy_static;

    lazy_static! {
        pub static ref GLOBAL_REGEX_SET: regex::RegexSet = regex::RegexSet::new(vec![
            r"^/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/delete-keychain-entry$",
            r"^/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-keychain-entry$",
            r"^/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-prometheus-exporter-metrics$",
            r"^/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/has-keychain-entry$",
            r"^/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/set-keychain-entry$"
        ])
        .expect("Unable to create global regex set");
    }
    pub(crate) static ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_DELETE_KEYCHAIN_ENTRY: usize = 0;
    pub(crate) static ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_KEYCHAIN_ENTRY: usize = 1;
    pub(crate) static ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_PROMETHEUS_EXPORTER_METRICS: usize = 2;
    pub(crate) static ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_HAS_KEYCHAIN_ENTRY: usize = 3;
    pub(crate) static ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_SET_KEYCHAIN_ENTRY: usize = 4;
}

pub struct MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    api_impl: T,
    marker: PhantomData<C>,
}

impl<T, C> MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    pub fn new(api_impl: T) -> Self {
        MakeService {
            api_impl,
            marker: PhantomData
        }
    }
}

impl<T, C, Target> hyper::service::Service<Target> for MakeService<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    type Response = Service<T, C>;
    type Error = crate::ServiceError;
    type Future = future::Ready<Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, target: Target) -> Self::Future {
        futures::future::ok(Service::new(
            self.api_impl.clone(),
        ))
    }
}

fn method_not_allowed() -> Result<Response<Body>, crate::ServiceError> {
    Ok(
        Response::builder().status(StatusCode::METHOD_NOT_ALLOWED)
            .body(Body::empty())
            .expect("Unable to create Method Not Allowed response")
    )
}

pub struct Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    api_impl: T,
    marker: PhantomData<C>,
}

impl<T, C> Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    pub fn new(api_impl: T) -> Self {
        Service {
            api_impl,
            marker: PhantomData
        }
    }
}

impl<T, C> Clone for Service<T, C> where
    T: Api<C> + Clone + Send + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    fn clone(&self) -> Self {
        Service {
            api_impl: self.api_impl.clone(),
            marker: self.marker,
        }
    }
}

impl<T, C> hyper::service::Service<(Request<Body>, C)> for Service<T, C> where
    T: Api<C> + Clone + Send + Sync + 'static,
    C: Has<XSpanIdString>  + Send + Sync + 'static
{
    type Response = Response<Body>;
    type Error = crate::ServiceError;
    type Future = ServiceFuture;

    fn poll_ready(&mut self, cx: &mut Context) -> Poll<Result<(), Self::Error>> {
        self.api_impl.poll_ready(cx)
    }

    fn call(&mut self, req: (Request<Body>, C)) -> Self::Future { async fn run<T, C>(mut api_impl: T, req: (Request<Body>, C)) -> Result<Response<Body>, crate::ServiceError> where
        T: Api<C> + Clone + Send + 'static,
        C: Has<XSpanIdString>  + Send + Sync + 'static
    {
        let (request, context) = req;
        let (parts, body) = request.into_parts();
        let (method, uri, headers) = (parts.method, parts.uri, parts.headers);
        let path = paths::GLOBAL_REGEX_SET.matches(uri.path());

        match method {

            // DeleteKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/delete-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_DELETE_KEYCHAIN_ENTRY) => {
                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_delete_keychain_entry_request_v1) => param_delete_keychain_entry_request_v1,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter DeleteKeychainEntryRequestV1 - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter DeleteKeychainEntryRequestV1 due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_delete_keychain_entry_request_v1: Option<models::DeleteKeychainEntryRequestV1> = match param_delete_keychain_entry_request_v1 {
                                    Some(param_delete_keychain_entry_request_v1) => Some(param_delete_keychain_entry_request_v1),
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter DeleteKeychainEntryRequestV1"))
                                                        .expect("Unable to create Bad Request response for missing body parameter DeleteKeychainEntryRequestV1")),
                                };

                                let result = api_impl.delete_keychain_entry_v1(
                                            param_delete_keychain_entry_request_v1,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                DeleteKeychainEntryV1Response::OK
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for DELETE_KEYCHAIN_ENTRY_V1_OK"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                DeleteKeychainEntryV1Response::BadRequest
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(400).expect("Unable to turn 400 into a StatusCode");
                                                },
                                                DeleteKeychainEntryV1Response::AuthorizationInformationIsMissingOrInvalid
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                                DeleteKeychainEntryV1Response::UnexpectedError
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(500).expect("Unable to turn 500 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter DeleteKeychainEntryRequestV1: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter DeleteKeychainEntryRequestV1")),
                        }
            },

            // GetKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_KEYCHAIN_ENTRY) => {
                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_get_keychain_entry_request_v1: Option<models::GetKeychainEntryRequestV1> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_get_keychain_entry_request_v1) => param_get_keychain_entry_request_v1,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter GetKeychainEntryRequestV1 - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter GetKeychainEntryRequestV1 due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_get_keychain_entry_request_v1 = match param_get_keychain_entry_request_v1 {
                                    Some(param_get_keychain_entry_request_v1) => param_get_keychain_entry_request_v1,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter GetKeychainEntryRequestV1"))
                                                        .expect("Unable to create Bad Request response for missing body parameter GetKeychainEntryRequestV1")),
                                };

                                let result = api_impl.get_keychain_entry_v1(
                                            param_get_keychain_entry_request_v1,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                GetKeychainEntryV1Response::OK
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for GET_KEYCHAIN_ENTRY_V1_OK"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                GetKeychainEntryV1Response::BadRequest
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(400).expect("Unable to turn 400 into a StatusCode");
                                                },
                                                GetKeychainEntryV1Response::AuthorizationInformationIsMissingOrInvalid
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                                GetKeychainEntryV1Response::AKeychainItemWithTheSpecifiedKeyWasNotFound
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(404).expect("Unable to turn 404 into a StatusCode");
                                                },
                                                GetKeychainEntryV1Response::UnexpectedError
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(500).expect("Unable to turn 500 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter GetKeychainEntryRequestV1: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter GetKeychainEntryRequestV1")),
                        }
            },

            // GetPrometheusMetricsV1 - GET /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-prometheus-exporter-metrics
            hyper::Method::GET if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_PROMETHEUS_EXPORTER_METRICS) => {
                let result = api_impl.get_prometheus_metrics_v1(
                        &context
                    ).await;
                let mut response = Response::new(Body::empty());
                response.headers_mut().insert(
                            HeaderName::from_static("x-span-id"),
                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().to_string().as_str())
                                .expect("Unable to create X-Span-ID header value"));

                        match result {
                            Ok(rsp) => match rsp {
                                GetPrometheusMetricsV1Response::OK
                                    (body)
                                => {
                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                    response.headers_mut().insert(
                                        CONTENT_TYPE,
                                        HeaderValue::from_str("text/plain")
                                            .expect("Unable to create Content-Type header for GET_PROMETHEUS_METRICS_V1_OK"));
                                    let body = body;
                                    *response.body_mut() = Body::from(body);
                                },
                            },
                            Err(_) => {
                                // Application code returned an error. This should not happen, as the implementation should
                                // return a valid response.
                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                *response.body_mut() = Body::from("An internal error occurred");
                            },
                        }

                        Ok(response)
            },

            // HasKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/has-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_HAS_KEYCHAIN_ENTRY) => {
                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_has_keychain_entry_request_v1) => param_has_keychain_entry_request_v1,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter HasKeychainEntryRequestV1 - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter HasKeychainEntryRequestV1 due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_has_keychain_entry_request_v1: Option<models::HasKeychainEntryRequestV1> = match param_has_keychain_entry_request_v1 {
                                    Some(param_has_keychain_entry_request_v1) => Some(param_has_keychain_entry_request_v1),
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter HasKeychainEntryRequestV1"))
                                                        .expect("Unable to create Bad Request response for missing body parameter HasKeychainEntryRequestV1")),
                                };

                                let result = api_impl.has_keychain_entry_v1(
                                            param_has_keychain_entry_request_v1,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                HasKeychainEntryV1Response::OK
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for HAS_KEYCHAIN_ENTRY_V1_OK"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                HasKeychainEntryV1Response::BadRequest
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(400).expect("Unable to turn 400 into a StatusCode");
                                                },
                                                HasKeychainEntryV1Response::AuthorizationInformationIsMissingOrInvalid
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                                HasKeychainEntryV1Response::UnexpectedError
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(500).expect("Unable to turn 500 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter HasKeychainEntryRequestV1: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter HasKeychainEntryRequestV1")),
                        }
            },

            // SetKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/set-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_SET_KEYCHAIN_ENTRY) => {
                // Body parameters (note that non-required body parameters will ignore garbage
                // values, rather than causing a 400 response). Produce warning header and logs for
                // any unused fields.
                let result = body.into_raw().await;
                match result {
                            Ok(body) => {
                                let mut unused_elements = Vec::new();
                                let param_set_keychain_entry_request_v1: Option<models::SetKeychainEntryRequestV1> = if !body.is_empty() {
                                    let deserializer = &mut serde_json::Deserializer::from_slice(&body);
                                    match serde_ignored::deserialize(deserializer, |path| {
                                            warn!("Ignoring unknown field in body: {}", path);
                                            unused_elements.push(path.to_string());
                                    }) {
                                        Ok(param_set_keychain_entry_request_v1) => param_set_keychain_entry_request_v1,
                                        Err(e) => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from(format!("Couldn't parse body parameter SetKeychainEntryRequestV1 - doesn't match schema: {}", e)))
                                                        .expect("Unable to create Bad Request response for invalid body parameter SetKeychainEntryRequestV1 due to schema")),
                                    }
                                } else {
                                    None
                                };
                                let param_set_keychain_entry_request_v1 = match param_set_keychain_entry_request_v1 {
                                    Some(param_set_keychain_entry_request_v1) => param_set_keychain_entry_request_v1,
                                    None => return Ok(Response::builder()
                                                        .status(StatusCode::BAD_REQUEST)
                                                        .body(Body::from("Missing required body parameter SetKeychainEntryRequestV1"))
                                                        .expect("Unable to create Bad Request response for missing body parameter SetKeychainEntryRequestV1")),
                                };

                                let result = api_impl.set_keychain_entry_v1(
                                            param_set_keychain_entry_request_v1,
                                        &context
                                    ).await;
                                let mut response = Response::new(Body::empty());
                                response.headers_mut().insert(
                                            HeaderName::from_static("x-span-id"),
                                            HeaderValue::from_str((&context as &dyn Has<XSpanIdString>).get().0.clone().as_str())
                                                .expect("Unable to create X-Span-ID header value"));

                                        if !unused_elements.is_empty() {
                                            response.headers_mut().insert(
                                                HeaderName::from_static("warning"),
                                                HeaderValue::from_str(format!("Ignoring unknown fields in body: {:?}", unused_elements).as_str())
                                                    .expect("Unable to create Warning header value"));
                                        }

                                        match result {
                                            Ok(rsp) => match rsp {
                                                SetKeychainEntryV1Response::OK
                                                    (body)
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(200).expect("Unable to turn 200 into a StatusCode");
                                                    response.headers_mut().insert(
                                                        CONTENT_TYPE,
                                                        HeaderValue::from_str("application/json")
                                                            .expect("Unable to create Content-Type header for SET_KEYCHAIN_ENTRY_V1_OK"));
                                                    let body = serde_json::to_string(&body).expect("impossible to fail to serialize");
                                                    *response.body_mut() = Body::from(body);
                                                },
                                                SetKeychainEntryV1Response::BadRequest
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(400).expect("Unable to turn 400 into a StatusCode");
                                                },
                                                SetKeychainEntryV1Response::AuthorizationInformationIsMissingOrInvalid
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(401).expect("Unable to turn 401 into a StatusCode");
                                                },
                                                SetKeychainEntryV1Response::UnexpectedError
                                                => {
                                                    *response.status_mut() = StatusCode::from_u16(500).expect("Unable to turn 500 into a StatusCode");
                                                },
                                            },
                                            Err(_) => {
                                                // Application code returned an error. This should not happen, as the implementation should
                                                // return a valid response.
                                                *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                                                *response.body_mut() = Body::from("An internal error occurred");
                                            },
                                        }

                                        Ok(response)
                            },
                            Err(e) => Ok(Response::builder()
                                                .status(StatusCode::BAD_REQUEST)
                                                .body(Body::from(format!("Couldn't read body parameter SetKeychainEntryRequestV1: {}", e)))
                                                .expect("Unable to create Bad Request response due to unable to read body parameter SetKeychainEntryRequestV1")),
                        }
            },

            _ if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_DELETE_KEYCHAIN_ENTRY) => method_not_allowed(),
            _ if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_KEYCHAIN_ENTRY) => method_not_allowed(),
            _ if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_PROMETHEUS_EXPORTER_METRICS) => method_not_allowed(),
            _ if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_HAS_KEYCHAIN_ENTRY) => method_not_allowed(),
            _ if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_SET_KEYCHAIN_ENTRY) => method_not_allowed(),
            _ => Ok(Response::builder().status(StatusCode::NOT_FOUND)
                    .body(Body::empty())
                    .expect("Unable to create Not Found response"))
        }
    } Box::pin(run(self.api_impl.clone(), req)) }
}

/// Request parser for `Api`.
pub struct ApiRequestParser;
impl<T> RequestParser<T> for ApiRequestParser {
    fn parse_operation_id(request: &Request<T>) -> Option<&'static str> {
        let path = paths::GLOBAL_REGEX_SET.matches(request.uri().path());
        match *request.method() {
            // DeleteKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/delete-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_DELETE_KEYCHAIN_ENTRY) => Some("DeleteKeychainEntryV1"),
            // GetKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_KEYCHAIN_ENTRY) => Some("GetKeychainEntryV1"),
            // GetPrometheusMetricsV1 - GET /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-prometheus-exporter-metrics
            hyper::Method::GET if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_GET_PROMETHEUS_EXPORTER_METRICS) => Some("GetPrometheusMetricsV1"),
            // HasKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/has-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_HAS_KEYCHAIN_ENTRY) => Some("HasKeychainEntryV1"),
            // SetKeychainEntryV1 - POST /api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/set-keychain-entry
            hyper::Method::POST if path.matched(paths::ID_API_V1_PLUGINS_HYPERLEDGER_CACTUS_PLUGIN_KEYCHAIN_VAULT_SET_KEYCHAIN_ENTRY) => Some("SetKeychainEntryV1"),
            _ => None,
        }
    }
}
