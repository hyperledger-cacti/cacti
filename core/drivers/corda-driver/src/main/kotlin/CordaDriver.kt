/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.driver

import arrow.core.*
import arrow.core.extensions.either.applicative.applicative
import arrow.core.extensions.list.traverse.traverse
import com.google.gson.Gson
import net.corda.core.messaging.startFlow
import kotlinx.coroutines.*
import com.google.protobuf.ByteString
import net.corda.core.messaging.CordaRPCOps
import java.util.*

import com.weaver.corda.app.interop.flows.HandleExternalRequest
import com.weaver.corda.sdk.InteroperableHelper
import com.weaver.protos.common.query.QueryOuterClass
import com.weaver.protos.common.state.State
import com.weaver.protos.corda.ViewDataOuterClass

fun main(args: Array<String>) {
    val port = System.getenv("DRIVER_PORT")?.toInt() ?: 9099
    val server = GrpcServer(port)
    server.start()
    server.blockUntilShutdown()
}

/**
 * The function fetchState() is used by the driver to request state from the Corda node.
 *
 * @property query The query that was sent by the requesting network.
 * @property eitherErrorClient An Either that stores an Error or the gRPC client for sending state back to the relay.
 * @property viewPayload The view payload to be sent back to the relay. Either contains an Error or a View.
 * @property rpc The Corda RPC connection to the Corda node
 * @property proxy The proxy to the Corda node
 * @property viewPayload The result returned from the Corda node wrapped in a [State.ViewPayload].
 */
fun fetchState(query: QueryOuterClass.Query) {
    // Parse the address field given in the query and attempt to build a gRPC client to connect to the relay.
    val eitherErrorClient = createGrpcConnection(query.address)

    // If there was an error creating the gRPC client, there is nothing we can do
    eitherErrorClient.fold({
        println("Driver Error: Could not connect to relay: ${it.message}")
    }, { client ->
        // If there was no error creating the gRPC client, attempt to parse the view address from the address
        val eitherErrorViews = parseViewAddress(query.address)
            .flatMap { viewAddress ->
            // Then for each node listed in the node addresses segment of the view address,
            // attempt to create an RPC connection to the node.
            viewAddress.nodeAddresses.map {
                createCordaNodeConnection(it)
                // Traverse the resulting list of Eithers to a single Either with the list of node connections
            }.traverse(Either.applicative(), ::identity)
                .fix().map { it.fix() }
            // For each proxy in the list, forward the request on to the node
        }.flatMap { proxies ->
            proxies.map { proxy ->
                useHandleExternalRequest(proxy, query)
                // Traverse the resulting list of Eithers to a single Either with the
                // list of views returned from the nodes
            }.traverse(Either.applicative(), ::identity).fix().map { it.fix() }
        }

        // Aggregate the notarizations from each node and into a single view.
        val viewPayload = eitherErrorViews.flatMap { views ->
            createAggregatedCordaView(views)
        }.fold({
            // Map any errors to a ViewPayload containing the error.
            println("Error creating a valid ViewPayload: ${it.message}.\n")
            State.ViewPayload.newBuilder()
                .setRequestId(query.requestId)
                .setError("Corda Network Error: ${it.message}")
                .build()
        }, {
            // Map the view to a ViewPayload
            State.ViewPayload.newBuilder()
                .setRequestId(query.requestId)
                .setView(it)
                .build()
        })
        runBlocking {
            println("Sending state back to remote relay: $viewPayload\n")
            val response = async { client.SendDriverState(viewPayload) }.await()
            println("Response back from relay from sendDriverState request: $response")
        }
    })
}

/**
 * The createAggregateCordaView function aggregates the notarizations returned from each queried
 * Corda node into a single View.
 *
 * Each View returned from the Corda node contains in its "data" field a ByteString of a Base64 encoded
 * JSON string of the CordaViewData. The CordaViewData contains the notarization from the Corda node
 * and the state data returned from the application CorDapp. The notarizations need to be aggregated
 * into a single list and then a new CordaViewData instance with this list and one copy of the data from
 * any of the returned views is created.
 *
 * @param views The list of Views returned from each of the Corda nodes.
 * @return Returns an Either with an Error if aggregation failed, or the single View containing the list of
 * all Corda node notarizations.
 */
