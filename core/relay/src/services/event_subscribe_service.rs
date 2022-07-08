// Internal generated modules
use crate::pb::common::ack::{ack, Ack};
use crate::pb::common::query::Query;
use crate::pb::common::events::EventSubscription;
use crate::pb::driver::driver::driver_communication_client::DriverCommunicationClient;
use crate::pb::relay::events::event_subscribe_client::EventSubscribeClient;
use crate::pb::relay::events::event_subscribe_server::EventSubscribe;
use crate::pb::common::events::{event_subscription_state, EventSubscriptionState};
// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::{parse_address, LocationSegment};
use crate::services::helpers::{update_event_subscription_status, get_driver, get_driver_client};
use crate::services::types::{Driver, Network};
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

/// EventSubscribeService is the gRPC server implementation that handles the logic for
/// communicating event subscription request between two relays and driver.
#[tonic::async_trait]
impl EventSubscribe for EventSubscribeService {
    async fn subscribe_event(&self, request: Request<EventSubscription>) -> Result<Response<Ack>, Status> {
        println!(
            "Got a Event Subscription request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let event_subscription = request.into_inner().clone();
        let query = event_subscription.query.clone().expect("No query passed with EventSubscription request");
        let request_id = query.request_id.to_string();
        
        let conf = self.config_lock.read().await;
        // Database access/storage
        let remote_db = Database {
            db_path: conf.get_str("remote_db_path").unwrap(),
        };
        match subscribe_event_helper(remote_db, request_id.to_string(), event_subscription, query, conf.clone()) {
            Ok(ack) => {
                let reply = Ok(Response::new(ack));
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
            Err(e) => {
                println!("EventSubscription from Driver failed.");
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id,
                    message: format!("Error: EventSubscription from Driver failed. {:?}", e),
                }));
                println!("Sending back Ack: {:?}\n", reply);
                reply
            }
        }
    }
    
    /// send_driver_subscription_status is run on the remote relay. Run when the driver sends the ack back to the remote relay
    async fn send_driver_subscription_status(
        &self,
        request: Request<Ack>,
    ) -> Result<Response<Ack>, Status> {
        let ack = request.into_inner().clone();
        let ack_clone = ack.clone();
        println!("Received Ack from driver: {:?}", ack_clone.request_id);

        let request_id = ack.request_id.to_string();
        let conf = self.config_lock.read().await;
        // Database access/storage
        let remote_db = Database {
            db_path: conf.get_str("remote_db_path").unwrap(),
        };
        
        let result =
            send_driver_subscription_status_helper(request_id.to_string(), remote_db, conf.clone(), ack);
        match result {
            Ok(resp) => {
                let reply = Ok(resp);
                println!("Sending back Ack to driver: {:?}\n", reply);
                return reply;
            }
            Err(e) => {
                // NOTE: No way to send another ack to Relay, if it reaches this error the next will also error.
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: {:?}", e),
                }));
                println!("Sending back Ack to driver: {:?}\n", reply);
                return reply;
            }
        }
    }
    async fn send_subscription_status(&self, request: Request<Ack>) -> Result<Response<Ack>, Status> {
        let request_ack = request.into_inner().clone();
        println!(
            "Received Ack from remote relay for Event Subscription Request ID = {:?}",
            request_ack.request_id
        );
        let request_id = &request_ack.request_id.to_string();
        let conf = self.config_lock.read().await.clone();
        // Database access/storage
        let db_path = conf.get_str("db_path").unwrap();
        
        let result = send_subscription_status_helper(request_ack, request_id.clone().to_string(), db_path);

        match result {
            Ok(_) => println!("Successfully set event subscription status in DB."),
            Err(e) => println!("Setting value in DB failed: {:?}", e),
        }
        let reply = Ok(Response::new(Ack {
            status: ack::Status::Ok as i32,
            request_id: request_id.to_string(),
            message: "".to_string(),
        }));
        println!("Sending back Ack to remote relay: {:?}", reply);
        reply
    }

}


/// subscribe_event is run on the remote relay to subscribe to the event that was
/// requested from the requesting relay
fn subscribe_event_helper(
    remote_db: Database,
    request_id: String,
    event_subscription: EventSubscription,
    query: Query,
    conf: config::Config,
) -> Result<Ack, Error> {
    let _set_query = remote_db
        .set(&request_id.to_string(), &query)
        .map_err(|e| Error::Simple(format!("DB Failure: {:?}", e)))?;
    let parsed_address = parse_address(query.address.to_string())?;
    let result = get_driver(parsed_address.network_id.to_string(), conf.clone());
    match result {
        Ok(driver_info) => {
            spawn_driver_subscribe_event(event_subscription, driver_info, conf.clone());
            return Ok(Ack {
                status: ack::Status::Ok as i32,
                request_id,
                message: "".to_string(),
            });
        },
        Err(e) => Err(e),
    }
}

