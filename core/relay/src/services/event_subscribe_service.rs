// Internal generated modules
use crate::pb::common::ack::{ack, Ack};
use crate::pb::common::events::EventSubscription;
use crate::pb::driver::driver::driver_communication_client::DriverCommunicationClient;
use crate::pb::relay::events::event_subscribe_client::EventSubscribeClient;
use crate::pb::relay::events::event_subscribe_server::EventSubscribe;
// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::{parse_address, LocationSegment};
// external modules
use config;
use serde;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};
use base64::{encode, decode};

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

pub struct EventSubscribeService {
    pub config_lock: RwLock<config::Config>,
}
#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, Debug)]
pub struct Driver {
    port: String,
    hostname: String,
    tls: bool,
    tlsca_cert_path: String,
}

#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, Debug)]
pub struct Network {
    network: String,
}

/// DataTransferService is the gRPC server implementation that handles the logic for
/// communication of the data transfer protocol between two relays.
#[tonic::async_trait]
impl EventSubscribe for EventSubscribeService {
    async fn subscribe_event(&self, request: Request<EventSubscription>) -> Result<Response<Ack>, Status> {
        Err(tonic::Status::unimplemented("method not implemented"))
    }
    async fn send_subscription_status(&self, request: Request<Ack>) -> Result<Response<Ack>, Status> {
        Err(tonic::Status::unimplemented("method not implemented"))
    }

}