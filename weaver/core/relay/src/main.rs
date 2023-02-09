// Internal generated modules
use weaverpb::networks::networks::network_server::NetworkServer;
use weaverpb::relay::datatransfer::data_transfer_server::DataTransferServer;
use weaverpb::relay::events::event_subscribe_server::EventSubscribeServer;
use weaverpb::relay::events::event_publish_server::EventPublishServer;

// Internal modules
use services::data_transfer_service::DataTransferService;
use services::event_subscribe_service::EventSubscribeService;
use services::event_publish_service::EventPublishService;
use services::network_service::NetworkService;

// External modules
use config;
use std::env;
use std::net::SocketAddr;
use std::net::ToSocketAddrs;
use tokio::sync::RwLock;
use tonic::transport::{Identity, Server, ServerTlsConfig};

mod db;
mod error;
mod relay_proto;
mod services;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

    let relay_name = settings.get_str("name").expect("No Relay name provided");
    println!("Relay Name: {:?}", relay_name);
    let relay_port = settings.get_str("port").expect(&format!("Port does not exist for relay name {}. Make sure the config file <{}> has the name and port specified.", relay_name, config_file_name.to_string()));
    let host = settings.get_str("hostname").unwrap_or("localhost".to_string());

    let with_tls = settings.get_bool("tls").unwrap_or(false);
    // Converts port to a valid socket address
    let addr: SocketAddr = format!("{}:{}", host, relay_port)
        .to_socket_addrs()?
        .next()
        .expect("Port number is potentially invalid. Unable to create SocketAddr");

    let relay = DataTransferService {
        config_lock: RwLock::new(settings.clone()),
    };
    let event_subscribe = EventSubscribeService {
        config_lock: RwLock::new(settings.clone()),
    };
    let event_publish = EventPublishService {
        config_lock: RwLock::new(settings.clone()),
    };
    let network = NetworkService {
        config_lock: RwLock::new(settings.clone()),
    };
    println!("RelayServer listening on {}", addr);
    if with_tls == true {
        println!("Starting Server with TLS");
        let cert = tokio::fs::read(settings.get_str("cert_path").unwrap()).await?;
        let key = tokio::fs::read(settings.get_str("key_path").unwrap()).await?;
        let identity = Identity::from_pem(cert, key);
        // Spins up two gRPC services in a tonic server. One for relay to relay and one for network to relay communication.
        let server = Server::builder()
            .tls_config(ServerTlsConfig::new().identity(identity))
            .add_service(DataTransferServer::new(relay))
            .add_service(EventSubscribeServer::new(event_subscribe))
            .add_service(EventPublishServer::new(event_publish))
            .add_service(NetworkServer::new(network));
        server.serve(addr).await?;
    } else {
        // Spins up two gRPC services in a tonic server. One for relay to relay and one for network to relay communication.
        let server = Server::builder()
            .add_service(DataTransferServer::new(relay))
            .add_service(EventSubscribeServer::new(event_subscribe))
            .add_service(EventPublishServer::new(event_publish))
            .add_service(NetworkServer::new(network));
        server.serve(addr).await?;
    }
    Ok(())
}
