use crate::pb::common::ack::{ack};
use crate::pb::common::query::Query;
use crate::pb::common::state::{request_state, RequestState};
use crate::pb::common::events::{event_subscription_state, EventSubscriptionState};
use crate::pb::common::events::{EventSubscription, EventStates, EventState};
use crate::pb::driver::driver::driver_communication_client::DriverCommunicationClient;

use crate::db::Database;
use crate::services::types::{Driver, Network};
use crate::error::Error;

use config;
use tonic::transport::{Certificate, Channel, ClientTlsConfig};

// Locally scoped function to update request status in db. This function is
// called for the first time after an Ack is received from the remote relay.
// A locally created EventSubscriptionState with status PENDING or ERROR is stored.
// When a response is received from the remote relay it will write the
// returned EventSubscriptionState with status SUCCESS or ERROR.
pub fn update_event_subscription_status(
    curr_request_id: String,
    new_status: ack::Status,
    curr_db_path: String,
    message: String,
) {
    let db = Database {
        db_path: curr_db_path,
    };
    let event_sub_key = get_event_subscription_key(curr_request_id.clone());
    let result = db.get::<EventSubscriptionState>(event_sub_key.to_string());
    match result {
        Ok(fetched_event_sub_state) => {
            let target: EventSubscriptionState;
            if new_status == ack::Status::Ok {
                match event_subscription_state::Status::from_i32(fetched_event_sub_state.status) {
                    Some(status) => match status {
                        event_subscription_state::Status::UnsubscribePendingAck => {
                            target = EventSubscriptionState {
                                status: event_subscription_state::Status::UnsubscribePending as i32,
                                request_id: curr_request_id.clone(),
                                message: message.to_string(),
                                event_matcher: fetched_event_sub_state.event_matcher,
                                event_publication_spec: fetched_event_sub_state.event_publication_spec
                            };
                        },
                        event_subscription_state::Status::UnsubscribePending => {
                            target = EventSubscriptionState {
                                status: event_subscription_state::Status::Unsubscribed as i32,
                                request_id: curr_request_id.clone(),
                                message: message.to_string(),
                                event_matcher: fetched_event_sub_state.event_matcher,
                                event_publication_spec: fetched_event_sub_state.event_publication_spec
                            };
                        },
                        event_subscription_state::Status::SubscribePendingAck  => {
                            target = EventSubscriptionState {
                                status: event_subscription_state::Status::SubscribePending as i32,
                                request_id: curr_request_id.clone(),
                                message: message.to_string(),
                                event_matcher: fetched_event_sub_state.event_matcher.clone(),
                                event_publication_spec: fetched_event_sub_state.event_publication_spec.clone(),
                            };
                        },
                        event_subscription_state::Status::SubscribePending  => {
                            target = EventSubscriptionState {
                                status: event_subscription_state::Status::Subscribed as i32,
                                request_id: curr_request_id.clone(),
                                message: message.to_string(),
                                event_matcher: fetched_event_sub_state.event_matcher.clone(),
                                event_publication_spec: fetched_event_sub_state.event_publication_spec.clone(),
                            };
                        },
                        _ => {
                            target = EventSubscriptionState {
                                status: event_subscription_state::Status::Error as i32,
                                request_id: curr_request_id.clone(),
                                message: "Status is not supported or is invalid".to_string(),
                                event_matcher: fetched_event_sub_state.event_matcher.clone(),
                                event_publication_spec: fetched_event_sub_state.event_publication_spec.clone(),
                            };
                        },
                    },
                    None => {
                        target = EventSubscriptionState {
                            status: event_subscription_state::Status::Error as i32,
                            request_id: curr_request_id.clone(),
                            message: "No event subscription status set in database".to_string(),
                            event_matcher: fetched_event_sub_state.event_matcher.clone(),
                            event_publication_spec: fetched_event_sub_state.event_publication_spec.clone(),
                        };
                    },
                }
            } else {
                target = EventSubscriptionState {
                    status: event_subscription_state::Status::Error as i32,
                    request_id: curr_request_id.clone(),
                    message: message.to_string(),
                    event_matcher: fetched_event_sub_state.event_matcher.clone(),
                    event_publication_spec: fetched_event_sub_state.event_publication_spec.clone(),
                };
            }
            
            // Panic if this fails, atm the panic is just logged by the tokio runtime
            db.set(&event_sub_key.to_string(), &target)
                .expect("Failed to insert into DB");
            println!("Successfully written EventSubscriptionState to database");
            println!("{:?}\n", db.get::<EventSubscriptionState>(event_sub_key.to_string()).unwrap())

        },
        Err(e) => {
            println!("EventSubscription Request not found. Error: {:?}", e);
        },
    }
}

pub fn get_driver(
    network_id: String,
    conf: config::Config,
) -> Result<Driver, Error> {
    // get the driver type from the networks map
    let networks_table = conf
        .get_table("networks")
        .map_err(|e| Error::Simple(format!("Unable to find networks table. Error: {:?}", e)))?;
    let network_table = networks_table
        .get::<String>(&network_id.to_string())
        .ok_or(Error::Simple(format!(
            "Unable to find Network_id \"{}\" in config",
            network_id.to_string()
        )))?;
    let network_type = network_table
        .clone()
        .try_into::<Network>()
        .expect("Error in config file networks table")
        .clone();
    // get the driver host:port from the drivers map
    let drivers_table = conf
        .get_table("drivers")
        .map_err(|e| Error::Simple(format!("Unable to find driver table. Error: {:?}", e)))?;
    let driver_table = drivers_table
        .get::<String>(&network_type.network)
        .ok_or(Error::Simple(format!(
            "Unable to find driver port for network: {}",
            network_id.to_string()
        )))?;
    let driver_info = driver_table
        .clone()
        .try_into::<Driver>()
        .expect("Error in config file drivers table");
    return Ok(driver_info);
}

