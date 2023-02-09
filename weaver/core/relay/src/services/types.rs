use serde;

#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, Debug)]
pub struct Driver {
    pub port: String,
    pub hostname: String,
    pub tls: bool,
    pub tlsca_cert_path: String,
}

#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, Debug)]
pub struct Network {
    pub network: String,
}