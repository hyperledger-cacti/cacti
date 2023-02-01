/// Custom error type for handling various external library errors.
/// the 'From' trait is converting different error types into our Custom error type automatically
/// when using the ? operator
#[derive(Debug)]
pub enum Error {
    LoadError(std::io::Error),
    BincodeError(bincode::Error),
    Simple(String),
    GetQuery(String),
    TransportError(tonic::transport::Error),
    StatusError(tonic::Status),
    SledError(sled::Error),
    ConfigError(config::ConfigError),
    ReqwestError(reqwest::Error),
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Error::LoadError(e)
    }
}
impl From<config::ConfigError> for Error {
    fn from(e: config::ConfigError) -> Self {
        Error::ConfigError(e)
    }
}
impl From<sled::Error> for Error {
    fn from(e: sled::Error) -> Self {
        Error::SledError(e)
    }
}

impl From<bincode::Error> for Error {
    fn from(e: bincode::Error) -> Self {
        Error::BincodeError(e)
    }
}

impl From<tonic::transport::Error> for Error {
    fn from(e: tonic::transport::Error) -> Self {
        Error::TransportError(e)
    }
}

impl From<tonic::Status> for Error {
    fn from(e: tonic::Status) -> Self {
        Error::StatusError(e)
    }
}

impl From<reqwest::Error> for Error {
    fn from(e: reqwest::Error) -> Self {
        Error::ReqwestError(e)
    }
}
