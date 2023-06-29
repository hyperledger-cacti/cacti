mod relay_proto;
use futures::future::{BoxFuture, FutureExt};
use weaverpb::common::ack::ack;
use weaverpb::common::state::{request_state, view_payload, ViewPayload, View, Meta, meta};
use weaverpb::common::events::{event_subscription_state, EventMatcher, EventPublication, event_publication, ContractTransaction};
use weaverpb::relay::events::{event_publish_client::EventPublishClient};
use weaverpb::networks::networks::{network_client::NetworkClient, GetStateMessage, NetworkQuery, NetworkEventSubscription, NetworkEventUnsubscription};
use relay_proto::get_url;
use std::env;
use std::thread::sleep;
use std::time;
use serde_json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\nAsset Transfer Test");
    asset_transfer().await?;
    Ok(())
}

async fn asset_transfer() -> Result<(), Box<dyn std::error::Error>> {
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
    let response = network_client.request_asset_transfer(request).await?;
    println!("RESPONSE={:?}", response);

    match ack::Status::from_i32(response.get_ref().status) {
        Some(ack_status) => match ack_status {
            ack::Status::Ok => {
                //poll_for_asset_state(request_id.to_string(), network_client, 0).await;
                println!("Asset Transfer: Success!");
            }
            ack::Status::Error => {
                println!("An error occurred in request_asset_transfer call");
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
