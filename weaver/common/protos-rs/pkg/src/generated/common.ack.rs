/// This message respresents "ACKs" sent between relay-relay,
/// relay-driver and relay-network
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct Ack {
    #[prost(enumeration = "ack::Status", tag = "2")]
    pub status: i32,
    #[prost(string, tag = "3")]
    pub request_id: std::string::String,
    /// an error can have an associated string
    /// this is the best way to represent this in protobuf
    #[prost(string, tag = "4")]
    pub message: std::string::String,
}
pub mod ack {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
    #[repr(i32)]
    #[derive(serde::Serialize, serde::Deserialize)]
    pub enum Status {
        Ok = 0,
        Error = 1,
    }
}
