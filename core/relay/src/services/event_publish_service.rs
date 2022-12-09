// Internal generated modules
use weaverpb::common::ack::{ack, Ack};
use weaverpb::common::query::Query;
use weaverpb::common::state::{request_state, view_payload, RequestState, ViewPayload};
use weaverpb::common::events::{EventSubscription, EventSubscriptionState, event_publication, EventPublication, EventState, EventStates};
use weaverpb::relay::events::event_publish_client::EventPublishClient;
use weaverpb::relay::events::event_publish_server::EventPublish;
use weaverpb::driver::driver::WriteExternalStateMessage;

// Internal modules
use crate::db::Database;
use crate::error::Error;
use crate::relay_proto::LocationSegment;
use crate::services::helpers::{get_driver, get_driver_client, get_event_subscription_key, get_event_publication_key, update_event_state};

// external modules
use config;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use tonic::transport::{Certificate, Channel, ClientTlsConfig};
use reqwest;

pub struct EventPublishService {
    pub config_lock: RwLock<config::Config>,
}

/// EventPublishService is the gRPC server implementation that handles the logic for
/// communicating event published from driver to the remote relay.
#[tonic::async_trait]
impl EventPublish for EventPublishService {
    // src-driver forwards the state as part of event subscription to src-relay
    async fn send_driver_state(
        &self,
        request: Request<ViewPayload>,
    ) -> Result<Response<Ack>, Status> {
        let state = request.into_inner().clone();
        let state_clone = state.clone();
        println!("Received State from driver: {:?}", state_clone.request_id);
        match state_clone.state.as_ref().unwrap() {
            view_payload::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
            view_payload::State::Error(e) => println!("Error: {:?}", e),
        }
        let request_id = state.request_id.to_string();
        let conf = self.config_lock.read().await;
        // Database access/storage
        let remote_db = Database {
            db_path: conf.get_str("remote_db_path").unwrap(),
        };

        let result =
            send_driver_state_helper(request_id.to_string(), remote_db, conf.clone(), state);
        match result {
            Ok(resp) => {
                let reply = Ok(resp);
                println!("Sending back Ack to driver: {:?}\n", reply);
                return reply;
            }
            Err(e) => {
                // NOTE: No way to send another state to Relay, if it reaches this error the next will also error.
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
    // src-relay will forward the state as part of event subscription to dest-relay
    async fn send_state(&self, request: Request<ViewPayload>) -> Result<Response<Ack>, Status> {
        let request_view_payload = request.into_inner().clone();
        println!(
            "Event: Received state from remote relay: Request ID = {:?}",
            request_view_payload.request_id
        );
        match request_view_payload.state.as_ref().unwrap() {
            view_payload::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
            view_payload::State::Error(e) => println!("Error: {:?}", e),
        }
        let request_id = &request_view_payload.request_id.to_string();
        let conf = self.config_lock.read().await.clone();
        // Database access/storage
        let db = Database {
            db_path: conf.get_str("db_path").unwrap(),
        };
        let result = send_state_helper(request_view_payload, request_id.to_string(), db, conf);

        match result {
            Ok(_) => {
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Ok as i32,
                    request_id: request_id.to_string(),
                    message: "".to_string(),
                }));
                println!("Event: Sending back Ack to remote relay: {:?}", reply);
                reply
            },
            Err(e) => {
                let reply = Ok(Response::new(Ack {
                    status: ack::Status::Error as i32,
                    request_id: request_id.to_string(),
                    message: format!("{:?}", e),
                }));
                println!("Event: Sending back Ack to remote relay: {:?}", reply);
                reply
            }
        }
    }

}


