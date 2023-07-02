// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::relay::satp::satp_client::SatpClient;
use weaverpb::relay::satp::satp_server::Satp;
use weaverpb::relay::satp::{TransferCommenceRequest, CommenceResponseRequest, LockAssertionRequest, LockAssertionReceiptRequest};

// Internal modules
use crate::error::Error;
use crate::services::satp_helper::{log_request_in_remote_sapt_db, log_request_in_local_sapt_db, create_satp_client, commence_response_call, log_result};

// external modules
use config::{self, Config};
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};
use tonic::transport::{Certificate, Channel, ClientTlsConfig};
use super::satp_helper::{create_commence_response_request, get_requesting_relay_host_and_port, get_relay_params, spawn_send_commence_response_request};

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
        println!("Got a TransferCommenceRequest from {:?} - {:?}", request.remote_addr(), request);

        let transfer_commence_request = request.into_inner().clone();
        let request_id = transfer_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        // TODO refactor
        let request_logged: Result<Option<sled::IVec>, Error> = log_request_in_remote_sapt_db(&request_id, &transfer_commence_request, conf.clone());
        match request_logged {
            Ok(_) => println!(
                "Successfully stored TransferCommenceRequest in remote satp_db with request_id: {}",
                request_id
            ),
            Err(e) => {
                // Internal failure of sled. Send Error response
                println!(
                    "Error storing TransferCommenceRequest in remote satp_db for request_id: {}",
                    request_id
                );
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id,
                    message: format!("Error storing TransferCommenceRequest in remote satp_db {:?}", e),
                }));
                println!("Sending Ack back with an error to network of the asset transfer request: {:?}\n", reply);
                return reply;
            }
        }

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

        let commence_response_request = request.into_inner().clone();
        let request_id = commence_response_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        // TODO refactor
        let request_logged: Result<Option<sled::IVec>, Error> = log_request_in_local_sapt_db(&request_id, &commence_response_request, conf.clone());
        match request_logged {
            Ok(_) => println!(
                "Successfully stored CommenceResponseRequest in local satp_db with request_id: {}",
                request_id
            ),
            Err(e) => {
                // Internal failure of sled. Send Error response
                println!(
                    "Error storing CommenceResponseRequest in local satp_db for request_id: {}",
                    request_id
                );
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id,
                    message: format!("Error storing CommenceResponseRequest in local satp_db {:?}", e),
                }));
                println!("Sending Ack back with an error to network of the asset transfer request: {:?}\n", reply);
                return reply;
            }
        }
        let reply = Ok(
            Response::new(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
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
        match send_commence_response_helper(transfer_commence_request, conf) {
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
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config
) -> Result<Ack, Error> {

    let request_id = &transfer_commence_request.session_id.to_string();
    let (requesting_relay_host, requesting_relay_port) = get_requesting_relay_host_and_port(transfer_commence_request.clone());
    let (use_tls, relay_tlsca_cert_path) = get_relay_params(requesting_relay_host.clone(), requesting_relay_port.clone(), conf.clone());
    let commence_response_request = create_commence_response_request(transfer_commence_request.clone());

    spawn_send_commence_response_request(
        commence_response_request,
        requesting_relay_host,
        requesting_relay_port,
        use_tls,
        relay_tlsca_cert_path,
        conf
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Commence Response request".to_string(),
    };
    return Ok(reply);
}

fn check_transfer_commence_request(transfer_commence_request: TransferCommenceRequest) -> bool {
    //TODO
    true
}