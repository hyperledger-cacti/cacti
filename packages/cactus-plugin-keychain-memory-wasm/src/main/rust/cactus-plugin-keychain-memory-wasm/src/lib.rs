mod utils;

use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// We have to allow snake case because the JS side expects it.
#[allow(non_snake_case)]
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct PluginKeychainMemoryWasmOptions {
    #[wasm_bindgen(getter_with_clone)]
    pub instanceId: String,

    #[wasm_bindgen(getter_with_clone)]
    pub keychainId: String,
}

#[wasm_bindgen]
impl PluginKeychainMemoryWasmOptions {
}

#[wasm_bindgen]
pub struct PluginKeychainMemoryWasm {
    data: HashMap<String, String>,
    options: PluginKeychainMemoryWasmOptions,
}

#[wasm_bindgen]
impl PluginKeychainMemoryWasm {
    #[wasm_bindgen(constructor)]
    pub fn new(options: PluginKeychainMemoryWasmOptions) -> Self {
        PluginKeychainMemoryWasm { data: HashMap::new(), options }
    }

    // We have to allow snake case because the JS side expects it.
    #[allow(non_snake_case)]
    pub fn getPackageName(&self) -> String {
        "@hyperledger/cactus-plugin-keychain-memory-wasm".to_string()
    }

    // We have to allow snake case because the JS side expects it.
    #[allow(non_snake_case)]
    pub fn getKeychainId(&self) -> String {
        self.options.keychainId.clone()
    }

    // We have to allow snake case because the JS side expects it.
    #[allow(non_snake_case)]
    pub fn getInstanceId(&self) -> String {
        self.options.instanceId.clone()
    }

    // We have to allow snake case because the JS side expects it.
    #[allow(non_snake_case)]
    pub fn onPluginInit(&self) -> js_sys::Promise {
        js_sys::Promise::resolve(&"Initialization OK".into())
    }

    pub fn get(&self, key: &str) -> js_sys::Promise {
        let value = self.data.get(key);
        js_sys::Promise::resolve(&value.into())
    }

    pub fn set(&mut self, key: &str, value: &str) -> js_sys::Promise {
        self.data.insert(key.to_string(), value.to_string());
        js_sys::Promise::resolve(&JsValue::UNDEFINED.into())
    }

    pub fn has(&self, key: &str) -> js_sys::Promise {
        let is_present = self.data.contains_key(key);
        js_sys::Promise::resolve(&is_present.into())
    }

    pub fn delete(&mut self, key: &str) -> js_sys::Promise {
        self.data.remove(key);
        js_sys::Promise::resolve(&JsValue::UNDEFINED.into())
    }
}


#[wasm_bindgen]
pub struct PluginFactoryKeychain {
}

#[wasm_bindgen]
impl PluginFactoryKeychain {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        PluginFactoryKeychain {}
    }

    pub fn create(&self, options_raw: &JsValue) -> PluginKeychainMemoryWasm {
        let options: PluginKeychainMemoryWasmOptions = options_raw.into_serde().unwrap();
        PluginKeychainMemoryWasm::new(options)
    }
}

// We have to allow snake case because the JS side expects it.
#[allow(non_snake_case)]
#[wasm_bindgen]
pub async fn createPluginFactory() -> PluginFactoryKeychain {
    utils::set_panic_hook();
    PluginFactoryKeychain::new()
}
