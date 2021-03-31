pub mod relay {
    pub mod datatransfer {
        include!(concat!("../proto-rs", "/relay.datatransfer.rs"));
    }
}
pub mod networks {
    pub mod networks {
        include!(concat!("../proto-rs", "/networks.networks.rs"));
    }
}
pub mod driver {
    pub mod driver {
        include!(concat!("../proto-rs", "/driver.driver.rs"));
    }
}

pub mod common {
    pub mod ack {
        include!(concat!("../proto-rs", "/common.ack.rs"));
    }
    pub mod state {
        include!(concat!("../proto-rs", "/common.state.rs"));
    }
    pub mod query {
        include!(concat!("../proto-rs", "/common.query.rs"));
    }
}