// Function that starts a thread which sends the event subscription request to the driver
fn spawn_driver_subscribe_event(event_subscription: EventSubscription, driver_info: Driver, conf: config::Config) {
    tokio::spawn(async move {
        let result = spawn_driver_subscribe_event_helper(event_subscription.clone(), driver_info).await;
        match result {
            Ok(_) => {
                // Do nothing
                println!("Ack Ok from driver\n")
            }
            Err(e) => {
                println!("Error sending event subscription request to driver: {:?}\n", e);
                // In Error case we send an error_ack to requesting relay.
                let query = event_subscription.query.clone().expect("No query passed with EventSubscription request");
                let request_id = query.request_id.to_string();
                // Database access/storage
                let remote_db = Database {
                    db_path: conf.get_str("remote_db_path").unwrap(),
                };
                let error_ack = Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Driver Error: {:?}", e),
                };
                let result = send_driver_subscription_status_helper(
                    request_id.to_string(),
                    remote_db,
                    conf.clone(),
                    error_ack,
                );
                match result {
                    Ok(_) => {
                        println!(
                            "Driver's subscribe_event error successfully sent back to requesting relay"
                        );
                    }
                    Err(e) => println!("Error sending Ack: {:?}", e),
                }
            }
        }
    });
}

async fn spawn_driver_subscribe_event_helper(
    event_subscription: EventSubscription,
    driver_info: Driver,
) -> Result<(), Error> {
    let client = get_driver_client(driver_info).await?;
    println!("Sending EventSubscription Request to driver: {:?}", event_subscription.clone());
    let ack = client
        .clone()
        .subscribe_event(event_subscription)
        .await?
        .into_inner();
    println!("Response ACK from driver={:?}\n", ack);
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


/// send_driver_subscription_status is run on the remote relay. Runs when the driver sends the
/// ack back to the remote relay or if there was an error making the
/// suscribe_event gRPC call.
fn send_driver_subscription_status_helper(
    request_id: String,
    remote_db: Database,
    conf: config::Config,
    ack: Ack,
) -> Result<Response<Ack>, Error> {
    let query: Query = remote_db
        .get::<Query>(request_id.to_string())
        .map_err(|err| Error::GetQuery(format!("Failed to get query from db. Error: {:?}", err)))?;
    let relays_table = conf.get_table("relays")?;
    let relay_uri = relays_table
        .get(&query.requesting_relay.to_string())
        .ok_or(Error::Simple("Relay name not found".to_string()))?;
    let uri = relay_uri.clone().try_into::<LocationSegment>()?;
    spawn_send_subscription_status(
        ack,
        uri.hostname.to_string(),
        uri.port.to_string(),
        uri.tls,
        uri.tlsca_cert_path.to_string(),
    );
    let reply = Ack {
        status: ack::Status::Ok as i32,
        request_id,
        message: "".to_string(),
    };

    return Ok(Response::new(reply));
}


// spawn_send_subscription_status sends event subscription status from the remote relay back 
// to the requesting relay.
// When it errors it currently logs to console. Needs improving
fn spawn_send_subscription_status(ack: Ack, requestor_host: String, requester_port: String, use_tls: bool, tlsca_cert_path: String) {
    tokio::spawn(async move {
        println!("Sending Subscription Status back to requesting relay: Request ID = {:?}", ack.request_id);
        let client_addr = format!("http://{}:{}", requestor_host, requester_port);
        if use_tls {
            let pem = tokio::fs::read(tlsca_cert_path).await.unwrap();
            let ca = Certificate::from_pem(pem);

            let tls = ClientTlsConfig::new()
                .ca_certificate(ca)
                .domain_name(requestor_host);

            let channel = Channel::from_shared(client_addr).unwrap()
                .tls_config(tls)
                .connect()
                .await
                .unwrap();

            let mut client_result = EventSubscribeClient::new(channel);
            let response = client_result.send_subscription_status(ack).await;
            println!("Response ACK from requesting relay={:?}\n", response);
        } else {
            let client_result = EventSubscribeClient::connect(client_addr).await;
            match client_result {
                Ok(client) => {
                    let response = client.clone().send_subscription_status(ack).await;
                    println!("Response ACK from requesting relay={:?}\n", response);
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

fn send_subscription_status_helper(
    request_ack: Ack,
    request_id: String,
    db_path: String,
) -> Result<(), Error> {
    match ack::Status::from_i32(request_ack.status) {
        Some(status) => match status {
            ack::Status::Ok => update_event_subscription_status(
                request_id.to_string(),
                event_subscription_state::Status::Success,
                db_path.to_string(),
                "".to_string(),
            ),
            ack::Status::Error => update_event_subscription_status(
                request_id.to_string(),
                event_subscription_state::Status::Error,
                db_path.to_string(),
                request_ack.message.to_string(),
            ),
        },
        None => update_event_subscription_status(
            request_id.to_string(),
            event_subscription_state::Status::Error,
            db_path.to_string(),
            "Status is not supported or is invalid".to_string(),
        ),
    };
    return Ok(());
}