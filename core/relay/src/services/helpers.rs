use crate::pb::common::events::{event_subscription_state, EventSubscriptionState};
use crate::db::Database;

// Locally scoped function to update request status in db. This function is
// called for the first time after an Ack is received from the remote relay.
// A locally created EventSubscriptionState with status PENDING or ERROR is stored.
// When a response is received from the remote relay it will write the
// returned EventSubscriptionState with status SUCCESS or ERROR.
pub fn update_event_subscription_status(
    curr_request_id: String,
    new_status: event_subscription_state::Status,
    curr_db_path: String,
    message: String,
) {
    let db = Database {
        db_path: curr_db_path,
    };
    let result = db.get::<EventSubscriptionState>(curr_request_id.clone());
    match result {
        Ok(event_subscription_state) => {

            let target: EventSubscriptionState = EventSubscriptionState {
                status: new_status as i32,
                request_id: curr_request_id.clone(),
                message: message.to_string(),
                event_matcher: event_subscription_state.event_matcher.clone(),
                event_publication_spec: event_subscription_state.event_publication_spec.clone(),
            };

            // Panic if this fails, atm the panic is just logged by the tokio runtime
            db.set(&curr_request_id, &target)
                .expect("Failed to insert into DB");
            println!("Successfully written EventSubscriptionState to database");
            println!("{:?}\n", db.get::<EventSubscriptionState>(curr_request_id).unwrap())

        },
        Err(e) => {
            println!("EventSubscription Request not found. Error: {:?}", e);
        },
    }
}