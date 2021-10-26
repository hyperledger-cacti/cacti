#![allow(unused_qualifications)]

use crate::models;
#[cfg(any(feature = "client", feature = "server"))]
use crate::header;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct DeleteKeychainEntryRequestV1 {
    /// The key of the entry to delete from the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl DeleteKeychainEntryRequestV1 {
    pub fn new(key: String, ) -> DeleteKeychainEntryRequestV1 {
        DeleteKeychainEntryRequestV1 {
            key: key,
        }
    }
}

/// Converts the DeleteKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for DeleteKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a DeleteKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for DeleteKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing DeleteKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing DeleteKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(DeleteKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in DeleteKeychainEntryRequestV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<DeleteKeychainEntryRequestV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<DeleteKeychainEntryRequestV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<DeleteKeychainEntryRequestV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for DeleteKeychainEntryRequestV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<DeleteKeychainEntryRequestV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <DeleteKeychainEntryRequestV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into DeleteKeychainEntryRequestV1 - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct DeleteKeychainEntryResponseV1 {
    /// The key of the entry that was deleted from the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl DeleteKeychainEntryResponseV1 {
    pub fn new(key: String, ) -> DeleteKeychainEntryResponseV1 {
        DeleteKeychainEntryResponseV1 {
            key: key,
        }
    }
}

/// Converts the DeleteKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for DeleteKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a DeleteKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for DeleteKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing DeleteKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing DeleteKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(DeleteKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in DeleteKeychainEntryResponseV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<DeleteKeychainEntryResponseV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<DeleteKeychainEntryResponseV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<DeleteKeychainEntryResponseV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for DeleteKeychainEntryResponseV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<DeleteKeychainEntryResponseV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <DeleteKeychainEntryResponseV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into DeleteKeychainEntryResponseV1 - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct GetKeychainEntryRequest {
    /// The key for the entry to get from the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl GetKeychainEntryRequest {
    pub fn new(key: String, ) -> GetKeychainEntryRequest {
        GetKeychainEntryRequest {
            key: key,
        }
    }
}

/// Converts the GetKeychainEntryRequest value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for GetKeychainEntryRequest {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a GetKeychainEntryRequest value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for GetKeychainEntryRequest {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing GetKeychainEntryRequest".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing GetKeychainEntryRequest".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(GetKeychainEntryRequest {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in GetKeychainEntryRequest".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<GetKeychainEntryRequest> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<GetKeychainEntryRequest>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<GetKeychainEntryRequest>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for GetKeychainEntryRequest - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<GetKeychainEntryRequest> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <GetKeychainEntryRequest as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into GetKeychainEntryRequest - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct GetKeychainEntryResponse {
    /// The key that was used to retrieve the value from the keychain.
    #[serde(rename = "key")]
    pub key: String,

    /// The value associated with the requested key on the keychain.
    #[serde(rename = "value")]
    pub value: String,

}

impl GetKeychainEntryResponse {
    pub fn new(key: String, value: String, ) -> GetKeychainEntryResponse {
        GetKeychainEntryResponse {
            key: key,
            value: value,
        }
    }
}

