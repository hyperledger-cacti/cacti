// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::query::Query;
use weaverpb::common::state::{request_state, view_payload, RequestState, ViewPayload};
use weaverpb::relay::datatransfer::data_transfer_client::DataTransferClient;
use weaverpb::relay::datatransfer::data_transfer_server::DataTransfer;
// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::{parse_address, LocationSegment};
use crate::services::helpers::{get_driver, get_driver_client};
use crate::services::types::{Driver};
// external modules
use config;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

#[derive(Debug, Default)]
pub struct AssetTransferService {
    pub config_lock: RwLock<config::Config>,
}

/// AssetTransferService is the gRPC server implementation that handles the logic for
/// communication of the asset transfer protocol between two gateways.
#[tonic::async_trait]
impl AssetTransfer for AssetTransferService {
    async fn transfer_commence(
        &self,
        request: Request<TransferCommenceRequest>
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a transfer commence request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_commence_request = request.into_inner().clone();
        let conf = self.config_lock.read().await;

        // Database access/storage
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
            db_open_max_retries: conf.get_int("db_open_max_retries").unwrap_or(500) as u32,
            db_open_retry_backoff_msec: conf
                .get_int("db_open_retry_backoff_msec")
                .unwrap_or(10) as u32,
        };

        match transfer_commence_helper(db, transfer_commence_request, conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                println!("Transfer commence failed.");
                let reply = Ok(
                    // TODO: remove the hardcoded value
                    Response::new(Ack {
                        status: ack::Status::Error as i32,
                        request_id: "xxxxxxxxx".to_string(),
                        message: format!("Error: Transfer initiation failed. {:?}", e),
                    })
                );
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
        }
    }

}

/// transfer_commence_helper is run on the receiving gateway to initiate asset transfer protocol that was
/// requested from the requesting gateway
pub fn transfer_commence_helper(
    db: Database,
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config
) -> Result<Ack, Error> {
    let _set_query = db
        .set(&transfer_commence_request.session_id.to_string(), &transfer_commence_request.session_id)
        .map_err(|e| Error::Simple(format!("DB Failure: {:?}", e)))?;

    //TODO remove hardcoded value
    let network_id = "Dummy_Network";
    let result = get_driver(network_id.to_string(), conf.clone());
    match result {
        Ok(driver_info) => {
            spawn_transfer_commence_request(
                initialization_request,
                &driver_info,
                conf.clone()
            );
            // TODO: remove the hardcoded value
            return Ok(Ack {
                status: ack::Status::Ok as i32,
                request_id: "xxxxxxxx".to_string(),
                message: driver_info.hostname.to_string(),
            });
        }
        Err(e) => Err(e),
    }
}

// Function that starts a thread which checks the transfer initialization request
fn spawn_transfer_commence_request(
    transfer_commence_request: TransferCommenceRequest,
    driver_info: &Driver,
    conf: config::Config
) {
    tokio::spawn(async move {
        let is_valid_request = check_transfer_commence_request(initialization_request.clone());
        if is_valid_request {
            // Send an InitiationResponse message to the requesting gateway
            println!("The asset initiation request is valid\n");
        } else {
            // Send an InitiationDenied message to the requesting gateway
            println!("The asset initiation request is denied\n");
        }
    });
}

fn check_transfer_commence_request(transfer_commence_request: TransferCommenceRequest) -> bool {
    true
}