// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::query::Query;
use weaverpb::common::state::{request_state, RequestState};
use weaverpb::common::events::{EventSubscription, event_subscription_state, EventSubscriptionState, EventSubOperation, event_publication, EventPublication, EventStates};
use weaverpb::networks::networks::network_server::Network;
use weaverpb::networks::networks::{DbName, GetStateMessage, NetworkQuery, RelayDatabase, NetworkEventSubscription, NetworkEventUnsubscription};
use weaverpb::relay::datatransfer::data_transfer_client::DataTransferClient;
use weaverpb::relay::events::event_subscribe_client::EventSubscribeClient;
use crate::relay_proto::{parse_address, LocationSegment};
// Internal modules
use crate::db::Database;
use crate::services::helpers::{update_event_subscription_status, driver_sign_subscription_helper, try_mark_request_state_deleted, mark_event_states_deleted, delete_event_pub_spec, get_event_publication_key, get_event_subscription_key};

// External modules
use config;
use sled::open;
use tokio::sync::RwLock;
use tonic::{Code, Request, Response, Status};
use uuid::Uuid;

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

pub struct NetworkService {
    pub config_lock: RwLock<config::Config>,
}

/// NetworkService handles logic related to communication between a requesting relay and a network
#[tonic::async_trait]
impl Network for NetworkService {
    // Used by client/network to get a RequestState object from the local relay DB.
    async fn get_state(
        &self,
        request: Request<GetStateMessage>,
    ) -> Result<Response<RequestState>, Status> {
        println!("\nReceived GetState request from network: {:?}", request);
        let conf = self.config_lock.read().await.clone();
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };
        let request_id = request.into_inner().request_id;
        let result = db.get::<RequestState>(request_id.to_string());
        match result {
            Ok(request_state) => {
                println!("Sending back RequestState to network: Request ID = {:?}, Status = {:?}",
                         request_state.request_id,
                         request_state.status
                         );
                match request_state.state.as_ref() {
                    Some(state) => {
                        // Because already state is passed to client, deleting the state if status is completed or error
                        try_mark_request_state_deleted(request_state.clone(), request_id.to_string(), db);
                        match state {
                            request_state::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
                            request_state::State::Error(e) => println!("Error: {:?}", e),
                        }
                    },
                    None => {},
                }
                return Ok(Response::new(request_state));
            },
            Err(e) => Err(Status::new(
                Code::NotFound,
                format!("Request not found. Error: {:?}", e),
            )),
        }
    }

    // NOTE: This is just for debugging
    async fn request_database(
        &self,
        dbname_request: Request<DbName>,
    ) -> Result<Response<RelayDatabase>, Status> {
        let dbname = dbname_request.into_inner();
        let req_db = open(dbname.name).unwrap();
        let mut requests = std::collections::HashMap::new();
        let mut curr_key = req_db.get_gt("").unwrap();

        while let Some(key) = curr_key {
            // println!("{:?}", key);
            let decoded_key = std::str::from_utf8(&key.0[..]).unwrap();
            
            if decoded_key.to_string().contains(&"event_sub".to_string()) {
                let decoded_result: Result<EventSubscriptionState, bincode::Error> =
                    bincode::deserialize(&key.1[..]);
                requests.insert(
                    format!("{:?}", decoded_key),
                    format!("{:?}", decoded_result),
                );
                println!("Event Sub {:?} => {:?}", decoded_key, decoded_result);
            } else if decoded_key.to_string().contains(&"event_pub".to_string()) {
                let decoded_result: Result<EventStates, bincode::Error> =
                    bincode::deserialize(&key.1[..]);
                requests.insert(
                    format!("{:?}", decoded_key),
                    format!("{:?}", decoded_result),
                );
                println!("Event Pub {:?} => {:?}", decoded_key, decoded_result);
            } else {
                let decoded_result: Result<RequestState, bincode::Error> =
                    bincode::deserialize(&key.1[..]);
                requests.insert(
                    format!("{:?}", decoded_key),
                    format!("{:?}", decoded_result),
                );
                println!("RequestState {:?} => {:?}", decoded_key, decoded_result);
            }
            curr_key = req_db.get_gt(key.0).unwrap();
        }
        return Ok(Response::new(RelayDatabase { pairs: requests }));
    }

    /// request_state is run on the client to query the requesting relay for the state
    /// Since this request is async w.r.t the network, the request info/state machine is
    /// stored in a db on the requesting relay (status polled using get_state)
    async fn request_state(&self, request: Request<NetworkQuery>) -> Result<Response<Ack>, Status> {
        println!(
            "Got a NetworkQuery request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let conf = self.config_lock.read().await.clone();
        // Database access/storage
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };

        let request_id = Uuid::new_v4();
        // Initial request state stored in DB.
        let target: RequestState = RequestState {
            status: request_state::Status::PendingAck as i32,
            request_id: request_id.to_string(),
            state: None,
        };
        let message_insert = db.set(&request_id.to_string(), &target);
        // Kept this as a match as the error case returns an Ok.
        match message_insert {
            Ok(_) => println!(
                "Successfully stored NetworkQuery in db with request_id: {}",
                request_id.to_string()
            ),
            Err(e) => {
                // Internal failure of sled. Send Error response
                println!(
                    "Error storing NetworkQuery in db for request_id: {}",
                    request_id.to_string()
                );
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("{:?}", e),
                }));
                println!("Sending Ack back to network: {:?}\n", reply);
                return reply;
            }
        }

        let network_query = request.into_inner().clone();
        let parsed_address = parse_address(network_query.address.to_string());
        match parsed_address {
            Ok(address) => {
                // TODO: verify that host and port are valid
                // Spawns a child process to handle sending request
                spawn_send_request(
                    conf,
                    network_query,
                    request_id.to_string(),
                    address.location.hostname.to_string(),
                    address.location.port.to_string()
                );
                // Send Ack back to network while request is happening in a thread
                let reply = Ack {
                    status: ack::Status::Ok as i32,
                    request_id: request_id.to_string(),
                    message: "".to_string(),
                };
                println!("Sending Ack back to network: {:?}\n", reply);
                Ok(Response::new(reply))
            }
            Err(e) => {
                println!("Invalid Address");
                let reply = Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("Error: {:?}", e),
                };
                println!("Sending Ack back to network: {:?}\n", reply);
                Ok(Response::new(reply))
            }
        }
    }
    
    // Subscribe Event Endpoints
    async fn subscribe_event(&self, request: Request<NetworkEventSubscription>) -> Result<Response<Ack>, Status> {
        println!(
            "Got a Network Event Subscription request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let conf = self.config_lock.read().await.clone();
        // Database access/storage
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };

        let request_id = Uuid::new_v4();
        let network_event_subscription = request.into_inner().clone();
        
        let mut event_publication_specs: Vec<EventPublication> = Vec::new();
        event_publication_specs.push(network_event_subscription.event_publication_spec.clone().expect("Event publication spec not found in NetworkEventSubscription request"));
        
        // Initial request state stored in DB.
        let target: EventSubscriptionState = EventSubscriptionState {
            status: event_subscription_state::Status::SubscribePendingAck as i32,
            request_id: request_id.to_string(),
            publishing_request_id: "".to_string(),
            message: "".to_string(),
            event_matcher: network_event_subscription.event_matcher.clone(),
            event_publication_specs: event_publication_specs
        };
        
        // Create EventSubscription
        let network_query = network_event_subscription.query.clone().expect("No query passed with NetworkEventSubscription request");
        let relay_name = conf.get_str("name").unwrap();
        let query: Query = Query {
            policy: network_query.policy,
            address: network_query.address,
            requesting_relay: relay_name,
            requesting_org: network_query.requesting_org,
            requesting_network: network_query.requesting_network,
            certificate: network_query.certificate,
            requestor_signature: network_query.requestor_signature,
            nonce: network_query.nonce,
            request_id: request_id.to_string(),
            confidential: network_query.confidential,
        };
        let event_subscription: EventSubscription = EventSubscription {
            event_matcher: network_event_subscription.event_matcher,
            query: Some(query),
            operation: EventSubOperation::Subscribe as i32,
        };
        let event_publication_spec = network_event_subscription.event_publication_spec.clone().expect("No Event Publication Specification passed with NetworkEventSubscription request");

        return event_subscription_helper(event_subscription, event_publication_spec, target, request_id.to_string(), db, conf).await;
    }
    
    async fn get_event_subscription_state(
        &self,
        request: Request<GetStateMessage>,
    ) -> Result<Response<EventSubscriptionState>, Status> {
        println!("\nReceived GetEventSubscriptionState request from network: {:?}", request);
        let conf = self.config_lock.read().await.clone();
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };
        let event_sub_key = get_event_subscription_key(request.into_inner().request_id);
        let result = db.get::<EventSubscriptionState>(event_sub_key.to_string());
        match result {
            Ok(fetched_event_sub_state) => {
                match event_subscription_state::Status::from_i32(fetched_event_sub_state.status) {
                    Some(status) => match status {
                        event_subscription_state::Status::Unsubscribed => {
                            let result = db.unset::<EventSubscriptionState>(event_sub_key.to_string());
                            match result {
                                Ok(old_state) => {
                                    println!("Removed EventSubscription from database: {:?}", old_state);
                                },
                                Err(e) => {
                                    println!("EventSubscription Request not found. Error: {:?}", e);
                                }
                            }
                        },
                        _ => {},
                    },
                    None => {},
                }

                println!("Sending back EventSubscriptionState to network: Request ID = {:?}, Status = {:?}",
                         fetched_event_sub_state.request_id,
                         fetched_event_sub_state.status
                         );
                return Ok(Response::new(fetched_event_sub_state));
            },
            Err(e) => Err(Status::new(
                Code::NotFound,
                format!("Event Subscription Request not found. Error: {:?}", e),
            )),
        }
    }
    // Unsubscribe Event Endpoints
    async fn unsubscribe_event(&self, request: Request<NetworkEventUnsubscription>) -> Result<Response<Ack>, Status> {
        println!(
            "Got a Network Event Unubscription request from {:?} - {:?}",
            request.remote_addr(),
            request
        );
        let conf = self.config_lock.read().await.clone();
        // Database access/storage
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };
        
        let net_event_sub = request.into_inner().clone();
        let network_event_subscription = net_event_sub.request.clone().expect("No network event subscription passed");
        let request_id = net_event_sub.request_id.to_string();
        let requested_unsub_pub_spec = network_event_subscription.event_publication_spec.clone().expect("No event publication spec provided for unsubscription request.");
        
        let delete_pub_spec_status = delete_event_pub_spec(request_id.to_string(), requested_unsub_pub_spec, conf.get_str("db_path").unwrap().to_string());
        
        if delete_pub_spec_status == 0 {
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "Unsubscribed requested event publication specification.".to_string(),
            };
            println!("Sending Ack back to network: {:?}\n", reply);
            Ok(Response::new(reply))
        } else if delete_pub_spec_status == 2 {
            let reply = Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: "Unsubscription request does not match existing subscription: Check event publication specification.".to_string(),
            };
            println!("Sending Ack back to network: {:?}\n", reply);
            Ok(Response::new(reply))
        } else {
            let mut event_publication_specs: Vec<EventPublication> = Vec::new();
            event_publication_specs.push(network_event_subscription.event_publication_spec.clone().expect("Event publication spec not found in NetworkEventSubscription request"));
            
            // Initial request state stored in DB.
            let target: EventSubscriptionState = EventSubscriptionState {
                status: event_subscription_state::Status::UnsubscribePendingAck as i32,
                request_id: request_id.to_string(),
                publishing_request_id: request_id.to_string(),
                message: "".to_string(),
                event_matcher: network_event_subscription.event_matcher.clone(),
                event_publication_specs: event_publication_specs
            };
            
            // Create EventSubscription
            let network_query = network_event_subscription.query.clone().expect("No query passed with NetworkEventSubscription request");
            let relay_name = conf.get_str("name").unwrap();
            let query: Query = Query {
                policy: network_query.policy,
                address: network_query.address,
                requesting_relay: relay_name,
                requesting_org: network_query.requesting_org,
                requesting_network: network_query.requesting_network,
                certificate: network_query.certificate,
                requestor_signature: network_query.requestor_signature,
                nonce: network_query.nonce,
                request_id: request_id.to_string(),
                confidential: network_query.confidential,
            };
            let event_subscription: EventSubscription = EventSubscription {
                event_matcher: network_event_subscription.event_matcher,
                query: Some(query),
                operation: EventSubOperation::Unsubscribe as i32,
            };
            let event_publication_spec = network_event_subscription.event_publication_spec.clone().expect("No Event Publication Specification passed with NetworkEventSubscription request");

            return event_subscription_helper(event_subscription, event_publication_spec, target, request_id.to_string(), db, conf).await;
        }
    }
    
    // Fetch EventStates for given subscription request identified by request_id.
    async fn get_event_states(
        &self,
        request: Request<GetStateMessage>,
    ) -> Result<Response<EventStates>, Status> {
        println!("\nReceived GetEventStates request from network: {:?}", request);
        let conf = self.config_lock.read().await.clone();
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };
        let request_id = request.into_inner().request_id;
        let event_publish_key = get_event_publication_key(request_id.to_string());
        let result = db.get::<EventStates>(event_publish_key.to_string());
        match result {
            Ok(fetched_event_states) => {
                mark_event_states_deleted(fetched_event_states.clone(), request_id.to_string(), event_publish_key.to_string(), db);
                println!("Sending back EventStates to network: Request ID = {:?}: {:?}",
                         request_id.to_string(),
                         fetched_event_states.clone()
                        );
                return Ok(Response::new(fetched_event_states));
            },
            Err(e) => Err(Status::new(
                Code::NotFound,
                format!("EventStates not found for request_id: {}. Error: {:?}", request_id.to_string(), e),
            )),
        }
    }
}

