use log::{Log, Metadata, Record};
use rusqlite::Connection;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize)]
pub struct LogEntry {
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

impl std::fmt::Display for Operation {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Operation::Init => write!(f, "Init"),
            Operation::Exec => write!(f, "Exec"),
            Operation::Done => write!(f, "Done"),
            Operation::Failed => write!(f, "Failed"),
        }
    }
}

impl std::fmt::Display for LogEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        let json_str = serde_json::to_string(self).expect("Failed to serialize LogEntry to JSON");
        write!(f, "{}", json_str)
    }
}

pub(crate) struct DbLogger {
    conn: Mutex<Connection>,
}

impl DbLogger {
    pub fn new(database_path: &str) -> Self {
        let conn = Connection::open(database_path).expect("Failed to open database");
        DbLogger {
            conn: Mutex::new(conn),
        }
    }
}

impl Log for DbLogger {
    fn enabled(&self, _metadata: &Metadata) -> bool {
        true
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let conn = self.conn.lock().unwrap();

            if let Ok(log_entry) = serde_json::from_str::<LogEntry>(&record.args().to_string()) {
                let mut details = "".to_string();
                if let Some(d) = log_entry.details.as_ref() {
                    details = d.to_string();
                }

                conn.execute(
                    "INSERT INTO log_entries (debug_level, timestamp, request_id, request, step_id, operation, gateway_id, received, details) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    &[
                        &record.level().to_string(),          // Log level
                        &format!("{}", chrono::Local::now()), // Timestamp
                        &log_entry.request_id,           
                        &log_entry.request,           
                        &log_entry.step_id,           
                        &log_entry.operation.to_string(),           
                        &log_entry.gateway_id,           
                        &log_entry.received.to_string(),           
                        &details,
                    ],
                )
                .expect("Failed to insert log entry");
                
            }
        }
    }

    fn flush(&self) {}
}

