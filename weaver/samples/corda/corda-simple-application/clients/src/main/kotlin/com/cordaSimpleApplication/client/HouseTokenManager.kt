package com.cordaSimpleApplication.client

import com.cordaSimpleApplication.flow.IssueAssetState
import com.cordaSimpleApplication.flow.GetStatesByTokenType
import com.cordaSimpleApplication.flow.IssueAssetStateFromStateRef
import com.cordaSimpleApplication.flow.DeleteAssetState
import com.cordaSimpleApplication.flow.GetAssetStateByLinearId
import com.cordaSimpleApplication.flow.RetrieveStateAndRef
import com.cordaSimpleApplication.flow.MergeAssetStates
import com.cordaSimpleApplication.flow.SplitAssetState

import com.cordaSimpleApplication.flow.TransferAssetStateInitiator
import com.cordaSimpleApplication.state.AssetState
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.option
import net.corda.core.identity.CordaX500Name
import java.lang.Exception
import net.corda.core.messaging.startFlow

import net.corda.samples.tokenizedhouse.flows.*

class HouseTokenCommand : CliktCommand(name = "house-token", help ="Manages FungibleHouseTokens") {
    override fun run() {
    }
}

/**
 * The CLI command used to trigger a CreateState flow.
 *
 * @property quantity The numberOfTokens for the [AssetState].
 * @property tokenType The tokenType for the [AssetState].
 */
class InitHouseCommand : CliktCommand(name = "init", help = "Creates Fungible House Token Type in network") {
    val config by requireObject<Map<String, String>>()
    override fun run() {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val result = proxy.startFlow(::CreateHouseTokenFlow, "house", 100000)
                    .returnValue.get()
            println(result)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }

    }
}

class IssueHouseCommand : CliktCommand(name="issue", help = "Issues tokens to a party") {
    val config by requireObject<Map<String, String>>()
    val party by option("-p", "--party", help="Party to which tokens is to be issued")
    val amount by option("-a", "--amount")
    override fun run() {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val result = proxy.startFlow(::IssueHouseTokenFlow, "house", amount!!.toLong(), rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(party!!))!!)
            println(result)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }

    }
}

class GetHouseBalCommand : CliktCommand(name="get-balance", help = "Get balance of house tokens") {
    val config by requireObject<Map<String, String>>()
    override fun run() {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val result = proxy.startFlow(::GetTokenBalance, "house")
                    .returnValue.get()
            println(result)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }

    }
}

class RedeemHouseTokenCommand : CliktCommand(name="redeem", help = "Redeem house tokens") {
    val config by requireObject<Map<String, String>>()
    val amount by option("-a", "--amount")
    override fun run() {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val result = proxy.startFlow(::RedeemTokenFlow, "house", amount!!.toLong())
                    .returnValue.get()
            println(result)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }

    }
}


class MoveHouseTokenCommand : CliktCommand(name="move", help = "Move house tokens") {
    val config by requireObject<Map<String, String>>()
    val party by option("-p", "--party", help="Party to which tokens is to be issued")
    val amount by option("-a", "--amount")
    override fun run() {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val p = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(party!!))!!
            val result = proxy.startFlow(::MoveHouseTokenFlow, "house", p, amount!!.toLong())
                    .returnValue.get()
            println(result)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }

    }
}