async fn event_subscription_helper(
    req_event_subscription: EventSubscription,
    event_publication_spec: EventPublication,
    target_status: EventSubscriptionState,
    request_id: String,
    db: Database,
    conf: config::Config,
) -> Result<Response<Ack>, Status> {
    let event_subscription;
    
    // Check if driver is subscribing/unsubscribing
    match event_publication_spec.publication_target {
        Some(data) => match data {
            event_publication::PublicationTarget::Ctx(ctx) => {
                let driver_id = ctx.clone().driver_id.to_string();
                println!("Requesting Driver {} to sign", driver_id.clone().to_string());
                let result = driver_sign_subscription_helper(
                    req_event_subscription.clone(),
                    request_id.to_string(),
                    driver_id.to_string(),
                    conf.clone(),
                ).await;
                match result {
                    Ok(signed_query) => {
                        event_subscription = EventSubscription {
                            event_matcher: req_event_subscription.event_matcher,
                            query: Some(signed_query),
                            operation: req_event_subscription.operation,
                        };
                    }
                    Err(e) => {
                        println!("Driver did not signed the subscription request");
                        let reply = Ack {
                            status: ack::Status::Error as i32,
                            request_id: request_id.to_string(),
                            message: format!("Error: {:?}", e),
                        };
                        println!("Sending Ack back to network: {:?}\n", reply);
                        return Ok(Response::new(reply))
                    }
                }
            }
            event_publication::PublicationTarget::AppUrl(app_url) => {
                println!("Registering for Client using App URL: {}", app_url.to_string());
                event_subscription = req_event_subscription;
            }
        },
        None => {
            println!("No Publication Target");
            let reply = Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!("No Publication Target provided"),
            };
            println!("Sending Ack back to network: {:?}\n", reply);
            return Ok(Response::new(reply))
        }
    };
    
    let event_sub_key = get_event_subscription_key(request_id.to_string());
    let message_insert = db.set(&event_sub_key.to_string(), &target_status);
    // Kept this as a match as the error case returns an Ok.
    match message_insert {
        Ok(_) => println!(
            "Successfully stored EventSubscriptionState in db with request_id: {}",
            request_id.to_string()
        ),
        Err(e) => {
            // Internal failure of sled. Send Error response
            println!(
                "Error storing EventSubscriptionState in db for request_id: {}",
                request_id.to_string()
            );
            let reply = Ok(Response::new(Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!("{:?}", e),
            }));
            println!("Sending Ack back to network: {:?}\n", reply);
            return reply;
        }
    }
    let query = event_subscription.clone().query.expect("");
    let parsed_address = parse_address(query.address.to_string());
    match parsed_address {
        Ok(address) => {
            // TODO: verify that host and port are valid
            // Spawns a child process to handle sending request
            spawn_send_event_subscription_request(
                conf,
                event_subscription,
                request_id.to_string(),
                address.location.hostname.to_string(),
                address.location.port.to_string(),
            );
            // Send Ack back to network while request is happening in a thread
            let reply = Ack {
                status: ack::Status::Ok as i32,
                request_id: request_id.to_string(),
                message: "".to_string(),
            };
            println!("Sending Ack back to network: {:?}\n", reply);
            Ok(Response::new(reply))
        }
        Err(e) => {
            println!("Invalid Address");
            let reply = Ack {
                status: ack::Status::Error as i32,
                request_id: request_id.to_string(),
                message: format!("Error: {:?}", e),
            };
            println!("Sending Ack back to network: {:?}\n", reply);
            Ok(Response::new(reply))
        }
    }
}

