//Simple grpc with relay

// Internal modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::query::Query;
use weaverpb::common::events::EventSubscription;
use weaverpb::common::state::{view_payload, Meta, meta, ViewPayload, View};
use weaverpb::driver::driver::driver_communication_server::{DriverCommunication, DriverCommunicationServer};
use weaverpb::driver::driver::WriteExternalStateMessage;

// External modules
use config;
use std::env;
use std::net::SocketAddr;
use std::net::ToSocketAddrs;
use std::thread::sleep;
use std::time;
use tokio::sync::RwLock;
use tonic::transport::Server;
use tonic::{Request, Response, Status};

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
        let into_inner = request.into_inner().clone();
        let request_id = into_inner.request_id.to_string();

        let relay_port = self
            .config_lock
            .read()
            .await
            .get_str("port")
            .expect("Port table does not exist");
        let relay_hostname = self
            .config_lock
            .read()
            .await
            .get_str("hostname")
            .expect("Hostname table does not exist");
        let client_addr = format!("http://{}:{}", relay_hostname, relay_port);
        let client_result =
            weaverpb::relay::datatransfer::data_transfer_client::DataTransferClient::connect(client_addr)
                .await;
        match client_result {
            Ok(client) => {
                // Sends Mocked payload back.
                tokio::spawn(async move {
                    let my_time = time::Duration::from_millis(3000);
                    sleep(my_time);
                    let state = ViewPayload {
                        state: Some(view_payload::State::View(View {
                            meta: Some(Meta {
                                timestamp: "I am time".to_string(),
                                proof_type: "I am proof".to_string(),
                                serialization_format: "Proto".to_string(),
                                protocol: meta::Protocol::Fabric as i32
                            }),
                            data: "This is a mocked payload".as_bytes().to_vec(),
                        })),
                        request_id: into_inner.request_id.to_string(),
                    };
                    println!("Sending state to remote relay...");
                    let response = client.clone().send_driver_state(state).await;
                    println!("Ack from remote relay={:?}", response);
                });
            }
            Err(e) => {
                // TODO: Add better error handling (Attempt a few times?)
                panic!("Failed to connect to client. Error: {}", e.to_string());
            }
        }

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id,
            message: "".to_string(),
        };

        return Ok(Response::new(reply));
    }
    async fn subscribe_event(&self, request: Request<EventSubscription>) -> Result<Response<Ack>, Status> {
        println!("Driver: Got a event subscription request from {:?}", request.remote_addr());
        let into_inner = request.into_inner().clone();
        let query = into_inner.query.clone().expect("");
        let request_id = query.clone().request_id.to_string();

        let relay_port = self
            .config_lock
            .read()
            .await
            .get_str("port")
            .expect("Port table does not exist");
        let relay_hostname = self
            .config_lock
            .read()
            .await
            .get_str("hostname")
            .expect("Hostname table does not exist");
        let client_addr = format!("http://{}:{}", relay_hostname, relay_port);
        println!("Remote relay... {:?}", client_addr.clone());
        let client_result =
            weaverpb::relay::events::event_subscribe_client::EventSubscribeClient::connect(client_addr)
                .await;
        match client_result {
            Ok(client) => {
                // Sends Mocked payload back.
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
            Err(e) => {
                // TODO: Add better error handling (Attempt a few times?)
                panic!("Failed to connect to client. Error: {}", e.to_string());
            }
        }

        let reply = Ack {
            status: ack::Status::Ok as i32,
            request_id: query.clone().request_id.to_string(),
            message: "".to_string(),
        };

        return Ok(Response::new(reply));
    }
    async fn request_signed_event_subscription_query(&self, request: Request<EventSubscription>) -> Result<Response<Query>, Status> {
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
    async fn write_external_state(&self, request: Request<WriteExternalStateMessage>) -> Result<Response<Ack>, Status> {
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
            }
            None => {}
        }
        let reply_error = Ack {
            status: ack::Status::Error as i32,
            request_id: request_id.to_string(),
            message: "Error".to_string(),
        };
        return Ok(Response::new(reply_error));
    }
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

                println!("DriverServer listening on {}", addr);
                let driver = DriverCommunicationService {
                    config_lock: RwLock::new(settings.clone()),
                };
                // Spins up two gRPC services in a tonic server. One for relay to relay and one for network to relay communication.
                let server = Server::builder().add_service(DriverCommunicationServer::new(driver));
                server.serve(addr).await?;
            }
            None => panic!("No Driver port specified for 'Dummy'"),
        },
        Err(_) => panic!("No Driver Table specified"),
    }

    Ok(())
}
