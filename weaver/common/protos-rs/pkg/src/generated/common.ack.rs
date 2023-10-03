/// This message respresents "ACKs" sent between relay-relay,
/// relay-driver and relay-network
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
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
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(
        Clone,
        Copy,
        Debug,
        PartialEq,
        Eq,
        Hash,
        PartialOrd,
        Ord,
        ::prost::Enumeration
    )]
    #[repr(i32)]
    pub enum Status {
        Ok = 0,
        Error = 1,
    }
    impl Status {
        /// String value of the enum field names used in the ProtoBuf definition.
        ///
        /// The values are not transformed in any way and thus are considered stable
        /// (if the ProtoBuf definition does not change) and safe for programmatic use.
        pub fn as_str_name(&self) -> &'static str {
            match self {
                Status::Ok => "OK",
                Status::Error => "ERROR",
            }
        }
        /// Creates an enum from field names used in the ProtoBuf definition.
        pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
            match value {
                "OK" => Some(Self::Ok),
                "ERROR" => Some(Self::Error),
                _ => None,
            }
        }
    }
}
