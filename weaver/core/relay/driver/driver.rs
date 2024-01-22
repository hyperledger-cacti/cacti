// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

//Simple grpc with relay

// Internal modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::events::EventSubscription;
use weaverpb::common::query::Query;
use weaverpb::common::state::{meta, view_payload, Meta, View, ViewPayload};
use weaverpb::driver::driver::driver_communication_server::{
    DriverCommunication, DriverCommunicationServer,
};
use weaverpb::driver::driver::{
    AssignAssetRequest, CreateAssetRequest, ExtinguishRequest, PerformLockRequest,
    WriteExternalStateMessage,
};
use weaverpb::relay::datatransfer::data_transfer_client::DataTransferClient;
use weaverpb::relay::events::event_subscribe_client::EventSubscribeClient;

// External modules
use config;
use std::env;
use std::net::SocketAddr;
use std::net::ToSocketAddrs;
use std::thread::sleep;
use std::time;
use tokio::sync::RwLock;
use tonic::transport::{Certificate, Channel, ClientTlsConfig, Identity, Server, ServerTlsConfig};
use tonic::{Request, Response, Status};
use weaverpb::relay::satp::satp_client::SatpClient;
use weaverpb::relay::satp::SendAssetStatusRequest;

pub struct DriverCommunicationService {
    pub config_lock: RwLock<config::Config>,
}
#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, Debug)]
pub struct URI {
    port: String,
    hostname: String,
    tls: bool,
    tlsca_cert_path: String,
}

#[tonic::async_trait]
impl DriverCommunication for DriverCommunicationService {
    async fn request_driver_state(&self, request: Request<Query>) -> Result<Response<Ack>, Status> {
        println!("Got a request from {:?}", request.remote_addr());
        let query = request.into_inner().clone();
        let request_id = query.request_id.to_string();

        let relays_table = self
            .config_lock
            .read()
            .await
            .get_table("relays")
            .expect("No relays table in config file");
        let relay_uri = relays_table
            .get(&query.requesting_relay.to_string())
            .expect("Requesting relay not found in config file relays table");
        let uri = relay_uri
            .clone()
            .try_into::<URI>()
            .expect("Syntax for relays table in config file not correct");

        let relay_port = uri.port.to_string();
        let relay_hostname = uri.hostname.to_string();
        let use_tls = uri.tls;
        let tlsca_cert_path = uri.tlsca_cert_path.to_string();

        if use_tls {
            let client_addr = format!("https://{}:{}", relay_hostname, relay_port);
            let pem = tokio::fs::read(tlsca_cert_path).await.unwrap();
            let ca = Certificate::from_pem(pem);

            let tls = ClientTlsConfig::new()
                .ca_certificate(ca)
                .domain_name(relay_hostname);

            let channel = Channel::from_shared(client_addr.to_string())
                .unwrap()
                .tls_config(tls)
                .expect(&format!(
                    "Error in TLS configuration for client: {}",
                    client_addr.to_string()
                ))
                .connect()
                .await
                .unwrap();

            let client = DataTransferClient::new(channel);
            send_driver_mock_state_helper(client, request_id.to_string());
        } else {
            let client_addr = format!("http://{}:{}", relay_hostname, relay_port);
            let client_result = DataTransferClient::connect(client_addr).await;
            match client_result {
                Ok(client) => {
                    // Sends Mocked payload back.
                    send_driver_mock_state_helper(client, request_id.to_string());
                }
                Err(e) => {
                    // TODO: Add better error handling (Attempt a few times?)
                    panic!("Failed to connect to client. Error: {}", e.to_string());
                }
            }
        }

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id,
            message: "".to_string(),
        };

