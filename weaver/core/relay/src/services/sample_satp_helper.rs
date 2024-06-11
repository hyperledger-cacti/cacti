use crate::error::Error;
use crate::relay_proto::{parse_location, LocationSegment};
use crate::services::helpers::get_driver_client;
use crate::services::logger::Operation;
use config::Config;
use tonic::transport::{Certificate, Channel, ClientTlsConfig};
use tonic::Response;
use weaverpb::common::ack::{ack, Ack};
use weaverpb::driver::driver::{
    AssignAssetRequest, CreateAssetRequest, ExtinguishRequest, PerformLockRequest,
};
use weaverpb::networks::networks::NetworkAssetTransfer;
use weaverpb::relay::satp::satp_client::SatpClient;
use weaverpb::relay::satp::{
    AckCommenceRequest, AckFinalReceiptRequest, CommitFinalAssertionRequest, CommitPrepareRequest,
    CommitReadyRequest, LockAssertionReceiptRequest, LockAssertionRequest, SendAssetStatusRequest,
    TransferCommenceRequest, TransferCompletedRequest, TransferProposalClaimsRequest,
    TransferProposalReceiptRequest,
};
use super::logger::LogEntry;
use super::types::Driver;
use uuid::Uuid;

// Sends a request to the receiving gateway
pub fn spawn_send_transfer_proposal_claims_request(
    transfer_proposal_claims_request: TransferProposalClaimsRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    println!(
        "Sending transfer proposal claims request to receiver gateway: {:?}:{:?}",
        relay_host, relay_port
    );
    // Spawning new thread to make the call_transfer_proposal_claims to receiver gateway
    tokio::spawn(async move {
        let request_id =
            get_request_id_from_transfer_proposal_claims(transfer_proposal_claims_request.clone());
        println!(
            "Sending transfer proposal claims request to receiver gateway: Request ID = {:?}",
            request_id
        );
        let result = call_transfer_proposal_claims(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            transfer_proposal_claims_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        log_request_result(&request_id, result);
    });
}

// Sends a request to the receiving gateway
pub fn spawn_send_transfer_commence_request(
    transfer_commence_request: TransferCommenceRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    println!(
        "Sending transfer commence request to receiver gateway: {:?}:{:?}",
        relay_host, relay_port
    );
    // Spawning new thread to make the call_transfer_commence to receiver gateway
    tokio::spawn(async move {
        let request_id = transfer_commence_request.session_id.to_string();
        println!(
            "Sending transfer commence request to receiver gateway: Request ID = {:?}",
            request_id
        );
        let result = call_transfer_commence(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            transfer_commence_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_transfer_proposal_receipt_request(
    transfer_proposal_receipt_request: TransferProposalReceiptRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = get_request_id_from_transfer_proposal_receipt(
            transfer_proposal_receipt_request.clone(),
        );
        println!(
            "Sending transfer proposal receipt back to sending gateway: Request ID = {:?}",
            request_id
        );

        let log_entry = LogEntry {
            request_id: request_id.clone(),
            request: serde_json::to_string(&transfer_proposal_receipt_request.clone()).unwrap(),
            step_id: "1.2".to_string(),
            operation: Operation::Init,
            network_id: "todo_network_id".to_string(),
            gateway_id: transfer_proposal_receipt_request
                .clone()
                .sender_gateway_network_id,
            received: false,
            details: None,
        };
        log::debug!("{}", log_entry);

        let result = call_transfer_proposal_receipt(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            transfer_proposal_receipt_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_ack_commence_request(
    ack_commence_request: AckCommenceRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = ack_commence_request.session_id.to_string();
        println!(
            "Sending commence response back to sending gateway: Request ID = {:?}",
            request_id
        );
        let result = call_ack_commence(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            ack_commence_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_perform_lock_request(
    driver_info: Driver,
    perform_lock_request: PerformLockRequest,
) {
    tokio::spawn(async move {
        let request_id = perform_lock_request.session_id.to_string();
        println!(
            "Locking the asset of the lock assertion request id: {:?}",
            request_id
        );
        // TODO: pass the required info to lock the relevant asset
        // Call the driver to lock the asset
        let result = call_perform_lock(driver_info, perform_lock_request).await;
        match result {
            Ok(_) => {
                println!("Perform lock request sent to driver\n")
            }
            Err(e) => {
                println!("Error sending perform lock request to driver: {:?}\n", e);
                // TODO: what to do in this case?
            }
        }
    });
}

pub fn spawn_send_lock_assertion_broadcast_request(
    lock_assertion_request: LockAssertionRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = lock_assertion_request.session_id.to_string();
        println!("Broadcasting the lock assertion request {:?}", request_id);
        // TODO
        // Broadcast the message to the network
        // Subscribe to the status event
        // Once the message is broadcast, call the call_lock_assertion_receipt endpoint
        // log the results

        let lock_assertion_receipt_request =
            create_lock_assertion_receipt_request(lock_assertion_request.clone());
        let result = call_lock_assertion_receipt(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            lock_assertion_receipt_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = lock_assertion_receipt_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_lock_assertion_request(
    lock_assertion_request: LockAssertionRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = lock_assertion_request.session_id.to_string();
        println!("Sending the lock assertion request {:?}", request_id);
        let result = call_lock_assertion(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            lock_assertion_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = lock_assertion_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

// Sends a request to the receiving gateway
pub fn spawn_send_commit_prepare_request(
    commit_prepare_request: CommitPrepareRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    println!(
        "Sending commit prepare request to receiver gateway: {:?}:{:?}",
        relay_host, relay_port
    );
    // Spawning new thread to make the call_commit_prepare to receiver gateway
    tokio::spawn(async move {
        let request_id = commit_prepare_request.session_id.to_string();
        let result = call_commit_prepare(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path.to_string(),
            commit_prepare_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_create_asset_request(
    driver_info: Driver,
    create_asset_request: CreateAssetRequest,
) {
    tokio::spawn(async move {
        let request_id = create_asset_request.session_id.to_string();
        println!(
            "Creating the asset corresponding to the create asset request {:?}",
            request_id
        );

        // TODO: pass the required info to lock the relevant asset
        // Call the driver to lock the asset
        let result = call_create_asset(driver_info, create_asset_request).await;
        match result {
            Ok(_) => {
                println!("Create asset request sent to driver\n")
            }
            Err(e) => {
                println!("Error sending create asset request to driver: {:?}\n", e);
                // TODO: what to do in this case?
            }
        }
    });
}

pub fn spawn_send_commit_ready_request(
    commit_ready_request: CommitReadyRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let result = call_commit_ready(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path,
            commit_ready_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = commit_ready_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_assign_asset_request(
    driver_info: Driver,
    assign_asset_request: AssignAssetRequest,
) {
    tokio::spawn(async move {
        let request_id = assign_asset_request.session_id.to_string();
        println!(
            "Assigning the asset corresponding to the assign asset request {:?}",
            request_id
        );

        // TODO: pass the required info to assign the relevant asset
        // Call the driver to assign the asset
        let result = call_assign_asset(driver_info, assign_asset_request).await;
        match result {
            Ok(_) => {
                println!("Assign asset request sent to driver\n")
            }
            Err(e) => {
                println!("Error sending assign asset request to driver: {:?}\n", e);
                // TODO: what to do in this case?
            }
        }
    });
}

pub fn spawn_send_ack_final_receipt_request(
    ack_final_receipt_request: AckFinalReceiptRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let result = call_ack_final_receipt(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path,
            ack_final_receipt_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = ack_final_receipt_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_ack_final_receipt_broadcast_request(
    ack_final_receipt_request: AckFinalReceiptRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = ack_final_receipt_request.session_id.to_string();
        println!(
            "Acknowledge final receipt broadcast of the ack final receipt request {:?}",
            request_id
        );
        // TODO
        // Ack final receipt broadcast
        // Once the broadcast is done, call the call_transfer_completed endpoint
        // log the results

        let transfer_completed_request =
            create_transfer_completed_request(ack_final_receipt_request);
        let result = call_transfer_completed(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path,
            transfer_completed_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = transfer_completed_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

pub fn spawn_send_extinguish_request(driver_info: Driver, extinguish_request: ExtinguishRequest) {
    tokio::spawn(async move {
        let request_id = extinguish_request.session_id.to_string();
        println!(
            "Extinguishing the asset corresponding to the extinguish request {:?}",
            request_id
        );

        // TODO: pass the required info to lock the relevant asset
        // Call the driver to lock the asset
        let result = call_extinguish(driver_info, extinguish_request).await;
        match result {
            Ok(_) => {
                println!("Extinguishing asset request sent to driver\n")
            }
            Err(e) => {
                println!(
                    "Error sending extinguishing asset request to driver: {:?}\n",
                    e
                );
                // TODO: what to do in this case?
            }
        }
    });
}

pub fn spawn_send_commit_final_assertion_request(
    commit_final_assertion_request: CommitFinalAssertionRequest,
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) {
    tokio::spawn(async move {
        let request_id = commit_final_assertion_request.session_id.to_string();
        println!(
            "Extinguishing the asset corresponding to the commit final assertion request {:?}",
            request_id
        );
        let result = call_commit_final_assertion_receipt(
            relay_host,
            relay_port,
            use_tls,
            tlsca_cert_path,
            commit_final_assertion_request.clone(),
        )
        .await;

        println!("Received Ack from sending gateway: {:?}\n", result);
        // Updates the request in the DB depending on the response status from the sending gateway
        let request_id = commit_final_assertion_request.session_id.to_string();
        log_request_result(&request_id, result);
    });
}

async fn call_perform_lock(
    driver_info: Driver,
    perform_lock_request: PerformLockRequest,
) -> Result<(), Error> {
    let client = get_driver_client(driver_info).await?;
    println!("Sending request to driver to lock the asset");
    let ack = client
        .clone()
        .perform_lock(perform_lock_request)
        .await?
        .into_inner();
    println!("Response ACK from driver to perform lock {:?}\n", ack);
    let status = ack::Status::from_i32(ack.status)
        .ok_or(Error::Simple("Status from Driver error".to_string()))?;
    match status {
        ack::Status::Ok => {
            // Do nothing
            return Ok(());
        }
        ack::Status::Error => Err(Error::Simple(format!("Error from driver: {}", ack.message))),
    }
}

async fn call_create_asset(
    driver_info: Driver,
    create_asset_request: CreateAssetRequest,
) -> Result<(), Error> {
    let client = get_driver_client(driver_info).await?;
    println!("Sending request to driver to create the asset");
    let ack = client
        .clone()
        .create_asset(create_asset_request)
        .await?
        .into_inner();
    println!("Response ACK from driver to create the asset {:?}\n", ack);
    let status = ack::Status::from_i32(ack.status)
        .ok_or(Error::Simple("Status from Driver error".to_string()))?;
    match status {
        ack::Status::Ok => {
            // Do nothing
            return Ok(());
        }
        ack::Status::Error => Err(Error::Simple(format!("Error from driver: {}", ack.message))),
    }
}

async fn call_extinguish(
    driver_info: Driver,
    extinguish_request: ExtinguishRequest,
) -> Result<(), Error> {
    let client = get_driver_client(driver_info).await?;
    println!("Sending request to driver to extinguish the asset");
    let ack = client
        .clone()
        .extinguish(extinguish_request)
        .await?
        .into_inner();
    println!(
        "Response ACK from driver to extinguish the asset {:?}\n",
        ack
    );
    let status = ack::Status::from_i32(ack.status)
        .ok_or(Error::Simple("Status from Driver error".to_string()))?;
    match status {
        ack::Status::Ok => {
            // Do nothing
            return Ok(());
        }
        ack::Status::Error => Err(Error::Simple(format!("Error from driver: {}", ack.message))),
    }
}

async fn call_assign_asset(
    driver_info: Driver,
    assign_asset_request: AssignAssetRequest,
) -> Result<(), Error> {
    let client = get_driver_client(driver_info).await?;
    println!("Sending request to driver to assign the asset");
    let ack = client
        .clone()
        .assign_asset(assign_asset_request)
        .await?
        .into_inner();
    println!("Response ACK from driver to assign the asset {:?}\n", ack);
    let status = ack::Status::from_i32(ack.status)
        .ok_or(Error::Simple("Status from Driver error".to_string()))?;
    match status {
        ack::Status::Ok => {
            // Do nothing
            return Ok(());
        }
        ack::Status::Error => Err(Error::Simple(format!("Error from driver: {}", ack.message))),
    }
}

// Call the transfer_commence endpoint on the receiver gateway
pub async fn call_transfer_commence(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    transfer_commence_request: TransferCommenceRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the transfer commence request: {:?}",
        transfer_commence_request.clone()
    );
    let response = satp_client
        .transfer_commence(transfer_commence_request.clone())
        .await?;
    Ok(response)
}

// Call the call_transfer_proposal_claims endpoint on the receiver gateway
pub async fn call_transfer_proposal_claims(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    transfer_proposal_claims_request: TransferProposalClaimsRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the transfer proposal claims request: {:?}",
        transfer_proposal_claims_request.clone()
    );
    let response = satp_client
        .transfer_proposal_claims(transfer_proposal_claims_request.clone())
        .await?;
    Ok(response)
}

// Call the call_transfer_proposal_receipt endpoint on the sending gateway
pub async fn call_transfer_proposal_receipt(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    transfer_proposal_receipt_request: TransferProposalReceiptRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the transfer proposal receipt request: {:?}",
        transfer_proposal_receipt_request.clone()
    );
    let response = satp_client
        .transfer_proposal_receipt(transfer_proposal_receipt_request.clone())
        .await?;
    Ok(response)
}

// Call the ack_commence endpoint on the sending gateway
pub async fn call_ack_commence(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    ack_commence_request: AckCommenceRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the commence response request: {:?}",
        ack_commence_request.clone()
    );
    let response = satp_client
        .ack_commence(ack_commence_request.clone())
        .await?;
    Ok(response)
}

// Call the lock_assertion endpoint on the sending gateway
pub async fn call_lock_assertion(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    lock_assertion_request: LockAssertionRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the lock assertion request: {:?}",
        lock_assertion_request.clone()
    );
    let response = satp_client
        .lock_assertion(lock_assertion_request.clone())
        .await?;
    Ok(response)
}

// Call the ack_commence endpoint on the sending gateway
pub async fn call_lock_assertion_receipt(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    lock_assertion_receipt_request: LockAssertionReceiptRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the lock assertion receipt request: {:?}",
        lock_assertion_receipt_request.clone()
    );
    let response = satp_client
        .lock_assertion_receipt(lock_assertion_receipt_request.clone())
        .await?;
    Ok(response)
}

// Call the call_commit_prepare endpoint on the sending gateway
pub async fn call_commit_prepare(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    commit_prepare_request: CommitPrepareRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the commit prepare request: {:?}",
        commit_prepare_request.clone()
    );
    let response = satp_client
        .commit_prepare(commit_prepare_request.clone())
        .await?;
    Ok(response)
}

// Call the call_commit_ready endpoint on the sending gateway
pub async fn call_commit_ready(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    commit_ready_request: CommitReadyRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the commit ready request: {:?}",
        commit_ready_request.clone()
    );
    let response = satp_client
        .commit_ready(commit_ready_request.clone())
        .await?;
    Ok(response)
}

// Call the call_ack_final_receipt endpoint on the sending gateway
pub async fn call_ack_final_receipt(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    ack_final_receipt_request: AckFinalReceiptRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the ack final receipt request: {:?}",
        ack_final_receipt_request.clone()
    );
    let response = satp_client
        .ack_final_receipt(ack_final_receipt_request.clone())
        .await?;
    Ok(response)
}

// Call the call_transfer_completed endpoint on the sending gateway
pub async fn call_transfer_completed(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    transfer_completed_request: TransferCompletedRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the transfer completed request: {:?}",
        transfer_completed_request.clone()
    );
    let response = satp_client
        .transfer_completed(transfer_completed_request.clone())
        .await?;
    Ok(response)
}

// Call the call_commit_final_assertion_receipt endpoint on the sending gateway
pub async fn call_commit_final_assertion_receipt(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
    commit_final_assertion_request: CommitFinalAssertionRequest,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let mut satp_client: SatpClient<Channel> =
        create_satp_client(relay_host, relay_port, use_tls, tlsca_cert_path).await?;
    println!(
        "Sending the commit final assertion request: {:?}",
        commit_final_assertion_request.clone()
    );
    let response = satp_client
        .commit_final_assertion(commit_final_assertion_request.clone())
        .await?;
    Ok(response)
}

pub fn log_request_result(
    request_id: &String,
    result: Result<Response<Ack>, Box<dyn std::error::Error>>,
) {
    match result {
        Ok(ack_response) => {
            let ack_response_into_inner = ack_response.into_inner().clone();
            // This match first checks if the status is valid.
            match ack::Status::from_i32(ack_response_into_inner.status) {
                Some(status) => match status {
                    ack::Status::Ok => {
                        let log_entry = LogEntry {
                            request_id: request_id.clone(),
                            request: "".to_string(),
                            step_id: "".to_string(),
                            operation: Operation::Done,
                            network_id: "".to_string(),
                            gateway_id: "".to_string(),
                            received: false,
                            details: None,
                        };
                        log::debug!("{}", log_entry);
                    }
                    ack::Status::Error => {
                        let log_entry = LogEntry {
                            request_id: request_id.clone(),
                            request: "".to_string(),
                            step_id: "".to_string(),
                            operation: Operation::Failed,
                            network_id: "".to_string(),
                            gateway_id: "".to_string(),
                            received: false,
                            details: Some(ack_response_into_inner.message),
                        };
                        log::debug!("{}", log_entry);
                    }
                },
                None => {
                    // TODO
                }
            }
        }
        Err(result_error) => {
            let log_entry = LogEntry {
                request_id: request_id.clone(),
                request: "".to_string(),
                step_id: "".to_string(),
                operation: Operation::Failed,
                network_id: "".to_string(),
                gateway_id: "".to_string(),
                received: false,
                details: Some(result_error.to_string()),
            };
            log::debug!("{}", log_entry);
        }
    }
}

pub fn create_ack_error_message(
    request_id: String,
    error_message: String,
    e: Error,
) -> Result<tonic::Response<Ack>, tonic::Status> {
    println!("{}: {}", error_message, request_id);
    let reply: Result<Response<Ack>, tonic::Status> = Ok(Response::new(Ack {
        status: ack::Status::Error as i32,
        request_id: request_id,
        message: format!("{} {:?}", error_message, e),
    }));
    println!("Sending Ack back with an error: {:?}\n", reply);
    return reply;
}

pub fn create_transfer_proposal_claims_request(
    network_asset_transfer: NetworkAssetTransfer,
) -> TransferProposalClaimsRequest {
    // TODO: remove hard coded values
    let transfer_proposal_claims_request = TransferProposalClaimsRequest {
        message_type: "message_type1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        asset_asset_id: network_asset_transfer.asset_id,
        asset_profile_id: network_asset_transfer.asset_type,
        verified_originator_entity_id: "verified_originator_entity_id".to_string(),
        verified_beneficiary_entity_id: "verified_beneficiary_entity_id".to_string(),
        originator_pubkey: "originator_pubkey".to_string(),
        beneficiary_pubkey: "beneficiary_pubkey".to_string(),
        sender_gateway_network_id: network_asset_transfer.source_relay,
        recipient_gateway_network_id: network_asset_transfer.destination_relay,
        sender_gateway_owner_id: "sender_gateway_owner_id".to_string(),
        receiver_gateway_owner_id: "receiver_gateway_owner_id".to_string(),
    };
    return transfer_proposal_claims_request;
}

pub fn create_transfer_commence_request(
    _transfer_proposal_receipt_request: TransferProposalReceiptRequest,
) -> TransferCommenceRequest {
    // TODO: remove hard coded values
    let session_id = Uuid::new_v4();
    let transfer_commence_request = TransferCommenceRequest {
        message_type: "message_type1".to_string(),
        session_id: session_id.to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        hash_transfer_init_claims: "hash_transfer_init_claims1".to_string(),
        hash_prev_message: "hash_prev_message1".to_string(),
        client_transfer_number: "client_transfer_number1".to_string(),
        client_signature: "client_signature1".to_string(),
    };
    return transfer_commence_request;
}

pub fn create_transfer_proposal_receipt_request(
    transfer_proposal_claims_request: TransferProposalClaimsRequest,
) -> TransferProposalReceiptRequest {
    // TODO: remove hard coded values
    let transfer_proposal_receipt_request = TransferProposalReceiptRequest {
        message_type: "message_type1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        asset_asset_id: transfer_proposal_claims_request.asset_asset_id,
        asset_profile_id: transfer_proposal_claims_request.asset_profile_id,
        verified_originator_entity_id: "verified_originator_entity_id".to_string(),
        verified_beneficiary_entity_id: "verified_beneficiary_entity_id".to_string(),
        originator_pubkey: "originator_pubkey".to_string(),
        beneficiary_pubkey: "beneficiary_pubkey".to_string(),
        sender_gateway_network_id: transfer_proposal_claims_request.sender_gateway_network_id,
        recipient_gateway_network_id: transfer_proposal_claims_request.recipient_gateway_network_id,
        sender_gateway_owner_id: "sender_gateway_owner_id".to_string(),
        receiver_gateway_owner_id: "receiver_gateway_owner_id".to_string(),
    };
    return transfer_proposal_receipt_request;
}

pub fn create_ack_commence_request(
    _transfer_commence_request: TransferCommenceRequest,
) -> AckCommenceRequest {
    // TODO: remove hard coded values
    let ack_commence_request = AckCommenceRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        hash_prev_message: "hash_prev_message1".to_string(),
        server_transfer_number: "server_transfer_number1".to_string(),
        server_signature: "server_signature1".to_string(),
    };
    return ack_commence_request;
}

pub fn create_lock_assertion_request(
    _send_asset_status_request: SendAssetStatusRequest,
) -> LockAssertionRequest {
    // TODO: remove hard coded values
    let lock_assertion_request = LockAssertionRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        hash_prev_message: "hash_prev_message1".to_string(),
        lock_assertion_claim: "lock_assertion_claim1".to_string(),
        lock_assertion_claim_format: "lock_assertion_claim_format1".to_string(),
        lock_assertion_expiration: "lock_assertion_expiration".to_string(),
        client_transfer_number: "client_transfer_number1".to_string(),
        client_signature: "client_signature1".to_string(),
    };
    return lock_assertion_request;
}

pub fn create_lock_assertion_receipt_request(
    _lock_assertion_request: LockAssertionRequest,
) -> LockAssertionReceiptRequest {
    // TODO: remove hard coded values
    let lock_assertion_receipt_request = LockAssertionReceiptRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
        client_identity_pubkey: "client_identity_pubkey1".to_string(),
        server_identity_pubkey: "server_identity_pubkey1".to_string(),
        hash_prev_message: "hash_prev_message1".to_string(),
        server_transfer_number: "server_transfer_number1".to_string(),
        server_signature: "server_signature1".to_string(),
    };
    return lock_assertion_receipt_request;
}

pub fn create_commit_prepare_request(
    _lock_assertion_receipt_request: LockAssertionReceiptRequest,
) -> CommitPrepareRequest {
    // TODO: remove hard coded values
    let commit_prepare_request = CommitPrepareRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
    };
    return commit_prepare_request;
}

pub fn create_commit_ready_request(
    _send_asset_status_request: SendAssetStatusRequest,
) -> CommitReadyRequest {
    // TODO: remove hard coded values
    let commit_ready_request = CommitReadyRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
    };
    return commit_ready_request;
}

pub fn create_commit_final_assertion_request(
    _send_asset_status_request: SendAssetStatusRequest,
) -> CommitFinalAssertionRequest {
    // TODO: remove hard coded values
    let commit_final_assertion_request = CommitFinalAssertionRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
    };
    return commit_final_assertion_request;
}

pub fn create_ack_final_receipt_request(
    _send_asset_status_request: SendAssetStatusRequest,
) -> AckFinalReceiptRequest {
    // TODO: remove hard coded values
    let ack_final_receipt_request = AckFinalReceiptRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
    };
    return ack_final_receipt_request;
}

pub fn create_transfer_completed_request(
    _ack_final_receipt_request: AckFinalReceiptRequest,
) -> TransferCompletedRequest {
    // TODO: remove hard coded values
    let transfer_completed_request = TransferCompletedRequest {
        message_type: "message_type1".to_string(),
        session_id: "session_id1".to_string(),
        transfer_context_id: "transfer_context_id1".to_string(),
    };
    return transfer_completed_request;
}

pub fn create_perform_lock_request(_ack_commence_request: AckCommenceRequest) -> PerformLockRequest {
    // TODO: remove hard coded values
    let perform_lock_request = PerformLockRequest {
        session_id: "session_id1".to_string(),
    };
    return perform_lock_request;
}

pub fn create_create_asset_request(
    _commit_prepare_request: CommitPrepareRequest,
) -> CreateAssetRequest {
    // TODO: remove hard coded values
    let create_asset_request = CreateAssetRequest {
        session_id: "session_id1".to_string(),
    };
    return create_asset_request;
}

pub fn create_extinguish_request(_commit_ready_request: CommitReadyRequest) -> ExtinguishRequest {
    // TODO: remove hard coded values
    let extinguish_request = ExtinguishRequest {
        session_id: "session_id1".to_string(),
    };
    return extinguish_request;
}

pub fn create_assign_asset_request(
    _commit_final_assertion_request: CommitFinalAssertionRequest,
) -> AssignAssetRequest {
    // TODO: remove hard coded values
    let assign_asset_request = AssignAssetRequest {
        session_id: "session_id1".to_string(),
    };
    return assign_asset_request;
}

pub fn get_relay_from_transfer_proposal_claims(
    transfer_proposal_claims_request: TransferProposalClaimsRequest,
) -> (String, String) {
    // TODO
    let recipient_gateway_id = transfer_proposal_claims_request.recipient_gateway_network_id.clone();
    let parsed_location = parse_location(recipient_gateway_id.clone());
    match parsed_location {
        Ok(location) => {
            return (location.hostname, location.port);
        }
        Err(e) => {
            println!("Error parsing recipient gateway address {}: {:?}\n", recipient_gateway_id, e);
            return ("".to_string(), "".to_string());
        }
    }
}

pub fn get_relay_from_transfer_proposal_receipt(
    transfer_proposal_receipt_request: TransferProposalReceiptRequest,
) -> (String, String) {
    // TODO
    let sender_gateway_id = transfer_proposal_receipt_request.sender_gateway_network_id.clone();
    let parsed_location = parse_location(sender_gateway_id.clone());
    match parsed_location {
        Ok(location) => {
            return (location.hostname, location.port);
        }
        Err(e) => {
            println!("Error parsing sender gateway address {}: {:?}\n", sender_gateway_id, e);
            return ("".to_string(), "".to_string());
        }
    }
}

pub fn get_relay_from_transfer_commence(
    _transfer_commence_request: TransferCommenceRequest,
) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9083".to_string());
}

pub fn get_relay_from_ack_commence(_ack_commence_request: AckCommenceRequest) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9080".to_string());
}

pub fn get_relay_from_lock_assertion(
    _lock_assertion_request: LockAssertionRequest,
) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9083".to_string());
}

pub fn get_relay_from_commit_prepare(
    _commit_prepare_request: CommitPrepareRequest,
) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9083".to_string());
}

pub fn get_relay_from_commit_ready(_commit_ready_request: CommitReadyRequest) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9080".to_string());
}

pub fn get_relay_from_commit_final_assertion(
    _commit_final_assertion_request: CommitFinalAssertionRequest,
) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9083".to_string());
}

