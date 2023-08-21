/// Metadata for a View
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Message)]
pub struct Meta {
    /// Underlying distributed ledger protocol.
    #[prost(enumeration = "meta::Protocol", tag = "1")]
    pub protocol: i32,
    /// What notion of time?
    /// If the observer and network are synchronizing on a global clock
    /// there won't be a need to distinguish between static and dynamic views.
    #[prost(string, tag = "2")]
    pub timestamp: ::prost::alloc::string::String,
    /// Notorization, SPV, ZKP, etc. Possibly enum
    #[prost(string, tag = "3")]
    pub proof_type: ::prost::alloc::string::String,
    /// The data field's serialization format (e.g. JSON, XML, Protobuf)
    #[prost(string, tag = "4")]
    pub serialization_format: ::prost::alloc::string::String,
}
/// Nested message and enum types in `Meta`.
pub mod meta {
    #[derive(
        serde::Serialize,
        serde::Deserialize,
        Clone,
        Copy,
        Debug,
        PartialEq,
        Eq,
        Hash,
        PartialOrd,
        Ord,
        ::prost::Enumeration,
    )]
    #[repr(i32)]
    pub enum Protocol {
        Bitcoin = 0,
        Ethereum = 1,
        Fabric = 3,
        Corda = 4,
    }
}
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Message)]
pub struct View {
    #[prost(message, optional, tag = "1")]
    pub meta: ::core::option::Option<Meta>,
    /// Represents the data playload of this view.
    /// The representation of Fabric, Corda etc will be captured elsewhere.
    /// For some protocols, like Bitcoin, the structure of an SPV proof is well known.
    #[prost(bytes = "vec", tag = "2")]
    pub data: ::prost::alloc::vec::Vec<u8>,
}
/// View represents the response from a remote network
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Message)]
pub struct ViewPayload {
    #[prost(string, tag = "1")]
    pub request_id: ::prost::alloc::string::String,
    #[prost(oneof = "view_payload::State", tags = "2, 3")]
    pub state: ::core::option::Option<view_payload::State>,
}
/// Nested message and enum types in `ViewPayload`.
pub mod view_payload {
    #[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Oneof)]
    pub enum State {
        #[prost(message, tag = "2")]
        View(super::View),
        #[prost(string, tag = "3")]
        Error(::prost::alloc::string::String),
    }
}
/// the payload that is used for the communication between the requesting relay
/// and its network
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Message)]
pub struct RequestState {
    #[prost(string, tag = "1")]
    pub request_id: ::prost::alloc::string::String,
    #[prost(enumeration = "request_state::Status", tag = "2")]
    pub status: i32,
    #[prost(oneof = "request_state::State", tags = "3, 4")]
    pub state: ::core::option::Option<request_state::State>,
}
/// Nested message and enum types in `RequestState`.
pub mod request_state {
    #[derive(
        serde::Serialize,
        serde::Deserialize,
        Clone,
        Copy,
        Debug,
        PartialEq,
        Eq,
        Hash,
        PartialOrd,
        Ord,
        ::prost::Enumeration,
    )]
    #[repr(i32)]
    pub enum Status {
        /// pending ACK from remote relay
        PendingAck = 0,
        /// Received ACK, waiting for data to be sent from remote relay
        Pending = 1,
        Error = 2,
        Completed = 3,
    }
    #[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Oneof)]
    pub enum State {
        #[prost(message, tag = "3")]
        View(super::View),
        #[prost(string, tag = "4")]
        Error(::prost::alloc::string::String),
    }
}
