/// the payload to define the data that is being requested
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct Query {
    #[prost(string, repeated, tag = "1")]
    pub policy: ::std::vec::Vec<std::string::String>,
    #[prost(string, tag = "2")]
    pub address: std::string::String,
    #[prost(string, tag = "3")]
    pub requesting_relay: std::string::String,
    #[prost(string, tag = "4")]
    pub requesting_network: std::string::String,
    #[prost(string, tag = "5")]
    pub certificate: std::string::String,
    #[prost(string, tag = "6")]
    pub requestor_signature: std::string::String,
    #[prost(string, tag = "7")]
    pub nonce: std::string::String,
    #[prost(string, tag = "8")]
    pub request_id: std::string::String,
    #[prost(string, tag = "9")]
    pub requesting_org: std::string::String,
}