fun createAggregatedCordaView(views: List<State.View>) : Either<Error, State.View> = try {

    println("Aggregating the notarizations returned from all Corda nodes.\n")
    // For each View, parse the data ByteString field into a CordaViewData type
    val cordaViewDataList = views.map { view ->
        ViewDataOuterClass.ViewData.parseFrom(view.data)
    }

    // Flatten the lists of notarizations returned from each node to a single list
    val notarizations = cordaViewDataList.map { cordaViewData  ->
        cordaViewData.notarizationsList
    }.flatten()

    // Create a new CordaViewData with the flattened list
    val aggregatedCordaViewData = ViewDataOuterClass.ViewData.newBuilder()
      .addAllNotarizations(notarizations)
      .setPayload(cordaViewDataList[0].payload)
      .build()

    // Return the new State.View from the new CordaViewData
    Right(State.View.newBuilder()
        .setMeta(views[0].meta)
        .setData(aggregatedCordaViewData.toByteString())
        .build())
} catch (e: Exception) {
    println("Driver Error: Error aggregating Corda node responses: ${e.message}")
    Left(Error("Driver Error: Error aggregating Corda node responses: ${e.message}"))
}

/**
 * createGrpcConnection function is a helper function used to establish a
 * connect with the relay
 *
 * @property address The full address string of a resource on a remote network
 * @return Returns an Either with an Error if the connection failed, or a GRPC client
 */
fun createGrpcConnection(address: String) = try {
    parseRelayAddress(address).map { relayAddresses ->
    // TODO: if the first relay address fails, retry with other relay addresses in the list.
        val channel = InteroperableHelper.getChannelToRelay(
                relayAddresses[0].host,
                relayAddresses[0].port,
                System.getenv("RELAY_TLS")?.toBoolean() ?: false,
                System.getenv("RELAY_TLSCA_TRUST_STORE")?.toString() ?: "",
                System.getenv("RELAY_TLSCA_TRUST_STORE_PASSWORD")?.toString() ?: "",
                System.getenv("RELAY_TLSCA_CERT_PATHS")?.toString() ?: "")
        GrpcClient(channel)
    }
} catch (e: Exception) {
    println("Driver Error: Error creating relay gRPC client: ${e.message}")
    Left(Error("Driver Error: Error creating relay gRPC client: ${e.message}"))
}

/**
 * createCordaNodeConnection function is a helper function used to establish a
 * connect with a Corda node
 *
 * @property rpcAddress The host and port of the Corda node
 * @return Returns an Either with an Error if the connection failed, or the Corda
 * RPC connection proxy
 */
fun createCordaNodeConnection(rpcAddress: RpcAddress) = try {
    val rpc = CordaNodeRPCConnection(
            host = rpcAddress.host,
            username = System.getenv("DRIVER_RPC_USERNAME")?.toString() ?: "driverUser1",
            password = System.getenv("DRIVER_RPC_PASSWORD")?.toString() ?: "test",
            rpcPort = rpcAddress.port)
    Right(rpc.proxy)
} catch (e: Exception) {
    println("Corda Network Error: Error creating Corda node connection: ${e.message}")
    Left(Error("Corda Network Error: Error creating Corda node connection: ${e.message}"))
}


/**
 * useHandleExternalRequest function uses the interoperation CorDapp flow HandleExternalRequest to process the
 * external network query and returns a View.
 *
 * This function is currently breaking the corda-driver code because of conflicting dependencies with the proto libraries.
 *
 * @property proxy The Corda RPC connection proxy.
 * @property query The Query supplied by the requesting network.
 * @return Returns an Either with an Error if the flow failed, or the View.
 */
