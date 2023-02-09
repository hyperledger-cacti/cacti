use serde::{de::DeserializeOwned, Serialize};
use sled::{open, IVec};

use crate::error::Error;
/// Struct for managing all db interactions
pub struct Database {
    pub db_path: String,
}

impl Database {
    pub fn set<T: Serialize>(&self, key: &String, value: &T) -> Result<Option<IVec>, Error> {
        let req_db = open(&self.db_path).unwrap();
        // serialises into binary to be stored in the db.
        let encoded_value: Vec<u8> = bincode::serialize(&value).unwrap();
        req_db
            .insert(format!("b{}", key), encoded_value)
            .map_err(|e| Error::SledError(e))
    }
    pub fn get<T: DeserializeOwned>(&self, key: String) -> Result<T, Error> {
        let req_db = open(&self.db_path).unwrap();
        let db_value = (req_db.get(format!("b{}", key))?)
            .ok_or_else(|| Error::Simple(format!("No value for key: {}", key)))?;
        let decoded_result: Result<T, Error> =
            bincode::deserialize(&db_value[..]).map_err(|e| Error::BincodeError(e));
        decoded_result
    }
    pub fn unset<T: DeserializeOwned>(&self, key: String) -> Result<T, Error> {
        let req_db = open(&self.db_path).unwrap();
        let db_value = (req_db.get(format!("b{}", key))?)
            .ok_or_else(|| Error::Simple(format!("No value for key: {}", key)))?;
        let decoded_result: Result<T, Error> =
            bincode::deserialize(&db_value[..]).map_err(|e| Error::BincodeError(e));
        req_db.remove(format!("b{}", key))?;
        decoded_result
    }
    pub fn has_key(&self, key: String) -> Result<bool, Error> {
        let req_db = open(&self.db_path).unwrap();
        let result = req_db.contains_key(format!("b{}", key))?;
        Ok(result)
    }
}