pub fn get_relay_from_ack_final_receipt(
    _ack_final_receipt_request: AckFinalReceiptRequest,
) -> (String, String) {
    // TODO
    return ("localhost".to_string(), "9080".to_string());
}

pub fn get_driver_address_from_perform_lock(_perform_lock_request: PerformLockRequest) -> String {
    // TODO
    return "localhost:9080/network1/assettransfer".to_string();
}

pub fn get_driver_address_from_create_asset(_create_asset_request: CreateAssetRequest) -> String {
    // TODO
    return "localhost:9083/network2/assettransfer".to_string();
}

pub fn get_driver_address_from_extinguish(_extinguish_request: ExtinguishRequest) -> String {
    // TODO
    return "localhost:9080/network1/assettransfer".to_string();
}

pub fn get_driver_address_from_assign_asset(_assign_asset_request: AssignAssetRequest) -> String {
    // TODO
    return "localhost:9083/network2/assettransfer".to_string();
}

pub fn get_relay_params(relay_host: String, relay_port: String, conf: Config) -> (bool, String) {
    let relays_table = conf.get_table("relays").unwrap();
    let mut relay_tls = false;
    let mut tlsca_cert_path = "".to_string();
    for (_relay_name, relay_spec) in relays_table {
        let relay_uri = relay_spec.clone().try_into::<LocationSegment>().unwrap();
        if relay_host == relay_uri.hostname && relay_port == relay_uri.port {
            relay_tls = relay_uri.tls;
            tlsca_cert_path = relay_uri.tlsca_cert_path;
        }
    }
    (relay_tls, tlsca_cert_path)
}

