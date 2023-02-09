#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventMatcher {
    #[prost(enumeration = "EventType", tag = "1")]
    pub event_type: i32,
    #[prost(string, tag = "2")]
    pub event_class_id: std::string::String,
    #[prost(string, tag = "3")]
    pub transaction_ledger_id: std::string::String,
    #[prost(string, tag = "4")]
    pub transaction_contract_id: std::string::String,
    #[prost(string, tag = "5")]
    pub transaction_func: std::string::String,
}
/// Below message is used to communicate between dest-relay and src-relay;
/// and src-relay and src-driver.
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventSubscription {
    #[prost(message, optional, tag = "1")]
    pub event_matcher: ::std::option::Option<EventMatcher>,
    #[prost(message, optional, tag = "2")]
    pub query: ::std::option::Option<super::query::Query>,
    #[prost(enumeration = "EventSubOperation", tag = "3")]
    pub operation: i32,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventSubscriptionState {
    #[prost(string, tag = "1")]
    pub request_id: std::string::String,
    #[prost(string, tag = "2")]
    pub publishing_request_id: std::string::String,
    #[prost(enumeration = "event_subscription_state::Status", tag = "3")]
    pub status: i32,
    #[prost(string, tag = "4")]
    pub message: std::string::String,
    #[prost(message, optional, tag = "5")]
    pub event_matcher: ::std::option::Option<EventMatcher>,
    #[prost(message, repeated, tag = "6")]
    pub event_publication_specs: ::std::vec::Vec<EventPublication>,
}
pub mod event_subscription_state {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
    #[repr(i32)]
    #[derive(serde::Serialize, serde::Deserialize)]
    pub enum Status {
        /// pending ACK from remote relay
        SubscribePendingAck = 0,
        /// Received ACK, waiting for event subscription confirmation from remote relay
        SubscribePending = 1,
        Subscribed = 2,
        UnsubscribePendingAck = 3,
        UnsubscribePending = 4,
        Unsubscribed = 5,
        Error = 6,
        DuplicateQuerySubscribed = 7,
    }
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct ContractTransaction {
    #[prost(string, tag = "1")]
    pub driver_id: std::string::String,
    #[prost(string, tag = "2")]
    pub ledger_id: std::string::String,
    #[prost(string, tag = "3")]
    pub contract_id: std::string::String,
    #[prost(string, tag = "4")]
    pub func: std::string::String,
    #[prost(bytes, repeated, tag = "5")]
    pub args: ::std::vec::Vec<std::vec::Vec<u8>>,
    #[prost(uint64, tag = "6")]
    pub replace_arg_index: u64,
    #[prost(string, repeated, tag = "7")]
    pub members: ::std::vec::Vec<std::string::String>,
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventPublication {
    #[prost(oneof = "event_publication::PublicationTarget", tags = "1, 2")]
    pub publication_target: ::std::option::Option<event_publication::PublicationTarget>,
}
pub mod event_publication {
    #[derive(Clone, PartialEq, ::prost::Oneof, serde::Serialize, serde::Deserialize)]
    pub enum PublicationTarget {
        #[prost(message, tag = "1")]
        Ctx(super::ContractTransaction),
        #[prost(string, tag = "2")]
        AppUrl(std::string::String),
    }
}
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventStates {
    #[prost(message, repeated, tag = "1")]
    pub states: ::std::vec::Vec<EventState>,
}
/// the payload that is used for the communication between the requesting relay
/// and its network
#[derive(Clone, PartialEq, ::prost::Message, serde::Serialize, serde::Deserialize)]
pub struct EventState {
    #[prost(message, optional, tag = "1")]
    pub state: ::std::option::Option<super::state::RequestState>,
    #[prost(string, tag = "2")]
    pub event_id: std::string::String,
    #[prost(string, tag = "3")]
    pub message: std::string::String,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum EventType {
    LedgerState = 0,
    AssetLock = 1,
    AssetClaim = 2,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum EventSubOperation {
    Subscribe = 0,
    Unsubscribe = 1,
    Update = 2,
}
