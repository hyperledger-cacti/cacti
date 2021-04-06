/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.test.contract

import com.cordaSimpleApplication.contract.SimpleContract
import com.cordaSimpleApplication.state.SimpleState
import net.corda.core.identity.CordaX500Name
import net.corda.testing.core.TestIdentity
import net.corda.testing.node.MockServices
import net.corda.testing.node.ledger
import org.junit.Test

class SimpleContractTests {
    private val ledgerServices = MockServices(listOf("com.cordaSimpleApplication.contract", "com.cordaSimpleApplication.flow"))
    private val partyA = TestIdentity(CordaX500Name("partyA", "London", "GB"))
    private val partyB = TestIdentity(CordaX500Name("partyB", "London", "GB"))
    private val key = "H"
    private val value = "1"
    private val newValue = "2"

    @Test
    fun `Properly formed Create transaction verifies`() {
        ledgerServices.ledger {
            transaction {
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Create())
                verifies()
            }
        }
    }

    @Test
    fun `Create transaction must contain no input`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Create())
                `fails with`("No inputs should be consumed when issuing a SimpleState.")
            }
        }
    }

    @Test
    fun `Create transaction must contain no more than one output`() {
        ledgerServices.ledger {
            transaction {
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Create())
                `fails with`("Only one output state should be created.")
            }
        }
    }

    @Test
    fun `Create transaction must be signed by the owner`() {
        ledgerServices.ledger {
            transaction {
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyB.publicKey), SimpleContract.Commands.Create())
                `fails with`("The participant must be the signer.")
            }
        }
    }

    @Test
    fun `Properly formed Update transaction verifies`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, newValue, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Update())
                verifies()
            }
        }
    }

    @Test
    fun `Update transaction must contain one input`() {
        ledgerServices.ledger {
            transaction {
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Update())
                `fails with`("There should be one input state")
            }
        }
    }

    @Test
    fun `Update transaction must contain no more than one input`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, newValue, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Update())
                `fails with`("There should be one input state")
            }
        }
    }

    @Test
    fun `Update transaction must contain one output`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Update())
                `fails with`("There should be one output state")
            }
        }
    }

    @Test
    fun `Update transaction must contain only one output`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, newValue, partyA.party))
                output(SimpleContract.ID, SimpleState(key, newValue, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Update())
                `fails with`("There should be one output state")
            }
        }
    }

    @Test
    fun `Update transaction must be signed by the owner`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyB.publicKey), SimpleContract.Commands.Update())
                `fails with`("The participant must be the signer.")
            }
        }
    }

    @Test
    fun `Properly formed Delete transaction verifies`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Delete())
                verifies()
            }
        }
    }

    @Test
    fun `Delete transaction must contain only one input`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Delete())
                `fails with`( "There should be one input state")
            }
        }
    }

    @Test
    fun `Delete transaction must contain no output`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                output(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyA.publicKey), SimpleContract.Commands.Delete())
                `fails with`("There should be no output state")
            }
        }
    }

    @Test
    fun `Delete transaction must be signed by the owner`() {
        ledgerServices.ledger {
            transaction {
                input(SimpleContract.ID, SimpleState(key, value, partyA.party))
                command(listOf(partyB.publicKey), SimpleContract.Commands.Delete())
                `fails with`("The participant must be the signer.")
            }
        }
    }
}