// Sends a request to the remote relay
fn spawn_send_request(
    conf: config::Config,
    network_query: NetworkQuery,
    request_id: String,
    relay_host: String,
    relay_port: String,
) {
    println!("Sending Query to remote relay: {:?}:{:?}", relay_host, relay_port);
    // Locally scoped function to update request status in db. This function is
    // called for the first time after an Ack is received from the remote relay.
    // A locally created RequestState with status Pending or Error is stored.
    // When a response is received from the remote relay it will write the
    // returned RequestState with status Completed or Error.
    fn update_request_status(
        curr_request_id: String,
        new_status: request_state::Status,
        curr_db_path: String,
        state: Option<request_state::State>,
    ) {
        let db = Database {
            db_path: curr_db_path,
        };
        let target: RequestState = RequestState {
            status: new_status as i32,
            request_id: curr_request_id.clone(),
            state,
        };

        // Panic if this fails, atm the panic is just logged by the tokio runtime
        db.set(&curr_request_id, &target)
            .expect("Failed to insert into DB");
        println!("Successfully written RequestState to database");
        println!("{:?}\n", db.get::<RequestState>(curr_request_id).unwrap())
    }
    // Spawning new thread to make the data_transfer_call to remote relay
    tokio::spawn(async move {
        let db_path = conf.get_str("db_path").unwrap();

        // Iterate through the relay entries in the configuration to find a match
        let relays_table = conf.get_table("relays").unwrap();
        let mut relay_tls = false;
        let mut relay_tlsca_cert_path = "".to_string();
        for (_relay_name, relay_spec) in relays_table {
            let relay_uri = relay_spec.clone().try_into::<LocationSegment>().unwrap();
            if relay_host == relay_uri.hostname && relay_port == relay_uri.port {
                relay_tls = relay_uri.tls;
                relay_tlsca_cert_path = relay_uri.tlsca_cert_path;
            }
        }

        let result = data_transfer_call(
            conf.get_str("name").unwrap(),
            relay_host,
            relay_port,
            network_query,
            request_id.clone(),
            relay_tls,
            relay_tlsca_cert_path.to_string(),
        )
        .await;
        println!("Received Ack from remote relay: {:?}\n", result);
        // Potentially clean up when more skilled at Rust.
        // Updates the request in the DB depending on the response status from the remote relay
        match result {
            Ok(ack_response) => {
                let ack_response_into_inner = ack_response.into_inner().clone();
                // This match first checks if the status is valid.
                match ack::Status::from_i32(ack_response_into_inner.status) {
                    Some(status) => match status {
                        ack::Status::Ok => update_request_status(
                            request_id.to_string(),
                            request_state::Status::Pending,
                            db_path.to_string(),
                            None,
                        ),
                        ack::Status::Error => update_request_status(
                            request_id.to_string(),
                            request_state::Status::Error,
                            db_path.to_string(),
                            Some(request_state::State::Error(
                                ack_response_into_inner.message.to_string(),
                            )),
                        ),
                    },
                    None => update_request_status(
                        request_id.to_string(),
                        request_state::Status::Error,
                        db_path.to_string(),
                        Some(request_state::State::Error(
                            "Status is not supported or is invalid".to_string(),
                        )),
                    ),
                }
            }
            Err(result_error) => update_request_status(
                request_id.to_string(),
                request_state::Status::Error,
                db_path.to_string(),
                Some(request_state::State::Error(format!("{:?}", result_error))),
            ),
        }
    });
}
// Call to remote relay for the data transfer protocol.
async fn data_transfer_call(
    relay_name: String,
    relay_host: String,
    relay_port: String,
    network_query: NetworkQuery,
    request_id: String,
    use_tls: bool,
    tlsca_cert_path: String,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let client_addr = format!("http://{}:{}", relay_host, relay_port);
    let mut client;
    if use_tls {
        let pem = tokio::fs::read(tlsca_cert_path).await?;
        let ca = Certificate::from_pem(pem);

        let tls = ClientTlsConfig::new()
            .ca_certificate(ca)
            .domain_name(relay_host);

        let channel = Channel::from_shared(client_addr)?
            .tls_config(tls)
            .connect()
            .await?;

        client = DataTransferClient::new(channel);
    } else {
        client = DataTransferClient::connect(client_addr).await?;
    }
    let query_request = tonic::Request::new(Query {
        policy: network_query.policy,
        address: network_query.address,
        requesting_relay: relay_name,
        requesting_org: network_query.requesting_org,
        requesting_network: network_query.requesting_network,
        certificate: network_query.certificate,
        requestor_signature: network_query.requestor_signature,
        nonce: network_query.nonce,
        request_id: request_id.to_string(),
        confidential: network_query.confidential,
    });
    println!("Query: {:?}", query_request);
    let response = client.request_state(query_request).await?;
    Ok(response)
}


