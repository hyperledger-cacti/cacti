mod pb;
mod relay_proto;
use futures::future::{BoxFuture, FutureExt};
use pb::common::ack::ack;
use pb::common::state::{request_state, view_payload, ViewPayload, View, Meta, meta};
use pb::common::events::{event_subscription_state, EventMatcher, EventPublication, event_publication, ContractTransaction};
use pb::relay::events::{event_publish_client::EventPublishClient};
use pb::networks::networks::{network_client::NetworkClient, GetStateMessage, NetworkQuery, NetworkEventSubscription, NetworkEventUnsubscription};
use relay_proto::get_url;
use std::env;
use std::thread::sleep;
use std::time;
use serde_json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\nData Sharing Test");
    datasharing().await?;
    println!("\nEvent: Driver Subscription Test");
    event_suscribe(true).await?;
    println!("\nEvent: Client Subscription Test");
    event_suscribe(false).await?;
    Ok(())
}

async fn datasharing() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let net_addr = format!("http://{}", get_url(&args));
    let mut network_client = NetworkClient::connect(net_addr).await?;
    // localhost:9081/Corda_Network/test
    // {locationsegment}/{Network_id}/{query}
    // localhost:9081/Corda_Network/mychannel:simplestate:read:TestState
    let request = tonic::Request::new(NetworkQuery {
        policy: vec!["test".to_string()],
        address: args[2].to_string(),
        requesting_relay: "".to_string(),
        requesting_network: "".to_string(),
        requesting_org: "".to_string(),
        certificate: "test".to_string(),
        requestor_signature: "test".to_string(),
        nonce: "test".to_string(),
        confidential: false,
    });
    let response = network_client.request_state(request).await?;
    println!("RESPONSE={:?}", response);
    let request_id = &response.get_ref().request_id;
    match ack::Status::from_i32(response.get_ref().status) {
        Some(ack_status) => match ack_status {
            ack::Status::Ok => {
                poll_for_state(request_id.to_string(), network_client).await;
                println!("Data Sharing: Success!");
            }
            ack::Status::Error => {
                println!("An error occurred in request_state call");
                std::process::exit(1);
            }
        },
        None => {
            println!("The returned Ack has no status");
            std::process::exit(1);
        }
    }
    Ok(())
}

fn poll_for_state(
    request_id: String,
    mut network_client: NetworkClient<tonic::transport::Channel>,
) -> BoxFuture<'static, ()> {
    async move {
        sleep(time::Duration::from_millis(2000));
        let request = tonic::Request::new(GetStateMessage {
            request_id: request_id.to_string(),
        });
        let result = network_client.get_state(request).await;
        match result {
            Ok(response) => {
                println!("Get state response: {:?}", response);
                match request_state::Status::from_i32(response.get_ref().status) {
                    Some(request_status) => {
                        if request_status == request_state::Status::Pending {
                            poll_for_state(request_id, network_client).await;
                        } else if request_status == request_state::Status::Error {
                            println!("Error");
                            std::process::exit(1);
                        }
                    }
                    None => {
                        println!("No status returned from get state request");
                        std::process::exit(1);
                    }
                };
            }
            Err(_error) => {
                println!("Error getting state response");
                std::process::exit(1);
            }
        }
    }
    .boxed()
}


