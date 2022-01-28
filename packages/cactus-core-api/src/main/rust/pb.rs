pub mod relay {
    pub mod datatransfer {
        include!(concat!("./generated/proto-rs", "/relay.datatransfer.rs"));
    }
}
pub mod networks {
    pub mod networks {
        include!(concat!("./generated/proto-rs", "/networks.networks.rs"));
    }
}
pub mod driver {
    pub mod driver {
        include!(concat!("./generated/proto-rs", "/driver.driver.rs"));
    }
}

pub mod common {
    pub mod ack {
        include!(concat!("./generated/proto-rs", "/common.ack.rs"));
    }
    pub mod state {
        include!(concat!("./generated/proto-rs", "/common.state.rs"));
    }
    pub mod query {
        include!(concat!("./generated/proto-rs", "/common.query.rs"));
    }
}
