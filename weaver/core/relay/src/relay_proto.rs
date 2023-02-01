use std::io::{Error, ErrorKind};

#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize, PartialOrd, Debug)]
pub struct LocationSegment {
    pub hostname: String,
    pub port: String,
    pub tls: bool,
    pub tlsca_cert_path: String,
}

#[derive(PartialEq, PartialOrd, Debug)]
pub struct Address {
    pub location: LocationSegment,
    pub view: String,
    pub network_id: String,
}

#[allow(dead_code)]
pub fn parse_address(address: String) -> Result<Address, Error> {
    println!("Address to be parsed: {}", address);
    let v: Vec<&str> = address.split('/').collect();
    if v.len() != 3 {
        return Err(Error::new(
            ErrorKind::InvalidData,
            "Invalid Address Format".to_string(),
        ));
    }
    Ok(Address {
        location: parse_location(v[0].to_string())?,
        network_id: v[1].to_string(),
        view: v[2].to_string(),
    })
}

#[allow(dead_code)]
fn parse_location(location: String) -> Result<LocationSegment, Error> {
    let v: Vec<&str> = location.split(":").collect();
    if v.len() != 2 {
        return Err(Error::new(
            ErrorKind::InvalidData,
            "Invalid Location Format".to_string(),
        ));
    }
    Ok(LocationSegment {
        hostname: v[0].to_string(),
        port: v[1].to_string(),
        tls: false,
        tlsca_cert_path: "".to_string(),
    })
}

#[allow(dead_code)]
pub fn get_url(args: &[String]) -> String {
    let port = if args.len() >= 2 {
        args[1].clone()
    } else {
        "50051".to_string()
    };
    return format!("localhost:{}", port);
}

#[cfg(test)]
mod tests {
    // import all modules from parent module
    use super::*;

    #[test]
    fn handle_response() {}
    #[test]
    fn handle_parse() {
        assert_eq!(
            parse_address("localhost:8080/Corda_Relay/myChannel:read:TestState".to_string())
                .unwrap(),
            Address {
                network_id: "Corda_Relay".to_string(),
                view: "myChannel:read:TestState".to_string(),
                location: LocationSegment {
                    hostname: "localhost".to_string(),
                    port: "8080".to_string(),
                    tls: false,
                    tlsca_cert_path: "".to_string(),
                },
            }
        );
        assert_eq!(
            parse_address("marcopolo-res-dlt-interop.sl.cloud9.ibm.com:9081/americantfn/localhost:10006;localhost:10008#com.marcopolo.app.flows.GetBLByTxId:PO51849368".to_string()).unwrap(),
            Address {
                network_id: "americantfn".to_string(),
                view: "localhost:10006;localhost:10008#com.marcopolo.app.flows.GetBLByTxId:PO51849368".to_string(),
                location: LocationSegment {
                    hostname: "marcopolo-res-dlt-interop.sl.cloud9.ibm.com".to_string(),
                    port: "9081".to_string(),
                    tls: false,
                    tlsca_cert_path: "".to_string(),
                },
            }
        );

        let result = parse_address("Corda_Relay:Fabric".to_string()).map_err(|e| e.kind());
        let expected = Err(ErrorKind::InvalidData);
        assert_eq!(expected, result);
    }
}