async fn event_suscribe(driver: bool) -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let net_addr = format!("http://{}", get_url(&args));
    let mut network_client = NetworkClient::connect(net_addr).await?;
    // localhost:9081/Corda_Network/test
    // {locationsegment}/{Network_id}/{query}
    // localhost:9081/Corda_Network/mychannel:simplestate:read:TestState
    let network_query = NetworkQuery {
        policy: vec!["test".to_string()],
        address: args[2].to_string(),
        requesting_relay: "".to_string(),
        requesting_network: "".to_string(),
        requesting_org: "".to_string(),
        certificate: "test".to_string(),
        requestor_signature: "test".to_string(),
        nonce: "test".to_string(),
        confidential: false,
    };
    let event_matcher = EventMatcher {
        event_type: 0,
        event_class_id: "test".to_string(),
        transaction_ledger_id: "test".to_string(),
        transaction_contract_id: "test".to_string(),
        transaction_func: "test".to_string(),
    };
    let tmp;
    if driver {
        let ctx = ContractTransaction {
            driver_id: "Dummy_Network".to_string(),
            ledger_id: "abc".to_string(),
            contract_id: "abc".to_string(),
            func: "abc".to_string(),
            args: vec![],
            replace_arg_index: 0,
            members: vec![],
        };
        tmp = event_publication::PublicationTarget::Ctx(ctx);
    } else {
        tmp = event_publication::PublicationTarget::AppUrl("abc".to_string());
    }
    let event_publication_spec = EventPublication { 
        publication_target: std::option::Option::Some(tmp),
    };
    let request = tonic::Request::new(NetworkEventSubscription {
        event_matcher: std::option::Option::Some(event_matcher),
        query: std::option::Option::Some(network_query),
        event_publication_spec: std::option::Option::Some(event_publication_spec),
    });
    let response = network_client.subscribe_event(request).await?;
    println!("RESPONSE={:?}", response);
    let request_id = &response.get_ref().request_id;
    match ack::Status::from_i32(response.get_ref().status) {
        Some(ack_status) => match ack_status {
            ack::Status::Ok => {
                poll_for_event_subscription(request_id.clone().to_string(), network_client).await;
            }
            ack::Status::Error => {
                println!("An error occurred in subscribe_event call");
                std::process::exit(1);
            }
        },
        None => {
            println!("The returned Ack has no status");
            std::process::exit(1);
        }
    }
    println!("\n");
    let result = event_publish_test(request_id.to_string(), driver).await;
    match result {
        Ok(()) => {
            println!("Publish test: Successful");
        },
        Err(error) => {
            println!("Error during Publish Test: {:?}", error);
            std::process::exit(1);
        }
    }
    println!("\n");
    return event_unsuscribe(request_id.to_string(), driver).await;
}

async fn event_unsuscribe(request_id: String, driver: bool) -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let net_addr = format!("http://{}", get_url(&args));
    let mut network_client = NetworkClient::connect(net_addr).await?;
    // localhost:9081/Corda_Network/test
    // {locationsegment}/{Network_id}/{query}
    // localhost:9081/Corda_Network/mychannel:simplestate:read:TestState
    let network_query = NetworkQuery {
        policy: vec!["test".to_string()],
        address: args[2].to_string(),
        requesting_relay: "".to_string(),
        requesting_network: "".to_string(),
        requesting_org: "".to_string(),
        certificate: "test".to_string(),
        requestor_signature: "test".to_string(),
        nonce: "test".to_string(),
        confidential: false,
    };
    let event_matcher = EventMatcher {
        event_type: 0,
        event_class_id: "test".to_string(),
        transaction_ledger_id: "test".to_string(),
        transaction_contract_id: "test".to_string(),
        transaction_func: "test".to_string(),
    };
    let tmp;
    if driver {
        let ctx = ContractTransaction {
            driver_id: "Dummy_Network".to_string(),
            ledger_id: "abc".to_string(),
            contract_id: "abc".to_string(),
            func: "abc".to_string(),
            args: vec![],
            replace_arg_index: 0,
            members: vec![],
        };
        tmp = event_publication::PublicationTarget::Ctx(ctx);
    } else {
        tmp = event_publication::PublicationTarget::AppUrl("abc".to_string());
    }
    let event_publication_spec = EventPublication { 
        publication_target: std::option::Option::Some(tmp),
    };
    let net_event_sub = NetworkEventSubscription {
        event_matcher: std::option::Option::Some(event_matcher),
        query: std::option::Option::Some(network_query),
        event_publication_spec: std::option::Option::Some(event_publication_spec),
    };
    let request = tonic::Request::new(NetworkEventUnsubscription {
        request: std::option::Option::Some(net_event_sub),
        request_id: request_id,
    });
    let response = network_client.unsubscribe_event(request).await?;
    println!("RESPONSE={:?}", response);
    let request_id = &response.get_ref().request_id;
    match ack::Status::from_i32(response.get_ref().status) {
        Some(ack_status) => match ack_status {
            ack::Status::Ok => {
                poll_for_event_subscription(request_id.to_string(), network_client).await;
            }
            ack::Status::Error => {
                println!("An error occurred in unsubscribe_event call");
                std::process::exit(1);
            }
        },
        None => {
            println!("The returned Ack has no status");
            std::process::exit(1);
        }
    }
    Ok(())
}

