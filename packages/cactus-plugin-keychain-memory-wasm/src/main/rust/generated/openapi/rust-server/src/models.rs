#![allow(unused_qualifications)]

use crate::models;
#[cfg(any(feature = "client", feature = "server"))]
use crate::header;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "conversion", derive(frunk::LabelledGeneric))]
pub struct DeleteKeychainEntryRequestV1 {
    /// The key for the entry to check the presence of on the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl DeleteKeychainEntryRequestV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, ) -> DeleteKeychainEntryRequestV1 {
        DeleteKeychainEntryRequestV1 {
            key,
        }
    }
}

/// Converts the DeleteKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for DeleteKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a DeleteKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for DeleteKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing DeleteKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing DeleteKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(DeleteKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in DeleteKeychainEntryRequestV1".to_string())?,
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
    /// The key that was deleted from the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl DeleteKeychainEntryResponseV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, ) -> DeleteKeychainEntryResponseV1 {
        DeleteKeychainEntryResponseV1 {
            key,
        }
    }
}

/// Converts the DeleteKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for DeleteKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a DeleteKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for DeleteKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing DeleteKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing DeleteKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(DeleteKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in DeleteKeychainEntryResponseV1".to_string())?,
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
pub struct GetKeychainEntryRequestV1 {
    /// The key for the entry to get from the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl GetKeychainEntryRequestV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, ) -> GetKeychainEntryRequestV1 {
        GetKeychainEntryRequestV1 {
            key,
        }
    }
}

/// Converts the GetKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for GetKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a GetKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for GetKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing GetKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing GetKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(GetKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in GetKeychainEntryRequestV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<GetKeychainEntryRequestV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<GetKeychainEntryRequestV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<GetKeychainEntryRequestV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for GetKeychainEntryRequestV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<GetKeychainEntryRequestV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <GetKeychainEntryRequestV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into GetKeychainEntryRequestV1 - {}",
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
pub struct GetKeychainEntryResponseV1 {
    /// The key that was used to retrieve the value from the keychain.
    #[serde(rename = "key")]
    pub key: String,

    /// The value associated with the requested key on the keychain.
    #[serde(rename = "value")]
    pub value: String,

}

impl GetKeychainEntryResponseV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, value: String, ) -> GetKeychainEntryResponseV1 {
        GetKeychainEntryResponseV1 {
            key,
            value,
        }
    }
}

/// Converts the GetKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for GetKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),


            Some("value".to_string()),
            Some(self.value.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a GetKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for GetKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
            pub value: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing GetKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    #[allow(clippy::redundant_clone)]
                    "value" => intermediate_rep.value.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing GetKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(GetKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in GetKeychainEntryResponseV1".to_string())?,
            value: intermediate_rep.value.into_iter().next().ok_or_else(|| "value missing in GetKeychainEntryResponseV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<GetKeychainEntryResponseV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<GetKeychainEntryResponseV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<GetKeychainEntryResponseV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for GetKeychainEntryResponseV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<GetKeychainEntryResponseV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <GetKeychainEntryResponseV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into GetKeychainEntryResponseV1 - {}",
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
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, ) -> HasKeychainEntryRequestV1 {
        HasKeychainEntryRequestV1 {
            key,
        }
    }
}

/// Converts the HasKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for HasKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a HasKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for HasKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing HasKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing HasKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(HasKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in HasKeychainEntryRequestV1".to_string())?,
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
    /// The key that was used to check the presence of the value in the entry store.
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
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, checked_at: String, is_present: bool, ) -> HasKeychainEntryResponseV1 {
        HasKeychainEntryResponseV1 {
            key,
            checked_at,
            is_present,
        }
    }
}