        return Ok(Response::new(reply));
    }
    async fn subscribe_event(
        &self,
        request: Request<EventSubscription>,
    ) -> Result<Response<Ack>, Status> {
        println!(
            "Driver: Got a event subscription request from {:?}",
            request.remote_addr()
        );
        let into_inner = request.into_inner().clone();
        let query = into_inner.query.clone().expect("");
        let request_id = query.clone().request_id.to_string();

        let relays_table = self
            .config_lock
            .read()
            .await
            .get_table("relays")
            .expect("No relays table in config file");
        let relay_uri = relays_table
            .get(&query.requesting_relay.to_string())
            .expect("Requesting relay not found in config file relays table");
        let uri = relay_uri
            .clone()
            .try_into::<URI>()
            .expect("Syntax for relays table in config file not correct");

        let relay_port = uri.port.to_string();
        let relay_hostname = uri.hostname.to_string();
        let use_tls = uri.tls;
        let tlsca_cert_path = uri.tlsca_cert_path.to_string();
        if use_tls {
            let client_addr = format!("https://{}:{}", relay_hostname, relay_port);
            println!("Remote relay... {:?}", client_addr.clone());
            let pem = tokio::fs::read(tlsca_cert_path).await.unwrap();
            let ca = Certificate::from_pem(pem);

            let tls = ClientTlsConfig::new()
                .ca_certificate(ca)
                .domain_name(relay_hostname);

            let channel = Channel::from_shared(client_addr.to_string())
                .unwrap()
                .tls_config(tls)
                .expect(&format!(
                    "Error in TLS configuration for client: {}",
                    client_addr.to_string()
                ))
                .connect()
                .await
                .unwrap();

            let client = EventSubscribeClient::new(channel);
            send_driver_mock_subscription_state_helper(client, request_id.to_string());
        } else {
            let client_addr = format!("http://{}:{}", relay_hostname, relay_port);
            println!("Remote relay... {:?}", client_addr.clone());
            let client_result = EventSubscribeClient::connect(client_addr).await;
            match client_result {
                Ok(client) => {
                    // Sends Mocked payload back.
                    send_driver_mock_subscription_state_helper(client, request_id.to_string());
                }
                Err(e) => {
                    // TODO: Add better error handling (Attempt a few times?)
                    panic!("Failed to connect to client. Error: {}", e.to_string());
                }
            }
        }

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: query.clone().request_id.to_string(),
            message: "".to_string(),
        };

        return Ok(Response::new(reply));
    }
    async fn request_signed_event_subscription_query(
        &self,
        request: Request<EventSubscription>,
    ) -> Result<Response<Query>, Status> {
        let received_query = request.into_inner().clone().query.expect("Err");
        let signed_query: Query = Query {
            policy: received_query.policy,
            address: received_query.address,
            requesting_relay: received_query.requesting_relay,
            requesting_org: received_query.requesting_org,
            requesting_network: received_query.requesting_network,
            certificate: "dummy-driver-certificate".to_string(),
            requestor_signature: "dummy-driver-signature".to_string(),
            nonce: received_query.nonce,
            request_id: received_query.request_id,
            confidential: received_query.confidential,
        };
        return Ok(Response::new(signed_query));
    }
    async fn write_external_state(
        &self,
        request: Request<WriteExternalStateMessage>,
    ) -> Result<Response<Ack>, Status> {
        let view_payload = request.into_inner().view_payload.expect("Error");
        let request_id = view_payload.clone().request_id.to_string();
        match view_payload.state {
            Some(state) => match state {
                view_payload::State::Error(error) => {
                    let reply = Ack {
                        status: ack::Status::Error as i32,
                        request_id: request_id.to_string(),
                        message: format!("Error received: {:?}", error).to_string(),
                    };
                    return Ok(Response::new(reply));
                }
                view_payload::State::View(_view) => {
                    let reply = Ack {
                        status: ack::Status::Ok as i32,
                        request_id: request_id.to_string(),
                        message: "Successfully written".to_string(),
                    };
                    return Ok(Response::new(reply));
                }
            },
            None => {}
        }
        let reply_error = Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error".to_string(),
        };
        return Ok(Response::new(reply_error));
    }

    async fn perform_lock(
        &self,
        request: Request<PerformLockRequest>,
    ) -> Result<Response<Ack>, Status> {
        println!("Got a request from {:?}", request.remote_addr());
        let perform_lock_request = request.into_inner().clone();
        println!("The asset has been locked");
        let request_id = perform_lock_request.session_id.to_string();

        let relays_table = self
            .config_lock
            .read()
            .await
            .get_table("relays")
            .expect("No relays table in config file");
        let requesting_relay = get_relay_from_perform_lock(perform_lock_request);
        let relay_uri = relays_table
            .get(&requesting_relay.to_string())
            .expect("Requesting relay not found in config file relays table");
        let uri = relay_uri
            .clone()
            .try_into::<URI>()
            .expect("Syntax for relays table in config file not correct");

        let relay_port = uri.port.to_string();
        let relay_hostname = uri.hostname.to_string();
        let use_tls = uri.tls;
        let tlsca_cert_path = uri.tlsca_cert_path.to_string();

        if use_tls {
            let client_addr = format!("https://{}:{}", relay_hostname, relay_port);
            let pem = tokio::fs::read(tlsca_cert_path).await.unwrap();
            let ca = Certificate::from_pem(pem);

            let tls = ClientTlsConfig::new()
                .ca_certificate(ca)
                .domain_name(relay_hostname);

            let channel = Channel::from_shared(client_addr.to_string())
                .unwrap()
                .tls_config(tls)
                .expect(&format!(
                    "Error in TLS configuration for client: {}",
                    client_addr.to_string()
                ))
                .connect()
                .await
                .unwrap();

            let client = SatpClient::new(channel);
            send_driver_mock_send_asset_status_helper(client, request_id.to_string());
        } else {
            let client_addr = format!("http://{}:{}", relay_hostname, relay_port);
            let client_result = SatpClient::connect(client_addr).await;
            match client_result {
                Ok(client) => {
                    // Sends Mocked payload back.
                    send_driver_mock_send_asset_status_helper(client, request_id.to_string());
                }
                Err(e) => {
                    // TODO: Add better error handling (Attempt a few times?)
                    panic!("Failed to connect to client. Error: {}", e.to_string());
                }
            }
        }

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id,
            message: "".to_string(),
        };
        return Ok(Response::new(reply));
    }

    async fn create_asset(
        &self,
        _request: Request<CreateAssetRequest>,
    ) -> Result<Response<Ack>, Status> {
        // TODO
        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: "".to_string(),
            message: "".to_string(),
        };
        return Ok(Response::new(reply));
    }

    async fn extinguish(
        &self,
        _request: Request<ExtinguishRequest>,
    ) -> Result<Response<Ack>, Status> {
        // TODO
        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: "".to_string(),
            message: "".to_string(),
        };
        return Ok(Response::new(reply));
    }

    async fn assign_asset(
        &self,
        _request: Request<AssignAssetRequest>,
    ) -> Result<Response<Ack>, Status> {
        // TODO
        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: "".to_string(),
            message: "".to_string(),
        };
        return Ok(Response::new(reply));
    }
}

