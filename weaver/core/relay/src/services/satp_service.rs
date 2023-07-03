// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::relay::satp::satp_server::Satp;
use weaverpb::relay::satp::{
    AckCommenceRequest, LockAssertionReceiptRequest, LockAssertionRequest, TransferCommenceRequest,
};

// Internal modules
use crate::error::Error;
use crate::services::satp_helper::{
    create_ack_error_message, log_request_in_local_sapt_db, log_request_in_remote_sapt_db,
};

// external modules
use super::satp_helper::{
    create_ack_commence_request, create_lock_assertion_request, get_relay_from_ack_commence,
    get_relay_from_transfer_commence, get_relay_params, spawn_send_ack_commence_request,
    spawn_send_perform_lock_request,
};
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

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
        request: Request<TransferCommenceRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a TransferCommenceRequest from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_commence_request = request.into_inner().clone();
        let request_id = transfer_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        match log_request_in_remote_sapt_db(&request_id, &transfer_commence_request, conf.clone()) {
            Ok(_) => {
                println!("Successfully stored TransferCommenceRequest in remote satp_db with request_id: {}", request_id);
            }
            Err(e) => {
                // Internal failure of sled. Send Error response
                let error_message =
                    "Error storing TransferCommenceRequest in remote satp_db for request_id"
                        .to_string();
                let reply = create_ack_error_message(request_id, error_message, e);
                return reply;
            }
        }

        match process_transfer_commence_request(transfer_commence_request, conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of transfer commence request back: {:?}\n",
                    reply
                );
                reply
            }
            Err(e) => {
                let error_message = "Transfer commence failed.".to_string();
                let reply = create_ack_error_message(request_id, error_message, e);
                reply
            }
        }
    }

    async fn ack_commence(
        &self,
        request: Request<AckCommenceRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got an ack commence request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let ack_commence_request = request.into_inner().clone();
        let request_id = ack_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        // TODO refactor
        let request_logged: Result<Option<sled::IVec>, Error> =
            log_request_in_local_sapt_db(&request_id, &ack_commence_request, conf.clone());
        match request_logged {
            Ok(_) => {
                println!(
                    "Successfully stored AckCommenceRequest in local satp_db with request_id: {}",
                    request_id
                )
            }
            Err(e) => {
                // Internal failure of sled. Send Error response
                let error_message =
                    "Error storing AckCommenceRequest in local satp_db for request_id".to_string();
                let reply = create_ack_error_message(request_id, error_message, e);
                return reply;
            }
        }

        match process_ack_commence_request(ack_commence_request, conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of ack commence request back: {:?}\n", reply);
                reply
            }
            Err(e) => {
                let error_message = "Ack commence failed.".to_string();
                let reply = create_ack_error_message(request_id, error_message, e);
                reply
            }
        }
    }

    async fn lock_assertion(
        &self,
        request: Request<LockAssertionRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a lock assertion request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let reply = Ok(Response::new(Ack {
            status: ack::Status::Error as i32,
            request_id: "xxxxxxxxx".to_string(),
            message: format!("Error: Not implemented yet."),
        }));
        println!("Sending back Ack: {:?}\n", reply);
        reply
    }

    async fn lock_assertion_receipt(
        &self,
        request: Request<LockAssertionReceiptRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a lock assertion receipt request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let reply = Ok(Response::new(Ack {
            status: ack::Status::Error as i32,
            request_id: "xxxxxxxxx".to_string(),
            message: format!("Error: Not implemented yet."),
        }));
        println!("Sending back Ack: {:?}\n", reply);
        reply
    }
}

/// process_transfer_commence_request is run on the receiver gateway to initiate asset transfer protocol that was
/// requested from the sender gateway
pub fn process_transfer_commence_request(
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = transfer_commence_request.session_id.to_string();
    let is_valid_request = is_valid_transfer_commence_request(transfer_commence_request.clone());

    if is_valid_request {
        println!("The transfer commence request is valid\n");
        match send_ack_commence_request(transfer_commence_request, conf) {
            Ok(ack) => {
                println!("Ack transfer commence request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: Ack commence request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The transfer commence request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The transfer commence request is invalid".to_string(),
        });
    }
}

/// process_ack_commence_request is invoked by the receiver gateway to ack the transfer commence request
/// requested ed by the sender gateway
pub fn process_ack_commence_request(
    ack_commence_request: AckCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = ack_commence_request.session_id.to_string();
    let is_valid_request = is_valid_ack_commence_request(ack_commence_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The ack commence request is valid\n");
        match send_perform_lock_request(ack_commence_request, conf) {
            Ok(ack) => {
                println!("Ack ack commence request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: perform lock request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The ack commence request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The ack commence request is invalid".to_string(),
        });
    }
}

fn send_ack_commence_request(
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = &transfer_commence_request.session_id.to_string();
    let (requesting_relay_host, requesting_relay_port) =
        get_relay_from_transfer_commence(transfer_commence_request.clone());
    let (use_tls, relay_tlsca_cert_path) = get_relay_params(
        requesting_relay_host.clone(),
        requesting_relay_port.clone(),
        conf.clone(),
    );
    let ack_commence_request = create_ack_commence_request(transfer_commence_request.clone());

    spawn_send_ack_commence_request(
        ack_commence_request,
        requesting_relay_host,
        requesting_relay_port,
        use_tls,
        relay_tlsca_cert_path,
        conf,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Commence Response request".to_string(),
    };
    return Ok(reply);
}

fn send_perform_lock_request(
    ack_commence_request: AckCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = &ack_commence_request.session_id.to_string();
    let (requesting_relay_host, requesting_relay_port) =
        get_relay_from_ack_commence(ack_commence_request.clone());
    let (use_tls, relay_tlsca_cert_path) = get_relay_params(
        requesting_relay_host.clone(),
        requesting_relay_port.clone(),
        conf.clone(),
    );
    let perfrom_lock_request = create_lock_assertion_request(ack_commence_request.clone());

    spawn_send_perform_lock_request(
        perfrom_lock_request,
        requesting_relay_host,
        requesting_relay_port,
        use_tls,
        relay_tlsca_cert_path,
        conf,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the ack commence request".to_string(),
    };
    return Ok(reply);
}

fn is_valid_transfer_commence_request(transfer_commence_request: TransferCommenceRequest) -> bool {
    //TODO
    true
}

fn is_valid_ack_commence_request(ack_commence_request: AckCommenceRequest) -> bool {
    //TODO
    true
}
