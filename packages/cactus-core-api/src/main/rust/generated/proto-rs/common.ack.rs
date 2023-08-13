/// This message respresents "ACKs" sent between relay-relay,
/// relay-driver and relay-network
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, ::prost::Message)]
pub struct Ack {
    #[prost(enumeration = "ack::Status", tag = "2")]
    pub status: i32,
    #[prost(string, tag = "3")]
    pub request_id: ::prost::alloc::string::String,
    /// an error can have an associated string
    /// this is the best way to represent this in protobuf
    #[prost(string, tag = "4")]
    pub message: ::prost::alloc::string::String,
}
/// Nested message and enum types in `Ack`.
pub mod ack {
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
        Ok = 0,
        Error = 1,
    }
}
