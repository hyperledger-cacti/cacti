/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.findOrSetObject
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.core.subcommands

/**
 * The CLI application used by the user to trigger flows in the Corda nodes.
 */
class App : CliktCommand() {
    val config by findOrSetObject { mutableMapOf<String, String>() }
    override fun run() {
        config["NETWORK_NAME"] = System.getenv("NETWORK_NAME") ?: "Corda_Network"
        config["CORDA_HOST"] = System.getenv("CORDA_HOST") ?: "localhost"
        config["CORDA_PORT"] = System.getenv("CORDA_PORT") ?: "10006"
        config["RELAY_TLS"] = System.getenv("RELAY_TLS") ?: "false"
        config["RELAY_TLSCA_TRUST_STORE"] = System.getenv("RELAY_TLSCA_TRUST_STORE") ?: ""
        config["RELAY_TLSCA_TRUST_STORE_PASSWORD"] = System.getenv("RELAY_TLSCA_TRUST_STORE_PASSWORD") ?: ""
        config["RELAY_TLSCA_CERT_PATHS"] = System.getenv("RELAY_TLSCA_CERT_PATHS") ?: ""
    }
}

class GetFlowsCommand : CliktCommand(help = "Lists the flows") {
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Getting the list of registered flows")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val flows = proxy.registeredFlows()
            println(flows)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

fun main(args: Array<String>) = App()
        .subcommands(
            GetFlowsCommand(),
            CreateStateCommand(),
            UpdateStateCommand(),
            DeleteStateCommand(),
            GetStateCommand(),
            GetStateUsingLinearIdCommand(),
            GetStatesCommand(),
            RequestStateCommand(),
            CreateVerificationPolicyCommand(),
            UpdateVerificationPolicyCommand(),
            DeleteVerificationPolicyCommand(),
            GetVerificationPolicyCommand(),
            GetVerificationPoliciesCommand(),
            CreateAccessControlPolicyCommand(),
            UpdateAccessControlPolicyCommand(),
            DeleteAccessControlPolicyCommand(),
            GetAccessControlPolicyCommand(),
            GetAccessControlPoliciesCommand(),
            CreateMembershipCommand(),
            UpdateMembershipCommand(),
            DeleteMembershipCommand(),
            GetMembershipCommand(),
            GetMembershipsCommand(),
            GetExternalStateCommand(),
            IssueAssetStateCommand(),
            GetAssetStateByLinearIdCommand(),
            DeleteAssetStateCommand(),
            GetAssetStatesByTypeCommand(),
            IssueAssetStateFromStateRefCommand(),
            MergeAssetStatesCommand(),
            RetrieveAssetStateAndRefCommand(),
            SplitAssetStateCommand(),
            TransferAssetStateCommand(),
            LockAssetCommand(),
            ClaimAssetCommand(),
            UnlockAssetCommand(),
            IsAssetLockedCommand(),
            GetLockStateCommand(),
            GetHTLCHashCommand(),
            GetHTLCPreImageCommand(),
            UtilsCommand().subcommands(
                GetHashCommand(),
                SaveUserCertToFileCommand(),
                FetchPartyNameCommand(),
                FetchCertBase64Command()
            ),
            BondAssetCommand().subcommands(
                IssueBondAssetStateCommand(),
                IssueBondAssetStateFromStateRefCommand(),
                GetBondAssetStateByLinearIdCommand(),
                GetBondAssetStatesByTypeCommand(),
                RetrieveBondAssetStateAndRefCommand(),
                TransferBondAssetStateCommand(),
                DeleteBondAssetStateCommand()
            ),
            AssetTransferCommand().subcommands(
                PledgeAssetCommand(),
                IsAssetPledgedCommand(),
                GetAssetPledgeStateCommand(),
                ReclaimAssetCommand(),
                ClaimRemoteAssetCommand(),
                GetSimpleAssetPledgeStatusByPledgeIdCommand(),
                GetSimpleAssetClaimStatusByPledgeIdCommand()
            ),
            ConfigureCommand().subcommands(
                ConfigureDataCommand(),
                ConfigureNetworkCommand(),
                ConfigureAllCommand(),
                ConfigureCreateAllCommand()
            ),
            HouseTokenCommand().subcommands(
                InitHouseCommand(),
                IssueHouseCommand(),
                GetHouseBalCommand(),
                RedeemHouseTokenCommand(),
                MoveHouseTokenCommand(),
                LockHouseTokenCommand(),
                ClaimHouseTokenCommand(),
                UnlockHouseTokenCommand(),
                IsHouseTokenLockedCommand(),
                GetHouseTokenLockStateCommand(),
                HouseTokenTransferCommand().subcommands(
                    PledgeHouseTokenCommand(),
                    IsHouseTokenPledgedCommand(),
                    GetHouseTokenPledgeStateCommand(),
                    ReclaimHouseTokenCommand(),
                    ClaimRemoteHouseTokenCommand(),
                    GetAssetClaimStatusByPledgeIdCommand(),
                    GetAssetPledgeStatusByPledgeIdCommand()
                )
            ),
            NetworkIdCommand().subcommands(
                CreateNetworkIdStateCommand(),
                RetrieveNetworkIdStateAndRefCommand()
            )
        )
        .main(args)
