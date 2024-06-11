// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0

use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env::set_var("OUT_DIR", "./pkg/src/generated/");
    tonic_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile(
            &[
                "../protos/relay/datatransfer.proto",
                "../protos/relay/satp.proto",
                "../protos/relay/events.proto",
                "../protos/networks/networks.proto",
                "../protos/driver/driver.proto",
            ],
            &[
                "../protos/",
            ],
        )?;
    Ok(())
}