fn poll_for_event_subscription(
    request_id: String,
    mut network_client: NetworkClient<tonic::transport::Channel>,
) -> BoxFuture<'static, ()> {
    async move {
        sleep(time::Duration::from_millis(2000));
        let request = tonic::Request::new(GetStateMessage {
            request_id: request_id.to_string(),
        });
        let result = network_client.get_event_subscription_state(request).await;
        match result {
            Ok(response) => {
                println!("Get Event Subscription State response: {:?}", response);
                match event_subscription_state::Status::from_i32(response.get_ref().status) {
                    Some(request_status) => {
                        println!("Received status: {:?}", response);
                        if request_status == event_subscription_state::Status::SubscribePending ||
                            request_status == event_subscription_state::Status::UnsubscribePending ||
                            request_status == event_subscription_state::Status::SubscribePendingAck ||
                            request_status == event_subscription_state::Status::SubscribePendingAck {
                            poll_for_event_subscription(request_id, network_client).await;
                        } else if request_status == event_subscription_state::Status::Subscribed {
                            println!("Event Subscription: Success!");
                        } else if request_status == event_subscription_state::Status::Unsubscribed {
                            println!("Event Unsubscription: Success!");
                        } else {
                            println!("Error: {:?}", response.get_ref().message.to_string());
                            std::process::exit(1);
                        }
                    }
                    None => {
                        println!("No status returned from get state request");
                        std::process::exit(1);
                    }
                };
            }
            Err(_error) => { 
                println!("Error getting state response");
                std::process::exit(1);
            }
        }
    }
    .boxed()
}

