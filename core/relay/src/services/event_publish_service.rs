// Internal generated modules
use crate::pb::common::ack::{ack, Ack};
use crate::pb::common::query::Query;
use crate::pb::common::state::{request_state, view_payload, RequestState, ViewPayload};
use crate::pb::relay::events::event_publish_client::EventPublishClient;
use crate::pb::relay::events::event_publish_server::EventPublish;
// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::{parse_address, LocationSegment};
// external modules
use config;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

pub struct EventPublishService {
    pub config_lock: RwLock<config::Config>,
}

/// EventPublishService is the gRPC server implementation that handles the logic for
/// communicating event published from driver to the remote relay.
#[tonic::async_trait]
impl EventPublish for EventPublishService {
    // src-driver forwards the state as part of event subscription to src-relay
    async fn send_driver_state(
        &self,
        request: Request<ViewPayload>,
    ) -> Result<Response<Ack>, Status> {
        Err(tonic::Status::unimplemented("method not implemented"))
    }
    // src-relay will forward the state as part of event subscription to dest-relay
    async fn send_state(&self, request: Request<ViewPayload>) -> Result<Response<Ack>, Status> {
        Err(tonic::Status::unimplemented("method not implemented"))
    }

}