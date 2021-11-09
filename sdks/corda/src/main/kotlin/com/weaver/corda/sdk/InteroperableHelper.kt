/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.sdk;

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import io.grpc.ManagedChannel
import io.grpc.ManagedChannelBuilder
import io.grpc.okhttp.OkHttpChannelBuilder
import javax.net.ssl.SSLContext
import java.io.ByteArrayInputStream
import java.io.FileInputStream
import java.io.File
import java.io.StringReader
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.TrustManagerFactory
import org.bouncycastle.util.io.pem.PemReader
import java.lang.Exception
import kotlinx.coroutines.*
import java.util.*
import org.slf4j.LoggerFactory
import net.corda.core.messaging.startFlow
import net.corda.core.messaging.CordaRPCOps

import com.weaver.corda.app.interop.flows.CreateExternalRequest
import com.weaver.corda.app.interop.flows.WriteExternalStateInitiator
import com.weaver.corda.app.interop.flows.GetExternalStateByLinearId
import com.weaver.protos.corda.ViewDataOuterClass
import com.weaver.protos.common.state.State
import com.weaver.protos.networks.networks.Networks

class InteroperableHelper {
    companion object {
        private val logger = LoggerFactory.getLogger(InteroperableHelper::class.java)
        
        /**
         * Function to create an view address for interop call to a fabric network.
         */
        @JvmStatic
        fun createFabricViewAddress (
            securityDomain: String,
            remoteRelayEndpoint: String,
            channelName: String,
            chaincodeName: String,
            ccFunc: String,
            ccFuncArgs: String
        ): String {
            val resource = channelName +
                            ":" + chaincodeName + 
                            ":" + ccFunc +
                            ":" + ccFuncArgs
            return remoteRelayEndpoint + "/" + securityDomain + "/" + resource
        }

        /**
         * Function to create an view address for interop call to a corda network.
         */
        @JvmStatic
        fun createCordaViewAddress (
            securityDomain: String,
            remoteRelayEndpoint: String,
            remoteCordaHosts: List<String>,
            remoteFlow: String,
            remoteFlowArgs: String
        ): String {
            val resource = remoteCordaHosts.joinToString(separator=";") { it } +
                            "#" + remoteFlow +
                            ":" + remoteFlowArgs
            return remoteRelayEndpoint + "/" + securityDomain + "/" + resource
        }

        /**
         * Function to create a ManagedChannel for a GRPC connection to the relay.
         * The channel can be insecure or secure (TLS connection) depending on the supplied parameters.
         */
        @JvmStatic
        fun getChannelToRelay (
            localRelayHost: String,
            localRelayPort: Int,
            useTlsForRelay: Boolean,
            relayTlsTrustStorePath: String,
            relayTlsTrustStorePassword: String,
            tlsCACertPathsForRelay: String
        ): ManagedChannel {
            if (useTlsForRelay) {
                var trustStore: KeyStore = KeyStore.getInstance(KeyStore.getDefaultType())
                if (relayTlsTrustStorePath.length > 0) {
                    if (relayTlsTrustStorePassword.length == 0) {
                        throw Exception("Password not supplied for JKS trust store")
                    }
                    val trustStream = FileInputStream(relayTlsTrustStorePath)
                    trustStore.load(trustStream, relayTlsTrustStorePassword.toCharArray())
                } else if (tlsCACertPathsForRelay.length > 0) {
                    trustStore.load(null, null)
                    val tlsCACertPaths = tlsCACertPathsForRelay.split(":")
                    var tlsCACertCounter = 0
                    for (tlsCACertPath in tlsCACertPaths) {
                        val certFactory = CertificateFactory.getInstance("X509")
                        val certContents = File(tlsCACertPath).readText()
                        val certReader = PemReader(StringReader(certContents)).readPemObject().getContent()
                        val certStream = ByteArrayInputStream(certReader)
                        val cert = certFactory.generateCertificate(certStream)
                        trustStore.setCertificateEntry("ca-cert-" + tlsCACertCounter, cert)
                        tlsCACertCounter++
                    }
                } else {
                    throw Exception("Neither JKS trust store supplied nor CA certificate paths")
                }
                val tmFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
                tmFactory.init(trustStore)
                val trustManagers = tmFactory.getTrustManagers()
                val sslContext = SSLContext.getInstance("TLS")
                sslContext.init(null, trustManagers, null)
                return OkHttpChannelBuilder.forAddress(localRelayHost, localRelayPort)
                        .useTransportSecurity()
                        .sslSocketFactory(sslContext.getSocketFactory())
                        .executor(Dispatchers.Default.asExecutor())
                        .build()
            } else {
                return ManagedChannelBuilder.forAddress(localRelayHost, localRelayPort)
                        .usePlaintext()
                        .executor(Dispatchers.Default.asExecutor())
                        .build()
            }
        }

        /**
         * Make an interop call through relay, and passes it to WriteExternalState
         * to verify the proof and write it to vault.
         * 
         * @param proxy instance of CordaRPCOps to make flow calls to corda nodes.
         * @param localRelayEndpoint local relay hostname/IP:port
         * @param externalStateAddress view address created by above two functions. 
         *
         * @return Returns linearId of the written external state, that can be consumed by
         * list of getExternalState functions below.
         */
        @JvmStatic
        @JvmOverloads fun interopFlow (
            proxy: CordaRPCOps,
            localRelayEndpoint: String,
            externalStateAddress: String,
            networkName: String,
            useTlsForRelay: Boolean = false,
            relayTlsTrustStorePath: String = "",
            relayTlsTrustStorePassword: String = "",
            tlsCACertPathsForRelay: String = ""
        ): Either<Error, String> {
            val localRelayHost = localRelayEndpoint.split(":").first()
            val localRelayPort = localRelayEndpoint.split(":").last().toInt()
            var channel: ManagedChannel
            try {
                channel = getChannelToRelay(
                    localRelayHost,
                    localRelayPort,
                    useTlsForRelay,
                    relayTlsTrustStorePath,
                    relayTlsTrustStorePassword,
                    tlsCACertPathsForRelay)
            } catch(e: Exception) {
                logger.error("Error creating channel to relay: ${e.message}\n")
                return Left(Error("Error creating channel to relay: ${e.message}\n"))
            }
            val client = RelayClient(channel)
            var result: Either<Error, String> = Left(Error(""))
            runBlocking {
                val eitherErrorQuery = constructNetworkQuery(proxy, externalStateAddress, networkName)
                logger.debug("\nCorda network returned: $eitherErrorQuery \n")
                eitherErrorQuery.map { networkQuery ->
                    logger.debug("Network query: $networkQuery")
                    runBlocking {
                        val ack = async { client.requestState(networkQuery) }.await()
                        pollForState(ack.requestId, client).map {
                            result = writeExternalStateToVault(
                                proxy,  
                                it,
                                externalStateAddress)
                        }
                    }
                }
            }
            return result
        }
        
        /**
         * Takes linearId returned by interopFlow
         *
         * @return Returns protobuf `ViewDataOuterClass.ViewData`, 
         * that stores the interop flow result.
         */
        @JvmStatic
        fun getExternalStateView(
            proxy: CordaRPCOps,
            externalStateLinearId: String
        ): ViewDataOuterClass.ViewData {
            val response = proxy.startFlow(::GetExternalStateByLinearId, externalStateLinearId)
                    .returnValue.get()
            return ViewDataOuterClass.ViewData.parseFrom(response)
        }
        
        
        /**
         * Takes linearId returned by interopFlow, and returns interop payload string.
         */
        @JvmStatic
        fun getExternalStatePayloadString(
            proxy: CordaRPCOps,
            externalStateLinearId: String
        ): String {
            val responseView = getExternalStateView(proxy, externalStateLinearId)
            return responseView.payload.toStringUtf8()
        }
        
        /**
         * Takes linearId returned by interopFlow, and returns list of signatories in proof.
         */
        @JvmStatic
        fun getExternalStateSignatories(
            proxy: CordaRPCOps,
            externalStateLinearId: String
        ): List<String> {
            val responseView = getExternalStateView(proxy, externalStateLinearId)
            var result: List<String> = listOf()
            for (notarization in responseView.notarizationsList) {
                val id = notarization.id
                result += id
            }
            return result
        }
        
        /**
         * Takes linearId returned by interopFlow and signatory Id, 
         * and returns it's signature that is part of the proof.
         */
        @JvmStatic
        fun getExternalStateSignature(
            proxy: CordaRPCOps,
            externalStateLinearId: String,
            signerId: String
        ): String {
            val responseView = getExternalStateView(proxy, externalStateLinearId)
            for (notarization in responseView.notarizationsList) {
                val id = notarization.id
                if (id == signerId) {
                    return notarization.signature
                }
            }
            return ""
        }
        
        /**
         * Takes linearId returned by interopFlow and signatory Id, 
         * and returns it's certificate that can be used to verify the signature.
         */
        @JvmStatic
        fun getExternalStateSignatoryCertificate(
            proxy: CordaRPCOps,
            externalStateLinearId: String,
            signerId: String
        ): String {
            val responseView = getExternalStateView(proxy, externalStateLinearId)
            for (notarization in responseView.notarizationsList) {
                val id = notarization.id
                if (id == signerId) {
                    return notarization.certificate
                }
            }
            return ""
        }
        
        /**
         * The constructNetworkQuery function passes the address provided by the user to the interoperation CorDapp
         * to get the external network's endorsement policy, and to provide a signature and certificate for the
         * external network to authenticate the request.
         *
         * @property address The address of the view provided by the user.
         * @property host The hostname of the Corda node.
         * @property port The port of the Corda node.
         * @property rpc The Corda node RPC connection.
         * @property proxy The proxy to the Corda node RPC connection.
         * @return Returns an Either with an error if the RPC connection failed or the interop flow failed, or a NetworkQuery.
         */
        suspend fun constructNetworkQuery(
            proxy: CordaRPCOps,
            address: String,
            requestingNetwork: String
        ): Either<Error, Networks.NetworkQuery> {
            logger.debug("Getting query information for foreign network from Corda network")
            try {
                val eitherErrorRequest = proxy.startFlow(::CreateExternalRequest, address)
                        .returnValue.get().map {
                            Networks.NetworkQuery.newBuilder()
                                    .addAllPolicy(it.policy)
                                    .setAddress(address)
                                    .setRequestingRelay("")
                                    .setRequestingNetwork(requestingNetwork)
                                    .setCertificate(it.certificate)
                                    .setRequestorSignature(it.signature)
                                    .setRequestingOrg(it.requestingOrg)
                                    .setNonce(it.nonce)
                                    .build()
                        }
                return eitherErrorRequest
            } catch (e: Exception) {
                return Left(Error("Corda Network Error: ${e.message}"))
            }
        }
        
        /**
         * pollForState is used to poll the local relay for the requested state. This is a recursive function that continues
         * to poll if the returned state is "PENDING" or "PENDING_ACK" or returns the "COMPLETED" or "ERROR" state.
         *
         * @property requestId The requestId for the original request.
         * @property client The gRPC client for the relay.
         * @property requestState The state response from the relay.
         * Will have status "PENDING", "PENDING_ACK", "COMPLETED" or "ERROR".
         * @return Returns the request state when it has status "COMPLETED" or "ERROR".
         */
        suspend fun pollForState(requestId: String, client: RelayClient, retryCount: Int = 0): Either<Error, State.RequestState> = coroutineScope {
            val num = 10
            if (retryCount > num) {
                Left(Error("Error: Timeout, remote network took longer than $num seconds to respond"))
            } else {
                delay(1000L)
                val requestState = async { client.getState(requestId) }.await()
                logger.debug("Response from getState: $requestState")
                when (requestState.status.toString()) {
                    "COMPLETED" -> Right(requestState)
                    "PENDING" -> async { pollForState(requestId, client, retryCount + 1) }.await()
                    "PENDING_ACK" -> async { pollForState(requestId, client, retryCount + 1) }.await()
                    "ERROR" -> {
                        logger.error("Error returned from the remote network: $requestState")
                        Left(Error("Error returned from remote network $requestState"))
                    }
                    else -> Left(Error("Unexpected status returned in RequestState"))
                }
            }
        }
        
        /**
         * writeExternalStateToVault is used to trigger the interoperation CorDapp to store the requested state in the ledger.
         *
         * @property requestState The state that is returned by the external network.
         * @property host The host of the Corda node to connect to.
         * @property port The port of the Corda node to connect to.
         * @property rpc The Corda node RPC connection.
         * @property stateId The linearId of the state stored in the Corda ledger.
         * @property proxy The proxy to the Corda node RPC connection.
         * @return Returns an Either with an error if the RPC connection failed or the Corda network returned an error, else
         * the unique identifier of the stored state.
         */
        fun writeExternalStateToVault(
            proxy: CordaRPCOps,
            requestState: State.RequestState,
            address: String
        ): Either<Error, String> {
            return try {
                logger.debug("Sending response to Corda for view verification.\n")
                val stateId = runCatching {
                    val viewBase64String = Base64.getEncoder().encodeToString(requestState.view.toByteArray())
                    proxy.startFlow(::WriteExternalStateInitiator, viewBase64String, address)
                            .returnValue.get()
                }.fold({
                    it.map { linearId ->
                        logger.debug("Verification was successful and external-state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                    Left(Error("Corda Network Error: Error running WriteExternalStateInitiator flow: ${it.message}\n"))
                })
                stateId
            } catch (e: Exception) {
                logger.error("Error writing state to Corda network: ${e.message}\n")
                Left(Error("Error writing state to Corda network: ${e.message}"))
            }
        }
    }
}