pub fn get_relay_from_perform_lock(perform_lock_request: PerformLockRequest) -> String {
    // TODO
    return "Dummy_Relay".to_string();
}

fn send_driver_mock_state_helper(client: DataTransferClient<Channel>, request_id: String) {
    tokio::spawn(async move {
        let my_time = time::Duration::from_millis(3000);
        sleep(my_time);
        let state = ViewPayload {
            state: Some(view_payload::State::View(View {
                meta: Some(Meta {
                    timestamp: "I am time".to_string(),
                    proof_type: "I am proof".to_string(),
                    serialization_format: "Proto".to_string(),
                    protocol: meta::Protocol::Fabric as i32,
                }),
                data: "This is a mocked payload".as_bytes().to_vec(),
            })),
            request_id: request_id.to_string(),
        };
        println!("Sending state to remote relay...");
        let response = client.clone().send_driver_state(state).await;
        println!("Ack from remote relay={:?}", response);
    });
}
fn send_driver_mock_subscription_state_helper(
    client: EventSubscribeClient<Channel>,
    request_id: String,
) {
    tokio::spawn(async move {
        let my_time = time::Duration::from_millis(3000);
        sleep(my_time);
        let ack = Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id,
            message: "".to_string(),
        };
        println!("Sending ack to remote relay... {:?}", ack.clone());
        let response = client.clone().send_driver_subscription_status(ack).await;
        println!("Ack from remote relay={:?}", response);
    });
}

