use crate::error::Error;
use std::str::FromStr;

pub fn init_logger_env() -> Result<(), Error> {
    simple_logger::init_with_env().map_err(|e| Error::Logger(e.to_string()))
}
