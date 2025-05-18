use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env::set_var("OUT_DIR", "./src/main/rust/generated/proto-rs/");
    // tonic_build::compile_protos("protos/relay/datatransfer.proto").unwrap();
    // tonic_build::compile_protos("protos/networks/networks.proto").unwrap();
    tonic_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile(
            &[
                "./src/main/proto/weaver/common/protos/relay/datatransfer.proto",
                "./src/main/proto/weaver/common/protos/networks/networks.proto",
                "./src/main/proto/weaver/common/protos/driver/driver.proto",
            ],
            &[
                "./src/main/proto/weaver/common/protos/",
            ],
        )?;
    Ok(())
}