fun useHandleExternalRequest(proxy: CordaRPCOps, query: QueryOuterClass.Query): Either<Error, State.View> = try {
    println("UseHandleExternalRequest Query: $query")
    val nodeResponse = proxy.startFlow(::HandleExternalRequest, query)
            .returnValue.get()
        println("Corda node returned: $nodeResponse\n")
    nodeResponse
} catch (e: Exception) {
    println("Corda Network Error: ${e.message}\n")
    Left(Error("Corda Network Error: ${e.message}"))
}

/**
 * The parseRelayAddress function is used to create a list of [RelayAddress] from the address
 * query string provided by the requesting network.
 *
 * @property address The address string provided by the requesting network. It has the form <location-segment>/<network-name>/<view-segment>.
 * @property segments Segments is a list of strings that should contain the three segments to the address.
 * @property relayAddresses The addresses of the remote relays used by the driver to return the ViewPayload.
 * @return Returns an Either with the parsed list of [RelayAddress] containing the list of relay
 * host and relay port, or an error.
 */
fun parseRelayAddress(address: String): Either<Error, List<RelayAddress>> {
    val segments = address.split("/")
    val relayAddresses = segments.first().split(";").map {
        RelayAddress(
                it.split(":")[0],
                it.split(":").getOrNull(1)?.toInt()
                        ?: return Left(Error("The location segment must include relay hosts and ports separated by ':'."))
        )
    }
    return Right(relayAddresses)
}

/**
 * The parseViewAddress function is used to create a [ViewAddress] class from the address
 * query string provided by the requesting network.
 *
 * @property address The address string provided by the requesting network. It has the form <location-segment>/<network-name>/<view-segment>.
 * @property segments Segments is a list of strings that contain the three segments to the address.
 * @property viewSegment The viewSegment contains the address to the view in the Corda ledger. It is a list of strings with the form '[party-a-address;party-b-address','FlowName:flowArg1:flowArg2'].
 * @property nodeAddresses The parsed addresses (host and port) of the nodes that need to be queried.
 * @property flowInfo The section of the view segment that contains the details of the flow to be triggered.
 * @property flowName The name of the flow to be triggered
 * @property flowArgs The arguments that need to be provided to the triggered flow. May be an empty list.
 * @return Returns an Either with the parsed [ViewAddress] class containing the node addresses, flow name
 * and flow args, or an error.
 */
fun parseViewAddress(address: String): Either<Error, ViewAddress> {
    val segments = address.split("/")
    if (segments.size != 3) {
        return Left(Error("Address should consist of a location segment, network name and view segment, separated by '/'."))
    }

    val viewSegment = segments.last().split("#")
    if (viewSegment.size != 2) {
        return Left(Error("View segment should have format 'party-a-address;party-b-address#FlowName:flowArg1:flowArg2'."))
    }

    val nodeAddresses: List<RpcAddress> = viewSegment[0].split(";").map {
        RpcAddress(
                it.split(":")[0],
                it.split(":").getOrNull(1)?.toInt()
                        ?: return Left(Error("The view segment must include a host and port separated by ':'."))
        )
    }

    val flowInfo = viewSegment[1].split(":")
    val flowName = flowInfo.first()
    val flowArgs = flowInfo.drop(1)
    return Right(ViewAddress(nodeAddresses, flowName, flowArgs))
}

/**
 * RelayAddress contains the host and port used for connecting with the relay via gRPC.
 *
 * @property host The hostname of the address.
 * @property port The port for the address.
 */
data class RelayAddress(val host: String, val port: Int)

/**
 * View address contains the information needed by the Corda network to unique identify a view.
 *
 * @property nodeAddresses The addresses of the Corda nodes that hold the view.
 * @property flowName The name of the application CorDapp flow to be queried for the view.
 * @property flowArgs The arguments to be provided to the named flow.
 */
data class ViewAddress(val nodeAddresses: List<RpcAddress>, val flowName: String, val flowArgs: List<String>)

/**
 * The RPC Address the driver uses to connect to the Corda node.
 *
 * @property host The hostname of the address.
 * @property port The port of the address.
 */
data class RpcAddress(val host: String, val port: Int)
