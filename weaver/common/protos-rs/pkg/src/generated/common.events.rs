#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventMatcher {
    #[prost(enumeration = "EventType", tag = "1")]
    pub event_type: i32,
    #[prost(string, tag = "2")]
    pub event_class_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub transaction_ledger_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub transaction_contract_id: ::prost::alloc::string::String,
    #[prost(string, tag = "5")]
    pub transaction_func: ::prost::alloc::string::String,
}
/// Below message is used to communicate between dest-relay and src-relay;
/// and src-relay and src-driver.
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventSubscription {
    #[prost(message, optional, tag = "1")]
    pub event_matcher: ::core::option::Option<EventMatcher>,
    #[prost(message, optional, tag = "2")]
    pub query: ::core::option::Option<super::query::Query>,
    #[prost(enumeration = "EventSubOperation", tag = "3")]
    pub operation: i32,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventSubscriptionState {
    #[prost(string, tag = "1")]
    pub request_id: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub publishing_request_id: ::prost::alloc::string::String,
    #[prost(enumeration = "event_subscription_state::Status", tag = "3")]
    pub status: i32,
    #[prost(string, tag = "4")]
    pub message: ::prost::alloc::string::String,
    #[prost(message, optional, tag = "5")]
    pub event_matcher: ::core::option::Option<EventMatcher>,
    #[prost(message, repeated, tag = "6")]
    pub event_publication_specs: ::prost::alloc::vec::Vec<EventPublication>,
}
/// Nested message and enum types in `EventSubscriptionState`.
pub mod event_subscription_state {
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
    impl Status {
        /// String value of the enum field names used in the ProtoBuf definition.
        ///
        /// The values are not transformed in any way and thus are considered stable
        /// (if the ProtoBuf definition does not change) and safe for programmatic use.
        pub fn as_str_name(&self) -> &'static str {
            match self {
                Status::SubscribePendingAck => "SUBSCRIBE_PENDING_ACK",
                Status::SubscribePending => "SUBSCRIBE_PENDING",
                Status::Subscribed => "SUBSCRIBED",
                Status::UnsubscribePendingAck => "UNSUBSCRIBE_PENDING_ACK",
                Status::UnsubscribePending => "UNSUBSCRIBE_PENDING",
                Status::Unsubscribed => "UNSUBSCRIBED",
                Status::Error => "ERROR",
                Status::DuplicateQuerySubscribed => "DUPLICATE_QUERY_SUBSCRIBED",
            }
        }
        /// Creates an enum from field names used in the ProtoBuf definition.
        pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
            match value {
                "SUBSCRIBE_PENDING_ACK" => Some(Self::SubscribePendingAck),
                "SUBSCRIBE_PENDING" => Some(Self::SubscribePending),
                "SUBSCRIBED" => Some(Self::Subscribed),
                "UNSUBSCRIBE_PENDING_ACK" => Some(Self::UnsubscribePendingAck),
                "UNSUBSCRIBE_PENDING" => Some(Self::UnsubscribePending),
                "UNSUBSCRIBED" => Some(Self::Unsubscribed),
                "ERROR" => Some(Self::Error),
                "DUPLICATE_QUERY_SUBSCRIBED" => Some(Self::DuplicateQuerySubscribed),
                _ => None,
            }
        }
    }
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ContractTransaction {
    #[prost(string, tag = "1")]
    pub driver_id: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub ledger_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub contract_id: ::prost::alloc::string::String,
    #[prost(string, tag = "4")]
    pub func: ::prost::alloc::string::String,
    #[prost(bytes = "vec", repeated, tag = "5")]
    pub args: ::prost::alloc::vec::Vec<::prost::alloc::vec::Vec<u8>>,
    #[prost(uint64, tag = "6")]
    pub replace_arg_index: u64,
    #[prost(string, repeated, tag = "7")]
    pub members: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventPublication {
    #[prost(oneof = "event_publication::PublicationTarget", tags = "1, 2")]
    pub publication_target: ::core::option::Option<event_publication::PublicationTarget>,
}
/// Nested message and enum types in `EventPublication`.
pub mod event_publication {
    #[derive(serde::Serialize, serde::Deserialize)]
    #[allow(clippy::derive_partial_eq_without_eq)]
    #[derive(Clone, PartialEq, ::prost::Oneof)]
    pub enum PublicationTarget {
        #[prost(message, tag = "1")]
        Ctx(super::ContractTransaction),
        #[prost(string, tag = "2")]
        AppUrl(::prost::alloc::string::String),
    }
}
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventStates {
    #[prost(message, repeated, tag = "1")]
    pub states: ::prost::alloc::vec::Vec<EventState>,
}
/// the payload that is used for the communication between the requesting relay
/// and its network
#[derive(serde::Serialize, serde::Deserialize)]
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct EventState {
    #[prost(message, optional, tag = "1")]
    pub state: ::core::option::Option<super::state::RequestState>,
    #[prost(string, tag = "2")]
    pub event_id: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub message: ::prost::alloc::string::String,
}
#[derive(serde::Serialize, serde::Deserialize)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum EventType {
    LedgerState = 0,
    AssetLock = 1,
    AssetClaim = 2,
}
impl EventType {
    /// String value of the enum field names used in the ProtoBuf definition.
    ///
    /// The values are not transformed in any way and thus are considered stable
    /// (if the ProtoBuf definition does not change) and safe for programmatic use.
    pub fn as_str_name(&self) -> &'static str {
        match self {
            EventType::LedgerState => "LEDGER_STATE",
            EventType::AssetLock => "ASSET_LOCK",
            EventType::AssetClaim => "ASSET_CLAIM",
        }
    }
    /// Creates an enum from field names used in the ProtoBuf definition.
    pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
        match value {
            "LEDGER_STATE" => Some(Self::LedgerState),
            "ASSET_LOCK" => Some(Self::AssetLock),
            "ASSET_CLAIM" => Some(Self::AssetClaim),
            _ => None,
        }
    }
}
#[derive(serde::Serialize, serde::Deserialize)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum EventSubOperation {
    Subscribe = 0,
    Unsubscribe = 1,
    Update = 2,
}
impl EventSubOperation {
    /// String value of the enum field names used in the ProtoBuf definition.
    ///
    /// The values are not transformed in any way and thus are considered stable
    /// (if the ProtoBuf definition does not change) and safe for programmatic use.
    pub fn as_str_name(&self) -> &'static str {
        match self {
            EventSubOperation::Subscribe => "SUBSCRIBE",
            EventSubOperation::Unsubscribe => "UNSUBSCRIBE",
            EventSubOperation::Update => "UPDATE",
        }
    }
    /// Creates an enum from field names used in the ProtoBuf definition.
    pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
        match value {
            "SUBSCRIBE" => Some(Self::Subscribe),
            "UNSUBSCRIBE" => Some(Self::Unsubscribe),
            "UPDATE" => Some(Self::Update),
            _ => None,
        }
    }
}