fn create_client_address(relay_host: String, relay_port: String, use_tls: bool) -> String {
    if use_tls {
        return format!("https://{}:{}", relay_host, relay_port);
    } else {
        return format!("http://{}:{}", relay_host, relay_port);
    }
}

pub async fn create_satp_client(
    relay_host: String,
    relay_port: String,
    use_tls: bool,
    tlsca_cert_path: String,
) -> Result<SatpClient<Channel>, Box<dyn std::error::Error>> {
    let client_addr = create_client_address(relay_host.clone(), relay_port.clone(), use_tls.clone());
    let satp_client;
    if use_tls {
        let pem = tokio::fs::read(tlsca_cert_path).await?;
        let ca = Certificate::from_pem(pem);

        let tls = ClientTlsConfig::new()
            .ca_certificate(ca)
            .domain_name(relay_host);

        let channel = Channel::from_shared(client_addr)?
            .tls_config(tls)?
            .connect()
            .await?;

        satp_client = SatpClient::new(channel);
    } else {
        satp_client = SatpClient::connect(client_addr).await?;
    }
    return Ok(satp_client);
}

pub fn get_request_id_from_transfer_proposal_claims(
    _request: TransferProposalClaimsRequest,
) -> String {
    // TODO
    return "hard_coded_transfer_proposal_claims_request_id".to_string();
}

pub fn get_request_id_from_transfer_proposal_receipt(
    _request: TransferProposalReceiptRequest,
) -> String {
    // TODO
    return "hard_coded_transfer_proposal_receipt_request_id".to_string();
}
