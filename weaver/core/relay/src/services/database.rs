use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::error::Error;

const SQLITE_DATABASE_FILE: &str = "gateway_log.db"; // Define a constant for the database filename

// Define a Log struct that represents a log entry
pub struct Log {
    pub timestamp: String,
    pub request_id: String,
    pub request: String,
    pub step_id: String,
    pub operation: Operation,
    pub network_id: String,
    pub gateway_id: String,
    pub received: bool,
    pub details: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    Init,
    Exec,
    Done,
    Failed,
}

impl std::string::ToString for Operation {
    fn to_string(&self) -> String {
        match self {
            Operation::Init => "Init".to_string(),
            Operation::Exec => "Exec".to_string(),
            Operation::Done => "Done".to_string(),
            Operation::Failed => "Failed".to_string(),
        }
    }
}

pub trait Database {
    fn log(&self, log: &Log) -> Result<(), Box<dyn Error>>;
}

pub struct SqliteDatabase;

impl SqliteDatabase {
    fn create_logs_table(&self) -> Result<(), Box<dyn Error>> {
        // Open a connection to the SQLite database file
        let conn = Connection::open(SQLITE_DATABASE_FILE)?; // Replace "log.db" with your database file

        // Create a table to store log entries if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS logs (
                 id INTEGER PRIMARY KEY,
                 timestamp TEXT,
                 request_id TEXT,
                 request TEXT,
                 step_id TEXT,
                 operation TEXT,
                 network_id TEXT,
                 gateway_id TEXT,
                 received TEXT,
                 details TEXT
             )",
            params![],
        )?;

        Ok(())
    }
}

impl Database for SqliteDatabase {
    fn log(&self, log: &Log) -> Result<(), Box<dyn Error>> {
        // Ensure the logs table exists
        self.create_logs_table()?;

        // Open a connection to the SQLite database file
        let conn = Connection::open(SQLITE_DATABASE_FILE)?;

        // Insert the log entry into the database
        conn.execute(
            "INSERT INTO logs (timestamp, request_id, request, step_id, operation, network_id, gateway_id, received, details)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            &[&log.timestamp, &log.request_id, &log.request, &log.step_id, &log.operation.to_string(), &log.network_id, &log.gateway_id,  &(if log.received { "1".to_string() } else { "0".to_string() }), &log.details.as_ref().unwrap_or(&"".to_string())]
        )?;

        Ok(())
    }
}

pub struct PostgresDatabase;

impl Database for PostgresDatabase {
    fn log(&self, log: &Log) -> Result<(), Box<dyn Error>> {
        // TODO: Implement the logging logic for PostgreSQL
        Ok(())
    }
}