/// send_driver_state is run on the remote relay. Runs when the driver sends the
/// state or error back to the remote relay.
fn send_driver_state_helper(
    request_id: String,
    remote_db: Database,
    conf: config::Config,
    state: ViewPayload,
) -> Result<Response<Ack>, Error> {
    let event_sub_key = get_event_subscription_key(request_id.to_string());
    let event_sub: EventSubscription = remote_db
        .get::<EventSubscription>(event_sub_key.to_string())
        .map_err(|e| Error::GetQuery(format!("Failed to get event subscription from db. Error: {:?}", e)))?;
    let query: &Query = &event_sub.clone().query.expect("Unexpected Error: Query not found in event subscription");
    let relays_table = conf.get_table("relays")?;
    let relay_uri = relays_table
        .get(&query.requesting_relay.to_string())
        .ok_or(Error::Simple("Relay name not found".to_string()))?;
    let uri = relay_uri.clone().try_into::<LocationSegment>()?;
    spawn_send_state(
        state,
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

// spawn_send_state sends data from the remote relay back to the requesting relay
// When it errors it currently logs to console. Needs improving
fn spawn_send_state(state: ViewPayload, requestor_host: String, requester_port: String, use_tls: bool, tlsca_cert_path: String) {
    tokio::spawn(async move {
        println!("Event Publish: Sending state back to requesting relay: Request ID = {:?}", state.request_id);
        match state.state.as_ref().unwrap() {
            view_payload::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
            view_payload::State::Error(e) => println!("Error: {:?}", e),
        }
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

            let mut client_result = EventPublishClient::new(channel);
            let response = client_result.send_state(state).await;
            println!("Event Publish: Response ACK from requesting relay={:?}\n", response);
        } else {
            let client_result = EventPublishClient::connect(client_addr).await;
            match client_result {
                Ok(client) => {
                    let response = client.clone().send_state(state).await;
                    println!("Event Publish: Response ACK from requesting relay={:?}\n", response);
                    // Not returning anything here
                }
                Err(e) => {
                    // TODO: Add better error handling (Attempt a few times?)
                    println!(
                        "Event Publish: Failed to connect to client: ${:?}. Error: {}\n",
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

/// send_state is run on the requesting relay when a remote relay sends a result back to the requesting relay
fn send_state_helper(
    state: ViewPayload,
    request_id: String,
    db: Database,
    conf: config::Config
) -> Result<(), Error> {
    let event_sub_key = get_event_subscription_key(request_id.to_string());
    let event_sub_state: EventSubscriptionState = db.get::<EventSubscriptionState>(event_sub_key.to_string())
        .map_err(|err| Error::GetQuery(format!("Failed to get event subscription state from db. Error: {:?}", err)))?;
    
    let event_publish_key = get_event_publication_key(request_id.to_string());
    let event_id = Uuid::new_v4();
    let target;
    match state.clone().state {
        Some(data) => match data {
            view_payload::State::View(payload) => {
                let request_state = RequestState {
                    status: request_state::Status::EventReceived as i32,
                    request_id: request_id.to_string(),
                    state: Some(request_state::State::View(payload)),
                };
                target = EventState {
                    state: Some(request_state),
                    event_id: event_id.to_string(),
                    message: "Successfully received state for event subscribed".to_string(),
                };
            }
            view_payload::State::Error(error) => {
                let request_state = RequestState {
                    status: request_state::Status::Error as i32,
                    request_id: request_id.to_string(),
                    state: Some(request_state::State::Error(error)),
                };
                target = EventState {
                    state: Some(request_state),
                    event_id: event_id.to_string(),
                    message: "Received error for the event subscribed".to_string(),
                };
            }
        },
        None => {
            let request_state = RequestState {
                status: request_state::Status::Error as i32,
                request_id: request_id.to_string(),
                state: Some(request_state::State::Error("Missing state".to_string())),
            };
            target = EventState {
                state: Some(request_state),
                event_id: event_id.to_string(),
                message: "No state received for the event subscribed".to_string(),
            };
        }
    };
    let mut event_states_list: Vec<EventState> = Vec::new();
    event_states_list.push(target.clone());
    if db.has_key(event_publish_key.to_string())? {
        let mut curr_event_states: EventStates = db.get::<EventStates>(event_publish_key.to_string()).expect("SendState: Unexpected DB Error");
        event_states_list.append(&mut curr_event_states.states);
    }
    
    let event_states: EventStates = EventStates {
        states: event_states_list,
    };
    
    db.set(&event_publish_key, &event_states)
        .expect("Failed to insert into DB");
    
    for event_pub_spec in event_sub_state.event_publication_specs.iter() {
        spawn_handle_event(
            state.clone(),
            (*event_pub_spec).clone(),
            request_id.to_string(),
            event_id.to_string(),
            conf.clone()
        );
    }
    
    return Ok(());
}

// Calls handle_event and updates status of event_state depending upon the success or failure.
fn spawn_handle_event(state: ViewPayload, publication_spec: EventPublication, request_id: String, event_id: String, conf: config::Config) {
    tokio::spawn(async move {
        println!("Event Publish: Sending state to subscriber: Request ID = {:?}", request_id.to_string());
        match state.state.as_ref().unwrap() {
            view_payload::State::View(v) => println!("View Meta: {:?}, View Data: {:?}", v.meta, base64::encode(&v.data)),
            view_payload::State::Error(e) => println!("Error: {:?}", e),
        }
        let result = handle_event(state, publication_spec, conf.clone()).await;
        match result {
            Ok(message) => {
                if message.contains("written") {
                    // Update published event status to written to request_id, event_id in db
                    update_event_state(
                        request_id,
                        event_id,
                        request_state::Status::EventWritten,
                        conf.get_str("db_path").unwrap(),
                        message.to_string(),
                    )
                }
                println!("Success: {}", message.to_string());
            }
            Err(e) => {
                // Update published event status to error and error message to request_id, event_id in db
                println!("Write Error: {:?}", e);
                update_event_state(
                    request_id,
                    event_id,
                    request_state::Status::EventWriteError,
                    conf.get_str("db_path").unwrap(),
                    format!("Write Error: {:?}", e),
                )
            }
        };
    });
}

// Sends event payload to either driver or app_url depending upon publication spec during subscription
async fn handle_event(
    state: ViewPayload, 
    publication_spec: EventPublication,
    conf: config::Config
) -> Result<String, Error>  {
    return match publication_spec.publication_target {
        Some(data) => match data {
            event_publication::PublicationTarget::Ctx(ctx) => {
                let driver_id = ctx.clone().driver_id.to_string();
                let result = get_driver(driver_id.to_string(), conf.clone());
                match result {
                    Ok(driver_info) => {
                        let client = get_driver_client(driver_info).await?;
                        println!("Sending Received Event to driver: {:?}", state.clone());
                        let write_external_state_message: WriteExternalStateMessage = WriteExternalStateMessage {
                            view_payload: Some(state),
                            ctx: Some(ctx),
                        };
                        let ack = client
                            .clone()
                            .write_external_state(write_external_state_message)
                            .await?
                            .into_inner();
                        println!("Response ACK from driver={:?}\n", ack);
                        let status = ack::Status::from_i32(ack.status)
                            .ok_or(Error::Simple("Status from Driver error".to_string()))?;
                        match status {
                            ack::Status::Ok => Ok(format!("Successfully written to ledger based on ContractTransaction")),
                            ack::Status::Error => Err(Error::Simple(format!("Error from driver: {}", ack.message))),
                        }
                    },
                    Err(e) => Err(e),
                }
            }
            event_publication::PublicationTarget::AppUrl(app_url) => {
                let app_url_clone = app_url.clone();
                tokio::spawn(async move {
                    let client = reqwest::Client::new();
                    let res = client.post(&app_url_clone)
                        .json(&state)
                        .send()
                        .await;
                    println!("Result from app: {:?}", res);
                });
                Ok(format!("Published to app url: {}", app_url.to_string()))
            }
        },
        None => {
            Ok(format!("Cannot publish event received: No publication target found."))
        }
    };
}