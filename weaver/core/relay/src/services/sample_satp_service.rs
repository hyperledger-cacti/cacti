// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::driver::driver::{
    AssignAssetRequest, CreateAssetRequest, ExtinguishRequest, PerformLockRequest,
};
use weaverpb::relay::satp::satp_server::Satp;
use weaverpb::relay::satp::{
    AckCommenceRequest, AckFinalReceiptRequest, CommitFinalAssertionRequest, CommitPrepareRequest,
    CommitReadyRequest, LockAssertionReceiptRequest, LockAssertionRequest, SendAssetStatusRequest,
    TransferCommenceRequest, TransferCompletedRequest, TransferProposalClaimsRequest,
    TransferProposalReceiptRequest,
};

// Internal modules
use crate::error::Error;
use crate::relay_proto::parse_address;
use crate::services::helpers::{println_stage_heading, println_step_heading};
use crate::services::logger::{LogEntry, Operation};
use crate::services::sample_satp_helper::{
    create_ack_error_message, create_assign_asset_request, create_create_asset_request,
    create_extinguish_request, create_perform_lock_request,
    get_request_id_from_transfer_proposal_receipt,
};

use super::helpers::get_driver;
// external modules
use super::sample_satp_helper::{
    create_ack_commence_request, create_ack_final_receipt_request,
    create_commit_final_assertion_request, create_commit_prepare_request,
    create_commit_ready_request, create_lock_assertion_request, create_transfer_commence_request,
    create_transfer_proposal_receipt_request, get_driver_address_from_assign_asset,
    get_driver_address_from_create_asset, get_driver_address_from_extinguish,
    get_driver_address_from_perform_lock, get_relay_from_ack_commence,
    get_relay_from_ack_final_receipt, get_relay_from_commit_final_assertion,
    get_relay_from_commit_prepare, get_relay_from_commit_ready, get_relay_from_lock_assertion,
    get_relay_from_transfer_commence, get_relay_from_transfer_proposal_receipt, get_relay_params,
    get_request_id_from_transfer_proposal_claims, spawn_send_ack_commence_request,
    spawn_send_ack_final_receipt_broadcast_request, spawn_send_ack_final_receipt_request,
    spawn_send_assign_asset_request, spawn_send_commit_final_assertion_request,
    spawn_send_commit_prepare_request, spawn_send_commit_ready_request,
    spawn_send_create_asset_request, spawn_send_extinguish_request,
    spawn_send_lock_assertion_broadcast_request, spawn_send_lock_assertion_request,
    spawn_send_perform_lock_request, spawn_send_transfer_commence_request,
    spawn_send_transfer_proposal_receipt_request,
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
    /// transfer_proposal_claims is run on the receiver gateway to allow the sender gateway to initiate an asset transfer.
    async fn transfer_proposal_claims(
        &self,
        request: Request<TransferProposalClaimsRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "1.1".to_string();

        println_stage_heading("1".to_string());
        println_step_heading(step_id.clone());
        println!(
            "Got a TransferProposalClaimsRequest from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_proposal_claims_request = request.into_inner().clone();
        let request_id =
            get_request_id_from_transfer_proposal_claims(transfer_proposal_claims_request.clone());
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_proposal_claims_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: transfer_proposal_claims_request
                .clone()
                .sender_gateway_network_id,
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_transfer_proposal_claims_request(
            transfer_proposal_claims_request.clone(),
            conf.clone(),
        ) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of transfer proposal claims request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_proposal_claims_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: transfer_proposal_claims_request
                        .clone()
                        .sender_gateway_network_id,
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Transfer proposal claims failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_proposal_claims_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: transfer_proposal_claims_request
                        .clone()
                        .sender_gateway_network_id,
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn transfer_proposal_receipt(
        &self,
        request: Request<TransferProposalReceiptRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "1.2".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got an ack transfer proposal receipt request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_proposal_receipt_request = request.into_inner().clone();
        let request_id = get_request_id_from_transfer_proposal_receipt(
            transfer_proposal_receipt_request.clone(),
        );
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_proposal_receipt_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: transfer_proposal_receipt_request
                .clone()
                .sender_gateway_network_id,
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_transfer_proposal_receipt_request(
            transfer_proposal_receipt_request.clone(),
            conf.clone(),
        ) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of transfer proposal receipt request back: {:?}\n",
                    reply
                );

                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_proposal_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: transfer_proposal_receipt_request
                        .clone()
                        .sender_gateway_network_id,
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Ack transfer proposal receipt failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_proposal_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: transfer_proposal_receipt_request
                        .clone()
                        .sender_gateway_network_id,
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    /// transfer_commence is run on the receiver gateway to allow the sender gateway to signal to the
    /// receiver gateway that it is ready to start the transfer of the digital asset
    async fn transfer_commence(
        &self,
        request: Request<TransferCommenceRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "1.3".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got a TransferCommenceRequest from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_commence_request = request.into_inner().clone();
        let request_id = transfer_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_commence_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_transfer_commence_request(transfer_commence_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of transfer commence request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_commence_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Transfer commence failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&transfer_commence_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn ack_commence(
        &self,
        request: Request<AckCommenceRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "1.4".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got an ack commence request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let ack_commence_request = request.into_inner().clone();
        let request_id = ack_commence_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&ack_commence_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_ack_commence_request(ack_commence_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of ack commence request back: {:?}\n", reply);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&ack_commence_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Ack commence failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&ack_commence_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn send_asset_status(
        &self,
        request: Request<SendAssetStatusRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Got a send asset status request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let send_asset_status_request = request.into_inner().clone();
        let request_id = send_asset_status_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        match process_send_asset_status_request(send_asset_status_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of send asset status request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&send_asset_status_request).unwrap(),
                    step_id: "todo_step_id".to_string(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Send asset status failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&send_asset_status_request).unwrap(),
                    step_id: "todo_step_id".to_string(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn lock_assertion(
        &self,
        request: Request<LockAssertionRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "2.2".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got a LockAssertionRequest from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let lock_assertion_request = request.into_inner().clone();
        let request_id = lock_assertion_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&lock_assertion_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_lock_assertion_request(lock_assertion_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of lock assertion request back: {:?}\n", reply);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&lock_assertion_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Lock assertion failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&lock_assertion_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn lock_assertion_receipt(
        &self,
        request: Request<LockAssertionReceiptRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "2.4".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got an lock assertion receipt request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let lock_assertion_receipt_request = request.into_inner().clone();
        let request_id = lock_assertion_receipt_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&lock_assertion_receipt_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_lock_assertion_receipt_request(
            lock_assertion_receipt_request.clone(),
            conf.clone(),
        ) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of lock assertion receipt request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&lock_assertion_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Lock assertion receipt failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&lock_assertion_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn commit_prepare(
        &self,
        request: Request<CommitPrepareRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "3.1".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got commit prepare request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let commit_prepare_request = request.into_inner().clone();
        let request_id = commit_prepare_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&commit_prepare_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_commit_prepare_request(commit_prepare_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of commit prepare request back: {:?}\n", reply);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_prepare_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Commit prepare failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_prepare_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn commit_ready(
        &self,
        request: Request<CommitReadyRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "3.3".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got commit ready request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let commit_ready_request = request.into_inner().clone();
        let request_id = commit_ready_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&commit_ready_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_commit_ready_request(commit_ready_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending Ack of commit ready request back: {:?}\n", reply);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_ready_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Commit ready failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_ready_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn commit_final_assertion(
        &self,
        request: Request<CommitFinalAssertionRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "3.5".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got commit final assertion request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let commit_final_assertion_request = request.into_inner().clone();
        let request_id = commit_final_assertion_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&commit_final_assertion_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_commit_final_assertion_request(
            commit_final_assertion_request.clone(),
            conf.clone(),
        ) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of commit final assertion request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_final_assertion_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Commit final assertion failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&commit_final_assertion_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn ack_final_receipt(
        &self,
        request: Request<AckFinalReceiptRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "3.7".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got commit final assertion request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let ack_final_receipt_request = request.into_inner().clone();
        let request_id = ack_final_receipt_request.session_id.to_string();
        let conf = self.config_lock.read().await;

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&ack_final_receipt_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match process_ack_final_receipt_request(ack_final_receipt_request.clone(), conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!(
                    "Sending Ack of ack final receipt request back: {:?}\n",
                    reply
                );
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&ack_final_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Done,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: None,
                };
                log::debug!("{}", log_entry);
                reply
            }
            Err(e) => {
                let error_message = "Ack final receipt failed.".to_string();
                let reply = create_ack_error_message(request_id.clone(), error_message.clone(), e);
                let log_entry = LogEntry {
                    request_id: request_id.clone(),
                    request: serde_json::to_string(&ack_final_receipt_request).unwrap(),
                    step_id: step_id.clone(),
                    operation: Operation::Failed,
                    network_id: "todo_network_id".to_string(),
                    gateway_id: "todo_gateway_id".to_string(),
                    received: true,
                    details: Some(error_message),
                };
                log::error!("{}", log_entry);
                reply
            }
        }
    }

    async fn transfer_completed(
        &self,
        request: Request<TransferCompletedRequest>,
    ) -> Result<Response<Ack>, Status> {
        let step_id = "3.9".to_string();
        println_step_heading(step_id.clone());
        println!(
            "Got commit final assertion request from {:?} - {:?}",
            request.remote_addr(),
            request
        );

        let transfer_completed_request = request.into_inner().clone();
        let request_id = transfer_completed_request.session_id.to_string();

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_completed_request.clone()).unwrap(),
            step_id: step_id.clone(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id.to_string(),
            message: "Ack of the Transfer Completed request".to_string(),
        };
        return Ok(Response::new(reply));
    }
}

pub fn process_transfer_proposal_claims_request(
    transfer_proposal_claims_request: TransferProposalClaimsRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id =
        get_request_id_from_transfer_proposal_claims(transfer_proposal_claims_request.clone());
    let is_valid_request =
        is_valid_transfer_proposal_claims_request(transfer_proposal_claims_request.clone());

    if is_valid_request {
        println!("The transfer proposal claims request is valid\n");
        let transfer_proposal_receipt_request =
            create_transfer_proposal_receipt_request(transfer_proposal_claims_request.clone());

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_proposal_claims_request.clone()).unwrap(),
            step_id: "1.1".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: transfer_proposal_claims_request
                .clone()
                .sender_gateway_network_id,
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_transfer_proposal_receipt_request(transfer_proposal_receipt_request, conf) {
            Ok(ack) => {
                println!("Ack transfer proposal claims request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: Ack transfer proposal claims failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The transfer proposal claims request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The transfer proposal claims request is invalid".to_string(),
        });
    }
}

pub fn process_transfer_proposal_receipt_request(
    transfer_proposal_receipt_request: TransferProposalReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id =
        get_request_id_from_transfer_proposal_receipt(transfer_proposal_receipt_request.clone());
    let is_valid_request =
        is_valid_transfer_proposal_receipt_request(transfer_proposal_receipt_request.clone());

    if is_valid_request {
        println!("The transfer proposal receipt request is valid\n");
        let transfer_commence_request =
            create_transfer_commence_request(transfer_proposal_receipt_request.clone());

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_commence_request.clone()).unwrap(),
            step_id: "1.2".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_transfer_commence_request(transfer_commence_request.clone(), conf) {
            Ok(ack) => {
                println!("Ack transfer proposal receipt request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: Ack transfer proposal receipt failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The transfer proposal receipt request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The transfer proposal receipt request is invalid".to_string(),
        });
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
        let ack_commence_request = create_ack_commence_request(transfer_commence_request.clone());

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&ack_commence_request.clone()).unwrap(),
            step_id: "1.3".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_ack_commence_request(ack_commence_request.clone(), conf) {
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
        let perform_lock_request: PerformLockRequest =
            create_perform_lock_request(ack_commence_request);

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&perform_lock_request.clone()).unwrap(),
            step_id: "1.4".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_perform_lock_request(perform_lock_request.clone(), conf) {
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

pub fn process_send_asset_status_request(
    send_asset_status_request: SendAssetStatusRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = send_asset_status_request.session_id.to_string();
    let is_valid_request = is_valid_send_asset_status_request(send_asset_status_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The send asset status request is valid\n");

        let result;
        let status = send_asset_status_request.status.as_str();
        match status {
            "Locked" => {
                println_step_heading("2.1B".to_string());
                println!("Received asset status as Locked. Sending the lock assertion request");
                let lock_assertion_request =
                    create_lock_assertion_request(send_asset_status_request);
                result = send_lock_assertion_request(lock_assertion_request, conf)
            }
            "Created" => {
                println_step_heading("3.2B".to_string());
                println!("Received asset status as Created. Sending the commit ready request");
                let commit_ready_request = create_commit_ready_request(send_asset_status_request);
                result = send_commit_ready_request(commit_ready_request, conf);
            }
            "Extinguished" => {
                println_step_heading("3.4B".to_string());
                println!("Received asset status as Extinguished. Sending the commit final assertion request");
                let commit_final_assertion_request =
                    create_commit_final_assertion_request(send_asset_status_request);
                result = send_commit_final_assertion_request(commit_final_assertion_request, conf)
            }
            "Finalized" => {
                println_step_heading("3.6B".to_string());
                println!(
                    "Received asset status as Finalized. Sending the ack final receipt request"
                );
                let ack_final_receipt_request =
                    create_ack_final_receipt_request(send_asset_status_request.clone());
                result = send_ack_final_receipt_request(ack_final_receipt_request, conf)
            }
            _ => result = Err(Error::Simple(format!("Invalid asset status: {}", status))),
        }

        match result {
            Ok(ack) => {
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: sending request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The send asset status request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The send asset status request is invalid".to_string(),
        });
    }
}

pub fn process_lock_assertion_request(
    lock_assertion_request: LockAssertionRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = lock_assertion_request.session_id.to_string();
    let is_valid_request = is_valid_lock_assertion_request(lock_assertion_request.clone());

    if is_valid_request {
        println!("The lock assertion request is valid\n");

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&lock_assertion_request.clone()).unwrap(),
            step_id: "2.2".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_lock_assertion_broadcast_request(lock_assertion_request, conf) {
            Ok(ack) => {
                println!("Ack lock assertion request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: Ack lock assertion failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The lock assertion request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The lock assertion request is invalid".to_string(),
        });
    }
}

pub fn process_lock_assertion_receipt_request(
    lock_assertion_receipt_request: LockAssertionReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = lock_assertion_receipt_request.session_id.to_string();
    let is_valid_request =
        is_valid_lock_assertion_receipt_request(lock_assertion_receipt_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The lock assertion receipt request is valid\n");
        let commit_prepare_request =
            create_commit_prepare_request(lock_assertion_receipt_request.clone());

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&commit_prepare_request.clone()).unwrap(),
            step_id: "2.4".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_commit_prepare_request(commit_prepare_request, conf) {
            Ok(ack) => {
                println!("Ack lock assertion receipt request.");
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
        println!("The lock assertion receipt request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The lock assertion receipt request is invalid".to_string(),
        });
    }
}

pub fn process_commit_prepare_request(
    commit_prepare_request: CommitPrepareRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = commit_prepare_request.session_id.to_string();
    let is_valid_request = is_valid_commit_prepare_request(commit_prepare_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The commit prepare request is valid\n");
        let create_asset_request: CreateAssetRequest =
            create_create_asset_request(commit_prepare_request);

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&create_asset_request.clone()).unwrap(),
            step_id: "3.1".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_create_asset_request(create_asset_request, conf) {
            Ok(ack) => {
                println!("Ack commit prepare request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: commit prepare request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The commit prepare request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The commit prepare request is invalid".to_string(),
        });
    }
}

pub fn process_commit_ready_request(
    commit_ready_request: CommitReadyRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = commit_ready_request.session_id.to_string();
    let is_valid_request = is_valid_commit_ready_request(commit_ready_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The commit ready request is valid\n");
        let extinguish_request: ExtinguishRequest = create_extinguish_request(commit_ready_request);

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&extinguish_request.clone()).unwrap(),
            step_id: "3.3".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_extinguish_request(extinguish_request, conf) {
            Ok(ack) => {
                println!("Ack commit ready request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: commit ready request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The commit ready request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The commit ready request is invalid".to_string(),
        });
    }
}

pub fn process_commit_final_assertion_request(
    commit_final_assertion_request: CommitFinalAssertionRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = commit_final_assertion_request.session_id.to_string();
    let is_valid_request =
        is_valid_commit_final_assertion_request(commit_final_assertion_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The commit final assertion request is valid\n");
        let assign_asset_request: AssignAssetRequest =
            create_assign_asset_request(commit_final_assertion_request);

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&assign_asset_request.clone()).unwrap(),
            step_id: "3.5".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_assign_asset_request(assign_asset_request, conf) {
            Ok(ack) => {
                println!("Ack commit final assertion request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: commit final assertion request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The commit final assertion request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The commit final assertion request is invalid".to_string(),
        });
    }
}

pub fn process_ack_final_receipt_request(
    ack_final_receipt_request: AckFinalReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = ack_final_receipt_request.session_id.to_string();
    let is_valid_request = is_valid_ack_final_receipt_request(ack_final_receipt_request.clone());

    // TODO some processing
    if is_valid_request {
        println!("The ack final receipt request is valid\n");

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&ack_final_receipt_request.clone()).unwrap(),
            step_id: "3.7".to_string(),
            operation: Operation::Exec,
            network_id: "todo_network_id".to_string(),
            gateway_id: "todo_gateway_id".to_string(),
            received: true,
            details: None,
        };
        log::debug!("{}", log_entry);

        match send_ack_final_receipt_broadcast_request(ack_final_receipt_request, conf) {
            Ok(ack) => {
                println!("Ack ack final receipt request.");
                let reply = Ok(ack);
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                return Ok(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: ack final receipt request failed. {:?}", e),
                });
            }
        }
    } else {
        println!("The ack final receipt request is invalid\n");
        return Ok(Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error: The ack final receipt request is invalid".to_string(),
        });
    }
}

fn send_transfer_proposal_receipt_request(
    transfer_proposal_receipt_request: TransferProposalReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id =
        get_request_id_from_transfer_proposal_receipt(transfer_proposal_receipt_request.clone());
    let (relay_host, relay_port) =
        get_relay_from_transfer_proposal_receipt(transfer_proposal_receipt_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_transfer_proposal_receipt_request(
        transfer_proposal_receipt_request.clone(),
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );

    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Transfer Proposal Claims request".to_string(),
    };
    return Ok(reply);
}

fn send_transfer_commence_request(
    transfer_commence_request: TransferCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = transfer_commence_request.session_id.clone();
    let (relay_host, relay_port) =
        get_relay_from_transfer_commence(transfer_commence_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_transfer_commence_request(
        transfer_commence_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Transfer Proposal Claims request".to_string(),
    };
    return Ok(reply);
}

fn send_ack_commence_request(
    ack_commence_request: AckCommenceRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = &ack_commence_request.session_id.to_string();
    let (relay_host, relay_port) = get_relay_from_ack_commence(ack_commence_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_ack_commence_request(
        ack_commence_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Commence Response request".to_string(),
    };
    return Ok(reply);
}

fn send_lock_assertion_request(
    lock_assertion_request: LockAssertionRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    let request_id = &lock_assertion_request.session_id.to_string();
    let (relay_host, relay_port) = get_relay_from_lock_assertion(lock_assertion_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_lock_assertion_request(
        lock_assertion_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Send Asset Status request".to_string(),
    };
    return Ok(reply);
}

fn send_lock_assertion_broadcast_request(
    lock_assertion_request: LockAssertionRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    println_step_heading("2.3".to_string());

    let request_id = &lock_assertion_request.session_id.to_string();
    let (relay_host, relay_port) = get_relay_from_lock_assertion(lock_assertion_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_lock_assertion_broadcast_request(
        lock_assertion_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Lock Assertion request".to_string(),
    };
    return Ok(reply);
}

fn send_perform_lock_request(
    perform_lock_request: PerformLockRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    println_stage_heading("2".to_string());
    println_step_heading("2.1A".to_string());

    let request_id = &perform_lock_request.session_id.to_string();
    let driver_address = get_driver_address_from_perform_lock(perform_lock_request.clone());
    let parsed_address = parse_address(driver_address)?;
    let result = get_driver(parsed_address.network_id.to_string(), conf.clone());
    match result {
        Ok(driver_info) => {
            spawn_send_perform_lock_request(driver_info, perform_lock_request);
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "Ack of the ack commence request".to_string(),
            };
            return Ok(reply);
        }
        Err(e) => {
            return Ok(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!(
                    "Error: Ack of the ack commence request failed. Driver not found {:?}",
                    e
                ),
            });
        }
    }
}

fn send_commit_prepare_request(
    commit_prepare_request: CommitPrepareRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    println_stage_heading("3".to_string());
    let request_id = &commit_prepare_request.session_id.to_string();
    let (relay_host, relay_port) = get_relay_from_commit_prepare(commit_prepare_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_commit_prepare_request(
        commit_prepare_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the Lock Assertion request".to_string(),
    };
    return Ok(reply);
}

fn send_commit_ready_request(
    commit_ready_request: CommitReadyRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    let request_id = &commit_ready_request.session_id.to_string();
    let (relay_host, relay_port) = get_relay_from_commit_ready(commit_ready_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_commit_ready_request(
        commit_ready_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );

    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the commit prepare request".to_string(),
    };
    return Ok(reply);
}

fn send_create_asset_request(
    create_asset_request: CreateAssetRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    println_step_heading("3.2A".to_string());

    let request_id = &create_asset_request.session_id.to_string();
    let driver_address = get_driver_address_from_create_asset(create_asset_request.clone());
    let parsed_address = parse_address(driver_address)?;
    let result = get_driver(parsed_address.network_id.to_string(), conf.clone());

    match result {
        Ok(driver_info) => {
            spawn_send_create_asset_request(driver_info, create_asset_request);
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "Ack of the commit prepare request".to_string(),
            };
            return Ok(reply);
        }
        Err(e) => {
            return Ok(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!(
                    "Error: Ack of the commit prepare request failed. Driver not found {:?}",
                    e
                ),
            });
        }
    }
}

fn send_extinguish_request(
    extinguish_request: ExtinguishRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    println_step_heading("3.4A".to_string());
    let request_id = &extinguish_request.session_id.to_string();
    let driver_address = get_driver_address_from_extinguish(extinguish_request.clone());
    let parsed_address = parse_address(driver_address)?;
    let result = get_driver(parsed_address.network_id.to_string(), conf.clone());

    match result {
        Ok(driver_info) => {
            spawn_send_extinguish_request(driver_info, extinguish_request);
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "Ack of the commit prepare request".to_string(),
            };
            return Ok(reply);
        }
        Err(e) => {
            return Ok(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!(
                    "Error: Ack of the commit prepare request failed. Driver not found {:?}",
                    e
                ),
            });
        }
    }
}

fn send_commit_final_assertion_request(
    commit_final_assertion_request: CommitFinalAssertionRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    let request_id = &commit_final_assertion_request.session_id.to_string();
    let (relay_host, relay_port) =
        get_relay_from_commit_final_assertion(commit_final_assertion_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_commit_final_assertion_request(
        commit_final_assertion_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );

    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Commit final assertion request sent".to_string(),
    };
    return Ok(reply);
}

fn send_ack_final_receipt_request(
    ack_final_receipt_request: AckFinalReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    let request_id = &ack_final_receipt_request.session_id.to_string();
    let (relay_host, relay_port) =
        get_relay_from_ack_final_receipt(ack_final_receipt_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_ack_final_receipt_request(
        ack_final_receipt_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );

    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack final receipt request sent".to_string(),
    };
    return Ok(reply);
}

fn send_assign_asset_request(
    assign_asset_request: AssignAssetRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    println_step_heading("3.6A".to_string());
    let request_id = &assign_asset_request.session_id.to_string();
    let driver_address = get_driver_address_from_assign_asset(assign_asset_request.clone());
    let parsed_address = parse_address(driver_address)?;
    let result = get_driver(parsed_address.network_id.to_string(), conf.clone());

    match result {
        Ok(driver_info) => {
            spawn_send_assign_asset_request(driver_info, assign_asset_request);
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "Ack of the commit final assertion request".to_string(),
            };
            return Ok(reply);
        }
        Err(e) => {
            return Ok(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!(
                    "Error: Ack of the commit final assertion request failed. Driver not found {:?}",
                    e
                ),
            });
        }
    }
}

fn send_ack_final_receipt_broadcast_request(
    ack_final_receipt_request: AckFinalReceiptRequest,
    conf: config::Config,
) -> Result<Ack, Error> {
    // TODO
    println_step_heading("3.8".to_string());
    let request_id = &ack_final_receipt_request.session_id.to_string();
    let (relay_host, relay_port) =
        get_relay_from_ack_final_receipt(ack_final_receipt_request.clone());
    let (use_tls, tlsca_cert_path) =
        get_relay_params(relay_host.clone(), relay_port.clone(), conf.clone());

    spawn_send_ack_final_receipt_broadcast_request(
        ack_final_receipt_request,
        relay_host,
        relay_port,
        use_tls,
        tlsca_cert_path,
    );

    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id: request_id.to_string(),
        message: "Ack of the commit prepare request".to_string(),
    };
    return Ok(reply);
}

fn is_valid_transfer_proposal_claims_request(
    _transfer_proposal_claims_request: TransferProposalClaimsRequest,
) -> bool {
    //TODO
    true
}

fn is_valid_transfer_proposal_receipt_request(
    _transfer_proposal_receipt_request: TransferProposalReceiptRequest,
) -> bool {
    //TODO
    true
}

fn is_valid_transfer_commence_request(_transfer_commence_request: TransferCommenceRequest) -> bool {
    //TODO
    true
}

fn is_valid_ack_commence_request(_ack_commence_request: AckCommenceRequest) -> bool {
    //TODO
    true
}

fn is_valid_lock_assertion_request(_lock_assertion_request: LockAssertionRequest) -> bool {
    //TODO
    true
}

fn is_valid_lock_assertion_receipt_request(
    _lock_assertion_receipt_request: LockAssertionReceiptRequest,
) -> bool {
    //TODO
    true
}

fn is_valid_commit_prepare_request(_commit_prepare_request: CommitPrepareRequest) -> bool {
    //TODO
    true
}

fn is_valid_commit_ready_request(_commit_ready_request: CommitReadyRequest) -> bool {
    //TODO
    true
}

fn is_valid_commit_final_assertion_request(
    _commit_final_assertion_request: CommitFinalAssertionRequest,
) -> bool {
    //TODO
    true
}

fn is_valid_ack_final_receipt_request(_ack_final_receipt_request: AckFinalReceiptRequest) -> bool {
    //TODO
    true
}

fn is_valid_send_asset_status_request(_send_asset_status_request: SendAssetStatusRequest) -> bool {
    //TODO
    true
}
