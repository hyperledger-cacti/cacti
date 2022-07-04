use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env::set_var("OUT_DIR", "proto-rs/");
    // tonic_build::compile_protos("protos/relay/datatransfer.proto").unwrap();
    // tonic_build::compile_protos("protos/networks/networks.proto").unwrap();
    tonic_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile(
            &[
                "protos/relay/datatransfer.proto",
                "protos/relay/events.proto",
                "protos/networks/networks.proto",
                "protos/driver/driver.proto",
            ],
            &["protos"],
        )?;
    Ok(())
}
