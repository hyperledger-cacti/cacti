mod relay_proto;
use relay_proto::{get_url, LocationSegment};
use std::env;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;
use weaverpb::common::ack::ack;
use weaverpb::networks::networks::{network_client::NetworkClient, NetworkAssetTransfer};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\nAsset Transfer Test");
    asset_transfer().await?;
    Ok(())
}

async fn asset_transfer() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 11 {
        println!("Need exactly 10 arguments <local_relay_name, local_network, asset_type, asset_id, sender, source_contract_id, destination_relay_name, destination_network, recipient, destination_contract_id>; supplied {:?}", args.len());
        std::process::exit(1);
    }
    // Get local relay info
    let local_relay_filename = format!("config/{}.toml", args[1].to_string());
    let mut settings = config::Config::default();
    settings
        .merge(config::File::with_name(&local_relay_filename))
        .unwrap();
    let local_relay_host = settings
        .get_str("hostname")
        .unwrap_or("localhost".to_string());
    let local_relay_name = settings.get_str("name").expect("No Relay name provided");
    println!("Relay Name: {:?}", local_relay_name);
    let local_relay_port = settings.get_str("port").expect(&format!("Port does not exist for relay name {}. Make sure the config file <{}> has the name and port specified.", local_relay_name, local_relay_filename.to_string()));
    let local_relay = format!("{}:{}", local_relay_host, local_relay_port);
    // Get destination relay info
    let relays_table = settings.get_table("relays")?;
    let relay_uri = relays_table
        .get(&args[8].to_string())
        .ok_or("Relay name not found")?;
    let uri = relay_uri.clone().try_into::<LocationSegment>()?;
    let dest_relay = format!("{}:{}", uri.hostname.to_string(), uri.port.to_string());
    let net_addr = format!("http://{}", local_relay);
    let request = tonic::Request::new(NetworkAssetTransfer {
        asset_type: args[3].to_string(),
        asset_id: args[4].to_string(),
        sender: args[5].to_string(),
        source_contract_id: args[6].to_string(),
        source_relay: local_relay,
        source_network: args[2].to_string(),
        destination_relay: dest_relay,
        destination_network: args[7].to_string(),
        recipient: args[9].to_string(),
        destination_contract_id: args[10].to_string(),
    });
    // TODO: Write the asset info to a file the Fabric drivers can access
    //       This is a hack; we need to pass this info via stateless API calls
    //       This won't work in Docker mode (none of the sample SATP code does)
    let asset_info_path = Path::new("../drivers/fabric-driver/satp_info.txt");
    let display = asset_info_path.display();
    let mut asset_info_file = match File::create(&asset_info_path) {
        Err(e) => panic!("Unable to create asset info file {} for Fabric driver: {}", display, e),
        Ok(file) => file,
    };
    let asset_info = format!("{}:{}", args[3].to_string(), args[4].to_string());
    match asset_info_file.write_all(asset_info.as_bytes()) {
        Err(e) => panic!("Unable to write asset info {} to {}: {}", asset_info, display, e),
        Ok(_) => (),
    }

    let mut network_client = NetworkClient::connect(net_addr).await?;
    let response = network_client.request_asset_transfer(request).await?;
    println!("RESPONSE FROM RELAY SERVER = {:?}", response);

    match ack::Status::from_i32(response.get_ref().status) {
        Some(ack_status) => match ack_status {
            ack::Status::Ok => {
                // TODO poll for asset transfer status
                println!("Asset transfer request submitted successfully!");
            }
            ack::Status::Error => {
                println!("An error occurred while submitting an asset transfer request!");
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