async fn event_publish_test(request_id: String, driver: bool) -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let net_addr = format!("http://{}", get_url(&args));
    let mut client = EventPublishClient::connect(net_addr.to_string()).await?;
    // localhost:9081/Corda_Network/test
    // {locationsegment}/{Network_id}/{query}
    // localhost:9081/Corda_Network/mychannel:simplestate:read:TestState
    let meta = Meta {
        proof_type: "abc".to_string(),
        protocol: meta::Protocol::Fabric as i32,
        serialization_format: "abc".to_string(),
        timestamp: "abc".to_string(),
    };
    let data: Vec<u8> = vec![104, 101, 108, 108, 111];
    let view = View {
        meta: Some(meta),
        data: data,
    };
    let view_payload = ViewPayload {
        request_id: request_id.to_string(),
        state: Some(view_payload::State::View(view)),
    };
    let view_payload_err = ViewPayload {
        request_id: request_id.to_string(),
        state: Some(view_payload::State::Error("mock error".to_string())),
    };
    
    let response = client.send_driver_state(view_payload.clone()).await?;
    if ack::Status::from_i32(response.get_ref().status).expect("No Valid Status") != ack::Status::Ok {
        println!("An error occurred in send driver state call {:?}", response.get_ref().message);
        std::process::exit(1);
    }
    
    sleep(time::Duration::from_millis(2000));
    
    let response_err = client.send_driver_state(view_payload_err.clone()).await?;
    if ack::Status::from_i32(response_err.get_ref().status).expect("No Valid Status") != ack::Status::Ok {
        println!("An error occurred in send driver state call {:?}", response.get_ref().message);
        std::process::exit(1);
    }
    
    sleep(time::Duration::from_millis(2000));
    
    let mut network_client = NetworkClient::connect(net_addr.to_string()).await?;
    let request = tonic::Request::new(GetStateMessage {
        request_id: request_id.to_string(),
    });
    
    // Check if states status are correct.
    let event_states_res = network_client.get_event_states(request).await;
    match event_states_res {
        Ok(response) => {
            let mut event_states = response.into_inner().states;
                println!("Received States: {:?}", event_states);
            let event_state = event_states.pop().expect("No State");
            let event_state_status = event_state.clone().state.expect("No RequestState").status;
            if driver {
                if request_state::Status::from_i32(event_state_status).expect("No Valid Status") != request_state::Status::EventWritten {
                    println!("Error: event not got written to ledger: {:?}", event_state.message.to_string());
                    std::process::exit(1);
                }
            } else {
                if request_state::Status::from_i32(event_state_status).expect("No Valid Status") != request_state::Status::EventReceived {
                    println!("Error: event status not correct: expected 4, received {:?}", event_state_status);
                    std::process::exit(1);
                }
            }
            let event_state_json = serde_json::to_string(&event_state.clone().state.expect("No RequestState").state);
            let view_payload_json = serde_json::to_string(&view_payload.clone().state);
            if  event_state_json.expect("stringify error") != view_payload_json.expect("stringify error") {
                println!("Error: event state different than what is send: \nExpected: {:?}, \nReceived: {:?}", event_state.state, view_payload.state);
                std::process::exit(1);
            }
            let event_state_err = event_states.pop().expect("No State");
            let event_state_err_status = event_state_err.clone().state.expect("No RequestState").status;
            if driver {
                if request_state::Status::from_i32(event_state_err_status.clone()).expect("No Valid Status") != request_state::Status::EventWriteError {
                    println!("Error: event status not correct: expected 6, received {:?}", event_state_err_status);
                    std::process::exit(1);
                }
            } else {
                if request_state::Status::from_i32(event_state_err_status.clone()).expect("No Valid Status") != request_state::Status::Error {
                    println!("Error: event status not correct: expected 2, received {:?}", event_state_err_status);
                    std::process::exit(1);
                }
            }
            let event_state_err_json = serde_json::to_string(&event_state_err.clone().state.expect("No RequestState").state);
            let view_payload_err_json = serde_json::to_string(&view_payload_err.clone().state);
            if event_state_err_json.expect("stringify error") != view_payload_err_json.expect("stringify error") {
                println!("Error: event state different than what is send: \nExpected: {:?}, \nReceived: {:?}", event_state_err.state, view_payload_err.state);
                std::process::exit(1);
            }
        },
        Err(error) => {
            println!("An error occurred while getting event states: {:?}.", error);
            std::process::exit(1);
        }
    }
    
    let request_2 = tonic::Request::new(GetStateMessage {
        request_id: request_id.to_string(),
    });
    // Check if states are deleted after first fetch.
    let event_states_res = network_client.get_event_states(request_2).await;
    match event_states_res {
        Ok(response) => {
            let mut event_states = response.into_inner().states;
            println!("Received States 2nd: {:?}", event_states);
            let event_state = event_states.pop().expect("No State");
            let event_state_status = event_state.state.expect("No RequestState").status;
            if request_state::Status::from_i32(event_state_status.clone()).expect("No Valid Status") != request_state::Status::Deleted {
                println!("Error: event status not correct: expected 7, received {:?}", event_state_status);
                std::process::exit(1);
            }
            let event_state_err = event_states.pop().expect("No State");
            let event_state_err_status = event_state_err.state.expect("No RequestState").status;
            if request_state::Status::from_i32(event_state_err_status.clone()).expect("No Valid Status") != request_state::Status::Deleted {
                println!("Error: event status not correct: expected 7, received {:?}", event_state_err_status);
                std::process::exit(1);
            }
        },
        Err(error) => {
            println!("An error occurred while getting event states: {:?}.", error);
            std::process::exit(1);
        }
    }
    
    Ok(())
}

