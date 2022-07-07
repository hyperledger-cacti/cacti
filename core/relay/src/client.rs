mod pb;
mod relay_proto;
use futures::future::{BoxFuture, FutureExt};
use pb::common::ack::ack;
use pb::common::state::request_state;
use pb::common::events::{event_subscription_state, EventType, EventMatcher, EventPublication, event_publication};
use pb::networks::networks::{network_client::NetworkClient, GetStateMessage, NetworkQuery, NetworkEventSubscription};
use relay_proto::get_url;
use std::env;
use std::thread::sleep;
use std::time;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    datasharing().await?;
    event_suscribe().await?;
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
            ack::Status::Error => println!("An error occurred in request_state call"),
        },
        None => println!("The returned Ack has no status"),
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
                        }
                    }
                    None => println!("No status returned from get state request"),
                };
            }
            Err(error) => println!("Error getting state response"),
        }
    }
    .boxed()
}


async fn event_suscribe() -> Result<(), Box<dyn std::error::Error>> {
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
    let tmp = event_publication::PublicationTarget::AppUrl("abc".to_string());
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
                poll_for_event_subscription(request_id.to_string(), network_client).await;
                println!("Event Subscription: Success!");
            }
            ack::Status::Error => println!("An error occurred in suscribe_event call"),
        },
        None => println!("The returned Ack has no status"),
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
                        if request_status == event_subscription_state::Status::Pending {
                            poll_for_event_subscription(request_id, network_client).await;
                        }
                    }
                    None => println!("No status returned from get state request"),
                };
            }
            Err(error) => println!("Error getting state response"),
        }
    }
    .boxed()
}

