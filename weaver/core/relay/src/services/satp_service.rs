// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::query::Query;
use weaverpb::relay::satp::satp_client::SatpClient;
use weaverpb::relay::satp::satp_server::Satp;
use weaverpb::relay::satp::{TransferCommenceRequest, CommenceResponseRequest, LockAssertionRequest, LockAssertionReceiptRequest};

// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::{LocationSegment};
use crate::services::satp_helper::log_request_in_remote_sapt_db;

// external modules
use config;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

use super::satp_helper::create_commence_response_request;

#[derive(Debug, Default)]
pub struct SatpService {
    pub config_lock: RwLock<config::Config>,
}

/// AssetTransferService is the gRPC server implementation that handles the logic for
/// communication of the asset transfer protocol SATP between two gateways.
#[tonic::async_trait]
impl Satp for SatpService {
    /// transfer_commence is run on the receiver gateway to allow the sender gateway to signal to the 
    /// receiver gateway that it is ready to start the transfer of the digital asset
    async fn transfer_commence(
        &self,
        request: Request<TransferCommenceRequest>
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a TransferCommenceRequest from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_commence_request = request.into_inner().clone();
        let request_id = transfer_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let request_logged: Result<Option<sled::IVec>, crate::error::Error> = log_request_in_remote_sapt_db(&request_id, &transfer_commence_request, conf.clone());
        match request_logged {
            Ok(_) => println!(
                "Successfully stored TransferCommenceRequest in local satp_db with request_id: {}",
                request_id
            ),
            Err(e) => {
                // Internal failure of sled. Send Error response
                println!(
                    "Error storing TransferCommenceRequest in local satp_db for request_id: {}",
                    request_id
                );
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id,
                    message: format!("Error storing TransferCommenceRequest in local satp_db {:?}", e),
                }));
                println!("Sending Ack back with an error to network of the asset transfer request: {:?}\n", reply);
                return reply;
            }
        }

        // // Database access/storage
        // let remote_satp_db = Database {
        //     db_path: conf.get_str("db_satp_path").unwrap(),
        //     db_open_max_retries: conf.get_int("db_open_max_retries").unwrap_or(500) as u32,
        //     db_open_retry_backoff_msec: conf
        //         .get_int("db_open_retry_backoff_msec")
        //         .unwrap_or(10) as u32,
        // };
        match transfer_commence_helper(transfer_commence_request, conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of transfer commence request back: {:?}\n", reply);
                reply
            }
            Err(e) => {
                println!("Transfer commence failed.");
                let reply = Ok(
                    // TODO: remove the hardcoded value
                    Response::new(Ack {
                        status: ack::Status::Error as i32,
                        request_id: request_id.to_string(),
                        message: format!("Error: Transfer initiation failed. {:?}", e),
                    })
                );
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
        }
    }

    async fn commence_response(
        &self,
        request: Request<CommenceResponseRequest>
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a commence response request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let reply = Ok(
            Response::new(Ack {
                status: ack::Status::Error as i32,
                request_id: "xxxxxxxxx".to_string(),
                message: format!("Error: Not implemented yet."),
            })
        );
        println!("Sending back Ack: {:?}\n", reply);
        reply
    }

    async fn lock_assertion(
        &self,
        request: Request<LockAssertionRequest>
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a lock assertion request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let reply = Ok(
            Response::new(Ack {
                status: ack::Status::Error as i32,
                request_id: "xxxxxxxxx".to_string(),
                message: format!("Error: Not implemented yet."),
            })
        );
        println!("Sending back Ack: {:?}\n", reply);
        reply
    }

    async fn lock_assertion_receipt(
        &self,
        request: Request<LockAssertionReceiptRequest>
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a lock assertion receipt request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let reply = Ok(
            Response::new(Ack {
                status: ack::Status::Error as i32,
                request_id: "xxxxxxxxx".to_string(),
                message: format!("Error: Not implemented yet."),
            })
        );
        println!("Sending back Ack: {:?}\n", reply);
        reply
    }
}

/// transfer_commence_helper is run on the receiver gateway to initiate asset transfer protocol that was
/// requested from the sender gateway
pub fn transfer_commence_helper(
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config
) -> Result<Ack, Error> {
 
    let request_id = transfer_commence_request.session_id.to_string();
    let is_valid_request = check_transfer_commence_request(transfer_commence_request.clone());
    
    if is_valid_request {
        println!("The transfer commence request is valid\n");
        match send_commence_response_helper(&request_id, conf) {
            Ok(ack) => {
                println!("Ack transfer commence request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                println!("Transfer commence request failed.");
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: Transfer commence request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The transfer commence request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Invalid transfer commence request".to_string(),
        });
    }
}

fn send_commence_response_helper(
    request_id: &String,
    conf: config::Config
) -> Result<Ack, Error> {
    let query: Query = remote_satp_db
        .get::<Query>(request_id.to_string())
        .map_err(|e| Error::GetQuery(format!("Failed to get query from db. Error: {:?}", e)))?;
    let relays_table = conf.get_table("relays")?;
    let relay_uri = relays_table
        .get(&query.requesting_relay.to_string())
        .ok_or(Error::Simple("Relay name not found".to_string()))?;
    let uri = relay_uri.clone().try_into::<LocationSegment>()?;
    let commence_response_request = create_commence_response_request();

    spawn_send_commence_response(
        commence_response_request,
        uri.hostname.to_string(),
        uri.port.to_string(),
        uri.tls,
        uri.tlsca_cert_path.to_string(),
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "".to_string(),
    };

    return Ok(reply);
}

fn spawn_send_commence_response(commence_response_request: CommenceResponseRequest, requestor_host: String, requester_port: String, use_tls: bool, tlsca_cert_path: String) {
    tokio::spawn(async move {
        println!("Sending state back to sending gateway: Request ID = {:?}", commence_response_request.session_id);
        // match state.state.as_ref().unwrap() {
        //     view_payload::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
        //     view_payload::State::Error(e) => println!("Error: {:?}", e),
        // }
        let satp_client_addr = format!("http://{}:{}", requestor_host, requester_port);
        if use_tls {
            let pem = tokio::fs::read(tlsca_cert_path).await.unwrap();
            let ca = Certificate::from_pem(pem);

            let tls = ClientTlsConfig::new()
                .ca_certificate(ca)
                .domain_name(requestor_host);

            let channel = Channel::from_shared(satp_client_addr.to_string()).unwrap()
                .tls_config(tls).expect(&format!("Error in TLS configuration for client: {}", satp_client_addr.to_string()))
                .connect()
                .await
                .unwrap();

            let mut satp_client_result = SatpClient::new(channel);
            let response = satp_client_result.commence_response(commence_response_request).await;
            println!("Response ACK from sending gateway={:?}\n", response);
        } else {
            let satp_client_result = SatpClient::connect(satp_client_addr).await;
            match satp_client_result {
                Ok(satp_client) => {
                    let response = satp_client.clone().commence_response(commence_response_request).await;
                    println!("Response ACK from sending gateway={:?}\n", response);
                    // Not returning anything here
                }
                Err(e) => {
                    // TODO: Add better error handling (Attempt a few times?)
                    println!(
                        "Failed to connect to client: ${:?}. Error: {}\n",
                        requester_port,
                        e.to_string()
                    );
                    // TODO: Handle this error thorugh join handle after thread completes.
                    // Not actually returning anything here yet
                }
            }
        }
    });
}

fn check_transfer_commence_request(transfer_commence_request: TransferCommenceRequest) -> bool {
    //TODO
    true
}