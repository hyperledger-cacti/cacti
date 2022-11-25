# DefaultApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**clearMonitorTransactionsV1**](DefaultApi.md#clearMonitorTransactionsV1) | **DELETE** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/clear-monitor-transactions | Clear transactions from internal store so they&#39;ll not be available by GetMonitorTransactionsV1 anymore.
[**deployContractJarsV1**](DefaultApi.md#deployContractJarsV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars | Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).
[**diagnoseNodeV1**](DefaultApi.md#diagnoseNodeV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/diagnose-node | 
[**getMonitorTransactionsV1**](DefaultApi.md#getMonitorTransactionsV1) | **GET** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-monitor-transactions | Get transactions for monitored state classes.
[**getPrometheusMetricsV1**](DefaultApi.md#getPrometheusMetricsV1) | **GET** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics | Get the Prometheus Metrics
[**invokeContractV1**](DefaultApi.md#invokeContractV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/invoke-contract | Invokes a contract on a Corda ledger (e.g. a flow)
[**listFlowsV1**](DefaultApi.md#listFlowsV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows | 
[**networkMapV1**](DefaultApi.md#networkMapV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map | 
[**startMonitorV1**](DefaultApi.md#startMonitorV1) | **POST** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/start-monitor | Start monitoring corda changes (transactions) of given state class
[**stopMonitorV1**](DefaultApi.md#stopMonitorV1) | **DELETE** /api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/stop-monitor | Stop monitoring corda changes (transactions) of given state class


<a name="clearMonitorTransactionsV1"></a>
# **clearMonitorTransactionsV1**
> ClearMonitorTransactionsV1Response clearMonitorTransactionsV1(clearMonitorTransactionsV1Request)

Clear transactions from internal store so they&#39;ll not be available by GetMonitorTransactionsV1 anymore.

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val clearMonitorTransactionsV1Request : ClearMonitorTransactionsV1Request =  // ClearMonitorTransactionsV1Request | 
try {
    val result : ClearMonitorTransactionsV1Response = apiInstance.clearMonitorTransactionsV1(clearMonitorTransactionsV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#clearMonitorTransactionsV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#clearMonitorTransactionsV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **clearMonitorTransactionsV1Request** | [**ClearMonitorTransactionsV1Request**](ClearMonitorTransactionsV1Request.md)|  | [optional]

### Return type

[**ClearMonitorTransactionsV1Response**](ClearMonitorTransactionsV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deployContractJarsV1"></a>
# **deployContractJarsV1**
> DeployContractJarsSuccessV1Response deployContractJarsV1(deployContractJarsV1Request)

Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val deployContractJarsV1Request : DeployContractJarsV1Request =  // DeployContractJarsV1Request | 
try {
    val result : DeployContractJarsSuccessV1Response = apiInstance.deployContractJarsV1(deployContractJarsV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#deployContractJarsV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#deployContractJarsV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **deployContractJarsV1Request** | [**DeployContractJarsV1Request**](DeployContractJarsV1Request.md)|  | [optional]

### Return type

[**DeployContractJarsSuccessV1Response**](DeployContractJarsSuccessV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="diagnoseNodeV1"></a>
# **diagnoseNodeV1**
> DiagnoseNodeV1Response diagnoseNodeV1(diagnoseNodeV1Request)



Responds with diagnostic information about the Corda node

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val diagnoseNodeV1Request : DiagnoseNodeV1Request =  // DiagnoseNodeV1Request | 
try {
    val result : DiagnoseNodeV1Response = apiInstance.diagnoseNodeV1(diagnoseNodeV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#diagnoseNodeV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#diagnoseNodeV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **diagnoseNodeV1Request** | [**DiagnoseNodeV1Request**](DiagnoseNodeV1Request.md)|  | [optional]

### Return type

[**DiagnoseNodeV1Response**](DiagnoseNodeV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getMonitorTransactionsV1"></a>
# **getMonitorTransactionsV1**
> GetMonitorTransactionsV1Response getMonitorTransactionsV1(getMonitorTransactionsV1Request)

Get transactions for monitored state classes.

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val getMonitorTransactionsV1Request : GetMonitorTransactionsV1Request =  // GetMonitorTransactionsV1Request | 
try {
    val result : GetMonitorTransactionsV1Response = apiInstance.getMonitorTransactionsV1(getMonitorTransactionsV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#getMonitorTransactionsV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#getMonitorTransactionsV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **getMonitorTransactionsV1Request** | [**GetMonitorTransactionsV1Request**](GetMonitorTransactionsV1Request.md)|  | [optional]

### Return type

[**GetMonitorTransactionsV1Response**](GetMonitorTransactionsV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getPrometheusMetricsV1"></a>
# **getPrometheusMetricsV1**
> kotlin.String getPrometheusMetricsV1()

Get the Prometheus Metrics

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
try {
    val result : kotlin.String = apiInstance.getPrometheusMetricsV1()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#getPrometheusMetricsV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#getPrometheusMetricsV1")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

**kotlin.String**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/plain

<a name="invokeContractV1"></a>
# **invokeContractV1**
> InvokeContractV1Response invokeContractV1(invokeContractV1Request)

Invokes a contract on a Corda ledger (e.g. a flow)

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val invokeContractV1Request : InvokeContractV1Request =  // InvokeContractV1Request | 
try {
    val result : InvokeContractV1Response = apiInstance.invokeContractV1(invokeContractV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#invokeContractV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#invokeContractV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **invokeContractV1Request** | [**InvokeContractV1Request**](InvokeContractV1Request.md)|  | [optional]

### Return type

[**InvokeContractV1Response**](InvokeContractV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="listFlowsV1"></a>
# **listFlowsV1**
> ListFlowsV1Response listFlowsV1(listFlowsV1Request)



Responds with a list of the flows on the Corda node.

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val listFlowsV1Request : ListFlowsV1Request =  // ListFlowsV1Request | 
try {
    val result : ListFlowsV1Response = apiInstance.listFlowsV1(listFlowsV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#listFlowsV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#listFlowsV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **listFlowsV1Request** | [**ListFlowsV1Request**](ListFlowsV1Request.md)|  | [optional]

### Return type

[**ListFlowsV1Response**](ListFlowsV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="networkMapV1"></a>
# **networkMapV1**
> kotlin.collections.List&lt;NodeInfo&gt; networkMapV1(body)



Responds with a snapshot of the network map as provided by the Corda RPC call: net.corda.core.messaging.CordaRPCOps public abstract fun networkMapSnapshot(): List&lt;NodeInfo&gt;

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val body : kotlin.Any = Object // kotlin.Any | 
try {
    val result : kotlin.collections.List<NodeInfo> = apiInstance.networkMapV1(body)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#networkMapV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#networkMapV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | **kotlin.Any**|  | [optional]

### Return type

[**kotlin.collections.List&lt;NodeInfo&gt;**](NodeInfo.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="startMonitorV1"></a>
# **startMonitorV1**
> StartMonitorV1Response startMonitorV1(startMonitorV1Request)

Start monitoring corda changes (transactions) of given state class

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val startMonitorV1Request : StartMonitorV1Request =  // StartMonitorV1Request | 
try {
    val result : StartMonitorV1Response = apiInstance.startMonitorV1(startMonitorV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#startMonitorV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#startMonitorV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **startMonitorV1Request** | [**StartMonitorV1Request**](StartMonitorV1Request.md)|  | [optional]

### Return type

[**StartMonitorV1Response**](StartMonitorV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="stopMonitorV1"></a>
# **stopMonitorV1**
> StopMonitorV1Response stopMonitorV1(stopMonitorV1Request)

Stop monitoring corda changes (transactions) of given state class

### Example
```kotlin
// Import classes:
//import org.openapitools.client.infrastructure.*
//import org.openapitools.client.models.*

val apiInstance = DefaultApi()
val stopMonitorV1Request : StopMonitorV1Request =  // StopMonitorV1Request | 
try {
    val result : StopMonitorV1Response = apiInstance.stopMonitorV1(stopMonitorV1Request)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#stopMonitorV1")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#stopMonitorV1")
    e.printStackTrace()
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **stopMonitorV1Request** | [**StopMonitorV1Request**](StopMonitorV1Request.md)|  | [optional]

### Return type

[**StopMonitorV1Response**](StopMonitorV1Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