fn send_driver_mock_send_asset_status_helper(client: SatpClient<Channel>, request_id: String) {
    tokio::spawn(async move {
        let my_time = time::Duration::from_millis(3000);
        sleep(my_time);

        let send_asset_status_request = SendAssetStatusRequest {
            message_type: "message_type1".to_string(),
            session_id: "session_id1".to_string(),
            transfer_context_id: "transfer_context_id1".to_string(),
            client_identity_pubkey: "client_identity_pubkey1".to_string(),
            server_identity_pubkey: "server_identity_pubkey1".to_string(),
            hash_prev_message: "hash_prev_message1".to_string(),
            server_transfer_number: "server_transfer_number1".to_string(),
            server_signature: "server_signature1".to_string(),
            status: "status1".to_string(),
        };
        println!("Sending send asset status request to remote gateway ...");
        let response = client
            .clone()
            .send_asset_status(send_asset_status_request)
            .await;
        println!("Ack from remote relay={:?}", response);
    });
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // NOTE: This will need cleaning up
    let mut settings = config::Config::default();
    // Either get config path from environment variable or uses default.
    let config_file_name = env::var("RELAY_CONFIG").unwrap_or_else(|_| {
        println!("Using default config `config/Settings`");
        "config/Settings".to_string()
    });

    settings
        .merge(config::File::with_name(&config_file_name))
        .unwrap()
        // Add in settings from the environment (with a prefix of Relay) Can be used to override config file settings
        .merge(config::Environment::with_prefix("RELAY"))
        .unwrap();

    // Uses relay port specified in the config file.
    match settings.get_table("drivers") {
        Ok(drivers_table) => match drivers_table.get("Dummy") {
            Some(driver_table) => {
                let driver_info = driver_table
                    .clone()
                    .try_into::<URI>()
                    .expect("Error in config file drivers table")
                    .clone();

                // Converts port to a valid socket address
                let addr: SocketAddr = format!(
                    "{}:{}",
                    driver_info.hostname.to_string(),
                    driver_info.port.to_string()
                )
                .to_socket_addrs()?
                .next()
                .expect("Port number is potentially invalid. Unable to create SocketAddr");

                let driver = DriverCommunicationService {
                    config_lock: RwLock::new(settings.clone()),
                };
                let with_tls = settings.get_bool("tls").unwrap_or(false);
                if with_tls == true {
                    println!("DriverServer with TLS enabled, listening on {}", addr);
                    let cert = tokio::fs::read(settings.get_str("cert_path").unwrap()).await?;
                    let key = tokio::fs::read(settings.get_str("key_path").unwrap()).await?;
                    let identity = Identity::from_pem(cert, key);
                    // Spins up two gRPC services in a tonic server. One for relay to relay and one for network to relay communication.
                    let server = Server::builder()
                        .tls_config(ServerTlsConfig::new().identity(identity))?
                        .add_service(DriverCommunicationServer::new(driver));
                    server.serve(addr).await?;
                } else {
                    println!("DriverServer listening on {}", addr);
                    // Spins up two gRPC services in a tonic server. One for relay to relay and one for network to relay communication.
                    let server =
                        Server::builder().add_service(DriverCommunicationServer::new(driver));
                    server.serve(addr).await?;
                }
            }
            None => panic!("No Driver port specified for 'Dummy'"),
        },
        Err(_) => panic!("No Driver Table specified"),
    }

    Ok(())
}
