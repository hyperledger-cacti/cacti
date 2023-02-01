mod relay_proto;
use weaverpb::networks::networks::{network_client::NetworkClient, NetworkQuery};
use relay_proto::get_url;
use std::env;

use tonic::transport::{Certificate, Channel, ClientTlsConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let pem = tokio::fs::read("credentials/fabric_ca_cert.pem").await?;
    let ca = Certificate::from_pem(pem);

    let tls = ClientTlsConfig::new()
        .ca_certificate(ca)
        .domain_name("example.com");
    let net_addr = format!("http://{}", get_url(&args));

    let channel = Channel::from_shared(net_addr)?
        .tls_config(tls)
        .connect()
        .await?;

    let mut network_client = NetworkClient::new(channel);
    let request = tonic::Request::new(NetworkQuery {
        policy: vec!["test".to_string()],
        address: args[2].to_string(),
        requesting_org: "".to_string(),
        requesting_relay: "".to_string(),
        requesting_network: "".to_string(),
        certificate: "test".to_string(),
        requestor_signature: "test".to_string(),
        nonce: "test".to_string(),
        confidential: false,
    });
    let response = network_client.request_state(request).await?;
    println!("RESPONSE={:?}", response);

    Ok(())
}