/// Converts the GetKeychainEntryResponse value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for GetKeychainEntryResponse {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());


        params.push("value".to_string());
        params.push(self.value.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a GetKeychainEntryResponse value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for GetKeychainEntryResponse {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
            pub value: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing GetKeychainEntryResponse".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    "value" => intermediate_rep.value.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing GetKeychainEntryResponse".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(GetKeychainEntryResponse {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in GetKeychainEntryResponse".to_string())?,
            value: intermediate_rep.value.into_iter().next().ok_or("value missing in GetKeychainEntryResponse".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<GetKeychainEntryResponse> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<GetKeychainEntryResponse>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<GetKeychainEntryResponse>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for GetKeychainEntryResponse - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<GetKeychainEntryResponse> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <GetKeychainEntryResponse as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into GetKeychainEntryResponse - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct HasKeychainEntryRequestV1 {
    /// The key to check for presence in the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl HasKeychainEntryRequestV1 {
    pub fn new(key: String, ) -> HasKeychainEntryRequestV1 {
        HasKeychainEntryRequestV1 {
            key: key,
        }
    }
}

/// Converts the HasKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for HasKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a HasKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for HasKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing HasKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing HasKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(HasKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in HasKeychainEntryRequestV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<HasKeychainEntryRequestV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<HasKeychainEntryRequestV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<HasKeychainEntryRequestV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for HasKeychainEntryRequestV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<HasKeychainEntryRequestV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <HasKeychainEntryRequestV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into HasKeychainEntryRequestV1 - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct HasKeychainEntryResponseV1 {
    /// The key that was used to check the presence of the value in the keychain.
    #[serde(rename = "key")]
    pub key: String,

    /// Date and time encoded as JSON when the presence check was performed by the plugin backend.
    #[serde(rename = "checkedAt")]
    pub checked_at: String,

    /// The boolean true or false indicating the presence or absence of an entry under 'key'.
    #[serde(rename = "isPresent")]
    pub is_present: bool,

}

impl HasKeychainEntryResponseV1 {
    pub fn new(key: String, checked_at: String, is_present: bool, ) -> HasKeychainEntryResponseV1 {
        HasKeychainEntryResponseV1 {
            key: key,
            checked_at: checked_at,
            is_present: is_present,
        }
    }
}

/// Converts the HasKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for HasKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());


        params.push("checkedAt".to_string());
        params.push(self.checked_at.to_string());


        params.push("isPresent".to_string());
        params.push(self.is_present.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a HasKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for HasKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
            pub checked_at: Vec<String>,
            pub is_present: Vec<bool>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing HasKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    "checkedAt" => intermediate_rep.checked_at.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    "isPresent" => intermediate_rep.is_present.push(<bool as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing HasKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(HasKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in HasKeychainEntryResponseV1".to_string())?,
            checked_at: intermediate_rep.checked_at.into_iter().next().ok_or("checkedAt missing in HasKeychainEntryResponseV1".to_string())?,
            is_present: intermediate_rep.is_present.into_iter().next().ok_or("isPresent missing in HasKeychainEntryResponseV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<HasKeychainEntryResponseV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<HasKeychainEntryResponseV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<HasKeychainEntryResponseV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for HasKeychainEntryResponseV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<HasKeychainEntryResponseV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <HasKeychainEntryResponseV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into HasKeychainEntryResponseV1 - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, PartialOrd, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct PrometheusExporterMetricsResponse(String);

impl std::convert::From<String> for PrometheusExporterMetricsResponse {
    fn from(x: String) -> Self {
        PrometheusExporterMetricsResponse(x)
    }
}

impl std::string::ToString for PrometheusExporterMetricsResponse {
    fn to_string(&self) -> String {
       self.0.to_string()
    }
}

impl std::str::FromStr for PrometheusExporterMetricsResponse {
    type Err = std::string::ParseError;
    fn from_str(x: &str) -> std::result::Result<Self, Self::Err> {
        std::result::Result::Ok(PrometheusExporterMetricsResponse(x.to_string()))
    }
}

impl std::convert::From<PrometheusExporterMetricsResponse> for String {
    fn from(x: PrometheusExporterMetricsResponse) -> Self {
        x.0
    }
}

impl std::ops::Deref for PrometheusExporterMetricsResponse {
    type Target = String;
    fn deref(&self) -> &String {
        &self.0
    }
}

impl std::ops::DerefMut for PrometheusExporterMetricsResponse {
    fn deref_mut(&mut self) -> &mut String {
        &mut self.0
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct SetKeychainEntryRequest {
    /// The key for the entry to set on the keychain.
    #[serde(rename = "key")]
    pub key: String,

    /// The value that will be associated with the key on the keychain.
    #[serde(rename = "value")]
    pub value: String,

}

impl SetKeychainEntryRequest {
    pub fn new(key: String, value: String, ) -> SetKeychainEntryRequest {
        SetKeychainEntryRequest {
            key: key,
            value: value,
        }
    }
}

/// Converts the SetKeychainEntryRequest value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for SetKeychainEntryRequest {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());


        params.push("value".to_string());
        params.push(self.value.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a SetKeychainEntryRequest value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for SetKeychainEntryRequest {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
            pub value: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing SetKeychainEntryRequest".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    "value" => intermediate_rep.value.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing SetKeychainEntryRequest".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(SetKeychainEntryRequest {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in SetKeychainEntryRequest".to_string())?,
            value: intermediate_rep.value.into_iter().next().ok_or("value missing in SetKeychainEntryRequest".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<SetKeychainEntryRequest> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<SetKeychainEntryRequest>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<SetKeychainEntryRequest>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for SetKeychainEntryRequest - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<SetKeychainEntryRequest> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <SetKeychainEntryRequest as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into SetKeychainEntryRequest - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}


#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct SetKeychainEntryResponse {
    /// The key that was used to set the value on the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl SetKeychainEntryResponse {
    pub fn new(key: String, ) -> SetKeychainEntryResponse {
        SetKeychainEntryResponse {
            key: key,
        }
    }
}

/// Converts the SetKeychainEntryResponse value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for SetKeychainEntryResponse {
    fn to_string(&self) -> String {
        let mut params: Vec<String> = vec![];

        params.push("key".to_string());
        params.push(self.key.to_string());

        params.join(",").to_string()
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a SetKeychainEntryResponse value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for SetKeychainEntryResponse {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        #[derive(Default)]
        // An intermediate representation of the struct to use for parsing.
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',').into_iter();
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing SetKeychainEntryResponse".to_string())
            };

            if let Some(key) = key_result {
                match key {
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| format!("{}", x))?),
                    _ => return std::result::Result::Err("Unexpected key while parsing SetKeychainEntryResponse".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(SetKeychainEntryResponse {
            key: intermediate_rep.key.into_iter().next().ok_or("key missing in SetKeychainEntryResponse".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<SetKeychainEntryResponse> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<SetKeychainEntryResponse>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<SetKeychainEntryResponse>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for SetKeychainEntryResponse - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<SetKeychainEntryResponse> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <SetKeychainEntryResponse as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into SetKeychainEntryResponse - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}

