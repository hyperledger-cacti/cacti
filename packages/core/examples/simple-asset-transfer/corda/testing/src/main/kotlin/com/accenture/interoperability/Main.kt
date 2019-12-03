package com.accenture.interoperability

import net.corda.core.identity.CordaX500Name
import net.corda.core.utilities.getOrThrow
import net.corda.node.services.Permissions
import net.corda.testing.common.internal.testNetworkParameters
import net.corda.testing.driver.DriverParameters
import net.corda.testing.driver.PortAllocation
import net.corda.testing.driver.VerifierType
import net.corda.testing.driver.driver
import net.corda.testing.node.NotarySpec
import net.corda.testing.node.User

/**
 * This file is exclusively for being able to run your nodes through an IDE (as opposed to running deployNodes)
 * Do not use in a production environment.
 *
 * To debug your CorDapp:
 *
 * 1. Firstly, run the "Run Main program" run configuration.
 * 2. Wait for all the nodes to start.
 * 3. Note the debug ports which should be output to the console for each node. They typically start at 5006, 5007,
 *    5008. The "Debug Main program" configuration runs with port 5007, which should be "NodeB". In any case, double
 *    check the console output to be sure.
 * 4. Set your breakpoints in your CorDapp code.
 * 5. Run the "Debug Main program" remote debug run configuration.
 */
fun main(args: Array<String>) {

    // Setup RPC usernames/password
    val partyAUser1 = "user1"
    val partyBUser1 = "user1"
    val partyCUser1 = "user1"
    val partyDUser1 = "user1"
    val adminUser1 = "admin"
    val rpcPassword = "test"

    // Setup nodes ports/addresses
    val partyANodeP2PAddress = "localhost:10003"
    val partyANodeRPCAddress = "localhost:10013"
    val partyANodeRPCAdminAddress = "localhost:10043"

    val partyBNodeP2PAddress = "localhost:10004"
    val partyBNodeRPCAddress = "localhost:10014"
    val partyBNodeRPCAdminAddress = "localhost:10044"

    val partyCNodeP2PAddress = "localhost:10005"
    val partyCNodeRPCAddress = "localhost:10015"
    val partyCNodeRPCAdminAddress = "localhost:10045"

    val partyDNodeP2PAddress = "localhost:10006"
    val partyDNodeRPCAddress = "localhost:10016"
    val partyDNodeRPCAdminAddress = "localhost:10046"

    // Setup RPC permissions for the users
    val partyAPermissions = setOf(Permissions.all())
    val partyBPermissions = setOf(Permissions.all())
    val partyCPermissions = setOf(Permissions.all())
    val partyDPermissions = setOf(Permissions.all())

    // Setup node names
    val controllerNodeX500Name = "O=Notary,L=London,C=GB"
    val partyANodeX500Name = "O=PartyA,L=London,C=GB"
    val partyBNodeX500Name = "O=PartyB,L=New York,C=US"
    val partyCNodeX500Name = "O=PartyC,L=Paris,C=FR"
    val partyDNodeX500Name = "O=PartyD,L=Berlin,C=DE"

    // Setup users with the specific permissions
    val adminUser = User(adminUser1, rpcPassword, setOf(Permissions.all()))
    val partyAUser = User(partyAUser1, rpcPassword, partyAPermissions)
    val partyBUser = User(partyBUser1, rpcPassword, partyBPermissions)
    val partyCUser = User(partyCUser1, rpcPassword, partyCPermissions)
    val partyDUser = User(partyDUser1, rpcPassword, partyDPermissions)

    // Start the network
    driver(
        DriverParameters(
            isDebug = true,
            portAllocation = PortAllocation.Incremental(10100),
            waitForAllNodesToFinish = true,
            startNodesInProcess = true,
            extraCordappPackagesToScan = listOf("com.accenture.interoperability"),
            notarySpecs = listOf(
                NotarySpec(
                    name = CordaX500Name.parse(controllerNodeX500Name),
                    validating = true,
                    rpcUsers = emptyList(),
                    verifierType = VerifierType.InMemory,
                    cluster = null
                )
            ),
            networkParameters = testNetworkParameters(minimumPlatformVersion = 4)
        )
    ) {
        //val (partyANode, partyBNode, partyCNode, partyDNode) =
        listOf(
            this.startNode(
                providedName = CordaX500Name.parse(partyANodeX500Name),
                rpcUsers = listOf(partyAUser, adminUser),
                customOverrides = mapOf(
                    "p2pAddress" to partyANodeP2PAddress,
                    "rpcSettings" to mapOf(
                        "address" to partyANodeRPCAddress,
                        "adminAddress" to partyANodeRPCAdminAddress
                    )
                )
            ),
            this.startNode(
                providedName = CordaX500Name.parse(partyBNodeX500Name),
                rpcUsers = listOf(partyBUser, adminUser),
                customOverrides = mapOf(
                    "p2pAddress" to partyBNodeP2PAddress,
                    "rpcSettings" to mapOf(
                        "address" to partyBNodeRPCAddress,
                        "adminAddress" to partyBNodeRPCAdminAddress
                    )
                )
            ),
            this.startNode(
                providedName = CordaX500Name.parse(partyCNodeX500Name),
                rpcUsers = listOf(partyCUser, adminUser),
                customOverrides = mapOf(
                    "p2pAddress" to partyCNodeP2PAddress,
                    "rpcSettings" to mapOf(
                        "address" to partyCNodeRPCAddress,
                        "adminAddress" to partyCNodeRPCAdminAddress
                    )
                )
            ),
            this.startNode(
                providedName = CordaX500Name.parse(partyDNodeX500Name),
                rpcUsers = listOf(partyDUser, adminUser),
                customOverrides = mapOf(
                    "p2pAddress" to partyDNodeP2PAddress,
                    "rpcSettings" to mapOf(
                        "address" to partyDNodeRPCAddress,
                        "adminAddress" to partyDNodeRPCAdminAddress
                    )
                )
            )
        ).map { it.getOrThrow() }

        //this.startWebserver(partyANode)
        //this.startWebserver(partyBNode)
        //this.startWebserver(partyCNode)
        //this.startWebserver(partyDNode)

    }

}
