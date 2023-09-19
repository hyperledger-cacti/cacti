// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

use serde::{de::DeserializeOwned, Serialize};
use sled::{Db, open, IVec};
use std::thread::sleep;
use std::time;

use crate::error::Error;
/// Struct for managing all db interactions
pub struct Database {
    pub db_path: String,
    pub db_open_max_retries: u32,
    pub db_open_retry_backoff_msec: u32,
}

impl Database {
    pub fn open_db(&self, retry: u32) -> Result<Db, Error> {
        let req_db_result = open(&self.db_path);
        match req_db_result {
            Ok(db) => Ok(db),
            Err(error) => {
                if retry.clone() >= self.db_open_max_retries.clone() {
                    println!("Db open error: {:?}", error);
                    return Err(Error::SledError(error));
                }
                let retry_error = "Resource temporarily unavailable";
                return match error.to_string().find(retry_error) {
                    Some(_index) => {
                        println!("Db locked temporarily with error: {:?}", error.to_string());
                        sleep(time::Duration::from_millis(self.db_open_retry_backoff_msec.clone() as u64));
                        println!("Retrying DB open attempt #{:?}...", retry.clone()+1);
                        let db_result = self.open_db(retry+1);
                        db_result
                    },
                    None => Err(Error::SledError(error))
                }
            }
        }
    }
    pub fn set<T: Serialize>(&self, key: &String, value: &T) -> Result<Option<IVec>, Error> {
        let req_db = self.open_db(0)?;
        // serialises into binary to be stored in the db.
        let encoded_value: Vec<u8> = bincode::serialize(&value).unwrap();
        req_db
            .insert(format!("b{}", key), encoded_value)
            .map_err(|e| Error::SledError(e))
    }
    pub fn get<T: DeserializeOwned>(&self, key: String) -> Result<T, Error> {
        let req_db = self.open_db(0)?;
        let db_value = (req_db.get(format!("b{}", key))?)
            .ok_or_else(|| Error::Simple(format!("No value for key: {}", key)))?;
        let decoded_result: Result<T, Error> =
            bincode::deserialize(&db_value[..]).map_err(|e| Error::BincodeError(e));
        decoded_result
    }
    pub fn unset<T: DeserializeOwned>(&self, key: String) -> Result<T, Error> {
        let req_db = self.open_db(0)?;
        let db_value = (req_db.get(format!("b{}", key))?)
            .ok_or_else(|| Error::Simple(format!("No value for key: {}", key)))?;
        let decoded_result: Result<T, Error> =
            bincode::deserialize(&db_value[..]).map_err(|e| Error::BincodeError(e));
        req_db.remove(format!("b{}", key))?;
        decoded_result
    }
    pub fn has_key(&self, key: String) -> Result<bool, Error> {
        let req_db = self.open_db(0)?;
        let result = req_db.contains_key(format!("b{}", key))?;
        Ok(result)
    }
}
