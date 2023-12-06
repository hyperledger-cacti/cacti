/// the payload to define the data that is being requested
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Query {
    #[prost(string, repeated, tag = "1")]
    pub policy: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(string, tag = "2")]
    pub address: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub requesting_relay: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub requesting_network: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub certificate: ::prost::alloc::string::String,
    #[prost(string, tag = "6")]
    pub requestor_signature: ::prost::alloc::string::String,
    #[prost(string, tag = "7")]
    pub nonce: ::prost::alloc::string::String,
    #[prost(string, tag = "8")]
    pub request_id: ::prost::alloc::string::String,
    #[prost(string, tag = "9")]
    pub requesting_org: ::prost::alloc::string::String,
}
