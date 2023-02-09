pub mod relay {
    pub mod datatransfer {
        include!(concat!("./generated", "/relay.datatransfer.rs"));
    }
    pub mod events {
        include!(concat!("./generated", "/relay.events.rs"));
    }
}
pub mod networks {
    pub mod networks {
        include!(concat!("./generated", "/networks.networks.rs"));
    }
}
pub mod driver {
    pub mod driver {
        include!(concat!("./generated", "/driver.driver.rs"));
    }
}

pub mod common {
    pub mod ack {
        include!(concat!("./generated", "/common.ack.rs"));
    }
    pub mod state {
        include!(concat!("./generated", "/common.state.rs"));
    }
    pub mod query {
        include!(concat!("./generated", "/common.query.rs"));
    }
    pub mod events {
        include!(concat!("./generated", "/common.events.rs"));
    }
}