pub async fn get_driver_client(
    driver_info: Driver,
) -> Result<DriverCommunicationClient<Channel>, Error> {
    let port = driver_info.port.to_string();
    let hostname = driver_info.hostname.to_string();
    let use_tls = driver_info.tls;
    let tlsca_cert_path = driver_info.tlsca_cert_path.to_string();
    let driver_address = format!("http://{}:{}", hostname, port);
    let client;
    if use_tls {
        let pem = tokio::fs::read(tlsca_cert_path).await?;
        let ca = Certificate::from_pem(pem);

        let tls = ClientTlsConfig::new()
            .ca_certificate(ca)
            .domain_name(hostname);

        let channel = Channel::from_shared(driver_address).unwrap()
            .tls_config(tls)
            .connect()
            .await
            .unwrap();

        client = DriverCommunicationClient::new(channel);
    } else {
        client = DriverCommunicationClient::connect(driver_address).await?;
    }
    return Ok(client)
}


pub async fn driver_sign_subscription_helper(
    event_subscription: EventSubscription,
    request_id: String,
    driver_id: String,
    conf: config::Config,
) -> Result<Query, Error> {
    let result = get_driver(driver_id.to_string(), conf.clone());
    match result {
        Ok(driver_info) => {
            let client = get_driver_client(driver_info).await?;
            println!("Sending Sign EventSubscription Request to driver: {:?}", event_subscription.clone());
            let signed_query = client
                .clone()
                .request_signed_event_subscription_query(event_subscription)
                .await?
                .into_inner();
            if signed_query.clone().request_id.to_string() == request_id.to_string() {
                println!("Signed Query Response from driver={:?}\n", signed_query);
                return Ok(signed_query)
            }
            Err(Error::Simple(format!("Error while requesting signature from driver: {:?}", signed_query)))
        },
        Err(e) => Err(e),
    }
}

pub fn update_event_state(
    request_id: String,
    event_id: String,
    new_status: request_state::Status,
    curr_db_path: String,
    message: String,
) {
    let db = Database {
        db_path: curr_db_path,
    };
    let event_publish_key = get_event_publication_key(request_id.to_string());
    let result = db.get::<EventStates>(event_publish_key.to_string());
    match result {
        Ok(fetched_event_states) => {
            let mut updated_event_states: Vec<EventState> = Vec::new();
            for fetched_event_state in fetched_event_states.states {
                if fetched_event_state.event_id.to_string() == event_id.to_string() {
                    let new_request_state: RequestState = RequestState {
                        status: new_status as i32,
                        request_id: request_id.to_string(),
                        state: fetched_event_state.state.expect("No State found").state,
                    };
                    let new_event_state: EventState = EventState {
                        state: Some(new_request_state),
                        event_id: event_id.to_string(),
                        message: message.to_string(),
                    };
                    updated_event_states.push(new_event_state);
                }
                else {
                    updated_event_states.push(fetched_event_state);
                }
            }
            // Panic if this fails, atm the panic is just logged by the tokio runtime
            db.set(&event_publish_key.to_string(), &updated_event_states)
                .expect("Failed to insert into DB");
            println!("Successfully updated EventStates in database");
            println!("{:?}\n", updated_event_states);
        },
        Err(e) => {
            println!("EventStates not found. Error: {:?}", e);
        },
    }
}

pub fn try_mark_request_state_deleted(state: RequestState, request_id: String, db: Database) {
    let state_status = request_state::Status::from_i32(state.clone().status).expect("No Status");
    if state_status == request_state::Status::Error ||
        state_status == request_state::Status::Completed {
        let deleted_request_state = RequestState {
            status: request_state::Status::Deleted as i32,
            request_id: request_id.to_string(),
            state: state.state,
        };
        db.set(&request_id, &deleted_request_state)
            .expect("RequestState Delete: Failed to insert into DB");
    }
}

pub fn mark_event_states_deleted(fetched_event_states: EventStates, request_id: String, event_publish_key: String, db: Database) {
    let mut updated_event_states: Vec<EventState> = Vec::new();
    for fetched_event_state in fetched_event_states.states {
        let deleted_request_state = RequestState {
            status: request_state::Status::Deleted as i32,
            request_id: request_id.to_string(),
            state: fetched_event_state.state.expect("No State found").state,
        };
        let deleted_event_state = EventState {
            state: Some(deleted_request_state),
            event_id: fetched_event_state.event_id,
            message: fetched_event_state.message.to_string(),
        };
        updated_event_states.push(deleted_event_state);
    }
    
    db.set(&event_publish_key.to_string(), &updated_event_states)
        .expect("EventState Delete: Failed to insert into DB");
}
pub fn get_event_subscription_key(request_id: String) -> String {
    return format!("event_sub_{}", request_id);
}
pub fn get_event_publication_key(request_id: String) -> String {
    return format!("event_pub_{}", request_id);
}