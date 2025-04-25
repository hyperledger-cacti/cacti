use std::env;
use tonic_build::configure;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env::set_var("OUT_DIR", "./src/main/rust/generated/proto-rs/");

    configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile_protos(
            &[
                "./src/main/proto/weaver/common/protos/relay/datatransfer.proto",
                "./src/main/proto/weaver/common/protos/networks/networks.proto",
                "./src/main/proto/weaver/common/protos/driver/driver.proto",
            ],
            &["./src/main/proto/weaver/common/protos/"],
        )?;

    Ok(())
}