// Sends a request to the remote relay
fn spawn_send_event_subscription_request(
    conf: config::Config,
    event_subscription: EventSubscription,
    request_id: String,
    relay_host: String,
    relay_port: String,
) {
    println!("Sending EventSubscription to remote relay: {:?}:{:?}", relay_host, relay_port);
    
    // Spawning new thread to make the subscribe_event_call to remote relay
    tokio::spawn(async move {
        let db_path = conf.get_str("db_path").unwrap();

        // Iterate through the relay entries in the configuration to find a match
        let relays_table = conf.get_table("relays").unwrap();
        let mut relay_tls = false;
        let mut relay_tlsca_cert_path = "".to_string();
        for (_relay_name, relay_spec) in relays_table {
            let relay_uri = relay_spec.clone().try_into::<LocationSegment>().unwrap();
            if relay_host == relay_uri.hostname && relay_port == relay_uri.port {
                relay_tls = relay_uri.tls;
                relay_tlsca_cert_path = relay_uri.tlsca_cert_path;
            }
        }

        let result = suscribe_event_call(
            relay_host,
            relay_port,
            event_subscription,
            relay_tls,
            relay_tlsca_cert_path.to_string(),
        )
        .await;
        println!("Received Ack from remote relay: {:?}\n", result);
        // Potentially clean up when more skilled at Rust.
        // Updates the request in the DB depending on the response status from the remote relay
        match result {
            Ok(ack_response) => {
                let ack_response_into_inner = ack_response.into_inner().clone();
                // This match first checks if the status is valid.
                match ack::Status::from_i32(ack_response_into_inner.status) {
                    Some(status) => update_event_subscription_status(
                            request_id.to_string(),
                            status,
                            db_path.to_string(),
                            ack_response_into_inner.message.to_string(),
                    ),
                    None => update_event_subscription_status(
                        request_id.to_string(),
                        ack::Status::Error,
                        db_path.to_string(),
                        "Status is not supported or is invalid".to_string(),
                    ),
                }
            }
            Err(result_error) => update_event_subscription_status(
                request_id.to_string(),
                ack::Status::Error,
                db_path.to_string(),
                format!("{:?}", result_error).to_string(),
            ),
        }
    });
}
// // Call to remote relay for the event subscription protocol.
async fn suscribe_event_call(
    relay_host: String,
    relay_port: String,
    event_subscription: EventSubscription,
    use_tls: bool,
    tlsca_cert_path: String,
) -> Result<Response<Ack>, Box<dyn std::error::Error>> {
    let client_addr = format!("http://{}:{}", relay_host, relay_port);
    let mut client;
    if use_tls {
        let pem = tokio::fs::read(tlsca_cert_path).await?;
        let ca = Certificate::from_pem(pem);
    
        let tls = ClientTlsConfig::new()
            .ca_certificate(ca)
            .domain_name(relay_host);
    
        let channel = Channel::from_shared(client_addr)?
            .tls_config(tls)
            .connect()
            .await?;
    
        client = EventSubscribeClient::new(channel);
    } else {
        client = EventSubscribeClient::connect(client_addr).await?;
    }
    
    let event_subscription_request = tonic::Request::new(event_subscription);
    println!("EventSubscription: {:?}", event_subscription_request);
    let response = client.subscribe_event(event_subscription_request).await?;
    Ok(response)
}