/// Converts the HasKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for HasKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),


            Some("checkedAt".to_string()),
            Some(self.checked_at.to_string()),


            Some("isPresent".to_string()),
            Some(self.is_present.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a HasKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for HasKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
            pub checked_at: Vec<String>,
            pub is_present: Vec<bool>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing HasKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    #[allow(clippy::redundant_clone)]
                    "checkedAt" => intermediate_rep.checked_at.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    #[allow(clippy::redundant_clone)]
                    "isPresent" => intermediate_rep.is_present.push(<bool as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing HasKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(HasKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in HasKeychainEntryResponseV1".to_string())?,
            checked_at: intermediate_rep.checked_at.into_iter().next().ok_or_else(|| "checkedAt missing in HasKeychainEntryResponseV1".to_string())?,
            is_present: intermediate_rep.is_present.into_iter().next().ok_or_else(|| "isPresent missing in HasKeychainEntryResponseV1".to_string())?,
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
pub struct SetKeychainEntryRequestV1 {
    /// The key for the entry to set on the keychain.
    #[serde(rename = "key")]
    pub key: String,

    /// The value that will be associated with the key on the keychain.
    #[serde(rename = "value")]
    pub value: String,

}

impl SetKeychainEntryRequestV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, value: String, ) -> SetKeychainEntryRequestV1 {
        SetKeychainEntryRequestV1 {
            key,
            value,
        }
    }
}

/// Converts the SetKeychainEntryRequestV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for SetKeychainEntryRequestV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),


            Some("value".to_string()),
            Some(self.value.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a SetKeychainEntryRequestV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for SetKeychainEntryRequestV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
            pub value: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing SetKeychainEntryRequestV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    #[allow(clippy::redundant_clone)]
                    "value" => intermediate_rep.value.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing SetKeychainEntryRequestV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(SetKeychainEntryRequestV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in SetKeychainEntryRequestV1".to_string())?,
            value: intermediate_rep.value.into_iter().next().ok_or_else(|| "value missing in SetKeychainEntryRequestV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<SetKeychainEntryRequestV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<SetKeychainEntryRequestV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<SetKeychainEntryRequestV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for SetKeychainEntryRequestV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<SetKeychainEntryRequestV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <SetKeychainEntryRequestV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into SetKeychainEntryRequestV1 - {}",
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
pub struct SetKeychainEntryResponseV1 {
    /// The key that was used to set the value on the keychain.
    #[serde(rename = "key")]
    pub key: String,

}

impl SetKeychainEntryResponseV1 {
    #[allow(clippy::new_without_default)]
    pub fn new(key: String, ) -> SetKeychainEntryResponseV1 {
        SetKeychainEntryResponseV1 {
            key,
        }
    }
}

/// Converts the SetKeychainEntryResponseV1 value to the Query Parameters representation (style=form, explode=false)
/// specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde serializer
impl std::string::ToString for SetKeychainEntryResponseV1 {
    fn to_string(&self) -> String {
        let params: Vec<Option<String>> = vec![

            Some("key".to_string()),
            Some(self.key.to_string()),

        ];

        params.into_iter().flatten().collect::<Vec<_>>().join(",")
    }
}

/// Converts Query Parameters representation (style=form, explode=false) to a SetKeychainEntryResponseV1 value
/// as specified in https://swagger.io/docs/specification/serialization/
/// Should be implemented in a serde deserializer
impl std::str::FromStr for SetKeychainEntryResponseV1 {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        /// An intermediate representation of the struct to use for parsing.
        #[derive(Default)]
        #[allow(dead_code)]
        struct IntermediateRep {
            pub key: Vec<String>,
        }

        let mut intermediate_rep = IntermediateRep::default();

        // Parse into intermediate representation
        let mut string_iter = s.split(',');
        let mut key_result = string_iter.next();

        while key_result.is_some() {
            let val = match string_iter.next() {
                Some(x) => x,
                None => return std::result::Result::Err("Missing value while parsing SetKeychainEntryResponseV1".to_string())
            };

            if let Some(key) = key_result {
                #[allow(clippy::match_single_binding)]
                match key {
                    #[allow(clippy::redundant_clone)]
                    "key" => intermediate_rep.key.push(<String as std::str::FromStr>::from_str(val).map_err(|x| x.to_string())?),
                    _ => return std::result::Result::Err("Unexpected key while parsing SetKeychainEntryResponseV1".to_string())
                }
            }

            // Get the next key
            key_result = string_iter.next();
        }

        // Use the intermediate representation to return the struct
        std::result::Result::Ok(SetKeychainEntryResponseV1 {
            key: intermediate_rep.key.into_iter().next().ok_or_else(|| "key missing in SetKeychainEntryResponseV1".to_string())?,
        })
    }
}

// Methods for converting between header::IntoHeaderValue<SetKeychainEntryResponseV1> and hyper::header::HeaderValue

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<header::IntoHeaderValue<SetKeychainEntryResponseV1>> for hyper::header::HeaderValue {
    type Error = String;

    fn try_from(hdr_value: header::IntoHeaderValue<SetKeychainEntryResponseV1>) -> std::result::Result<Self, Self::Error> {
        let hdr_value = hdr_value.to_string();
        match hyper::header::HeaderValue::from_str(&hdr_value) {
             std::result::Result::Ok(value) => std::result::Result::Ok(value),
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Invalid header value for SetKeychainEntryResponseV1 - value: {} is invalid {}",
                     hdr_value, e))
        }
    }
}

#[cfg(any(feature = "client", feature = "server"))]
impl std::convert::TryFrom<hyper::header::HeaderValue> for header::IntoHeaderValue<SetKeychainEntryResponseV1> {
    type Error = String;

    fn try_from(hdr_value: hyper::header::HeaderValue) -> std::result::Result<Self, Self::Error> {
        match hdr_value.to_str() {
             std::result::Result::Ok(value) => {
                    match <SetKeychainEntryResponseV1 as std::str::FromStr>::from_str(value) {
                        std::result::Result::Ok(value) => std::result::Result::Ok(header::IntoHeaderValue(value)),
                        std::result::Result::Err(err) => std::result::Result::Err(
                            format!("Unable to convert header value '{}' into SetKeychainEntryResponseV1 - {}",
                                value, err))
                    }
             },
             std::result::Result::Err(e) => std::result::Result::Err(
                 format!("Unable to convert header: {:?} to string: {}",
                     hdr_value, e))
        }
    }
}

