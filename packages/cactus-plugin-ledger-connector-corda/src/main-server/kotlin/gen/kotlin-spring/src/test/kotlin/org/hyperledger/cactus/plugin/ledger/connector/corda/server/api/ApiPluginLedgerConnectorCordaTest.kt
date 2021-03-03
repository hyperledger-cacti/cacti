package org.hyperledger.cactus.plugin.ledger.connector.corda.server.api

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

import kotlin.test.assertNotNull

@SpringBootTest
class ApiPluginLedgerConnectorCordaTest {

    @Autowired
    private lateinit var service: ApiPluginLedgerConnectorCordaService;

    /**
    * Deploys a set of jar files (Cordapps, e.g. the contracts in Corda speak).
    *
    *
    *
    * @throws ApiException
    *          if the Api call fails
    */
//    @Test
//    fun deployContractJarsV1Test() {
//        val api: ApiPluginLedgerConnectorCordaController = ApiPluginLedgerConnectorCordaController(service)
//        val deployContractJarsV1Request = DeployContractJarsV1Request(
//                jarFiles = listOf(JarFile(filename = "my-cool-contract.jar", contentBase64 = "x==")))
//        val response: ResponseEntity<DeployContractJarsSuccessV1Response> = api.deployContractJarsV1(deployContractJarsV1Request)
//
//        println("TEST OK")
//        assert(true)
//        // TODO: test validations
//    }

    /**
    * Invokes a contract on a Corda ledger (e.g. a flow)
    *
    *
    *
    * @throws ApiException
    *          if the Api call fails
    */
    @Test
    fun invokeContractV1Test() {
        val api: ApiPluginLedgerConnectorCordaController = ApiPluginLedgerConnectorCordaController(service)
        val reqBodyJson = """
            {
              "flowFullClassName" : "net.corda.samples.obligation.flows.IOUIssueFlow",
              "flowInvocationType" : "TRACKED_FLOW_DYNAMIC",
              "params" : [ {
                "jvmTypeKind" : "REFERENCE",
                "jvmType" : {
                  "fqClassName" : "net.corda.samples.obligation.states.IOUState"
                },
                "primitiveValue" : null,
                "jvmCtorArgs" : [ {
                  "jvmTypeKind" : "REFERENCE",
                  "jvmType" : {
                    "fqClassName" : "net.corda.core.contracts.Amount"
                  },
                  "primitiveValue" : null,
                  "jvmCtorArgs" : [ {
                    "jvmTypeKind" : "PRIMITIVE",
                    "jvmType" : {
                      "fqClassName" : "long"
                    },
                    "primitiveValue" : 42,
                    "jvmCtorArgs" : null
                  }, {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "java.util.Currency"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "USD",
                      "jvmCtorArgs" : null
                    } ]
                  } ]
                }, {
                  "jvmTypeKind" : "REFERENCE",
                  "jvmType" : {
                    "fqClassName" : "net.corda.core.identity.Party"
                  },
                  "primitiveValue" : null,
                  "jvmCtorArgs" : [ {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "net.corda.core.identity.CordaX500Name"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "PartyA",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "London",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "GB",
                      "jvmCtorArgs" : null
                    } ]
                  }, {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "EdDSA",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "X.509",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "MCowBQYDK2VwAyEAac1p4wLsAh70VJOcudQppu7NnKxyoKxVN0DbfTxF+54=",
                      "jvmCtorArgs" : null
                    } ]
                  } ]
                }, {
                  "jvmTypeKind" : "REFERENCE",
                  "jvmType" : {
                    "fqClassName" : "net.corda.core.identity.Party"
                  },
                  "primitiveValue" : null,
                  "jvmCtorArgs" : [ {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "net.corda.core.identity.CordaX500Name"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "PartyB",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "New York",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "US",
                      "jvmCtorArgs" : null
                    } ]
                  }, {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "EdDSA",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "X.509",
                      "jvmCtorArgs" : null
                    }, {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "MCowBQYDK2VwAyEAoOv19eiCDJ7HzR9UrfwbFig7qcD1jkewKkkS4WF9kPA=",
                      "jvmCtorArgs" : null
                    } ]
                  } ]
                }, {
                  "jvmTypeKind" : "REFERENCE",
                  "jvmType" : {
                    "fqClassName" : "net.corda.core.contracts.Amount"
                  },
                  "primitiveValue" : null,
                  "jvmCtorArgs" : [ {
                    "jvmTypeKind" : "PRIMITIVE",
                    "jvmType" : {
                      "fqClassName" : "long"
                    },
                    "primitiveValue" : 1,
                    "jvmCtorArgs" : null
                  }, {
                    "jvmTypeKind" : "REFERENCE",
                    "jvmType" : {
                      "fqClassName" : "java.util.Currency"
                    },
                    "primitiveValue" : null,
                    "jvmCtorArgs" : [ {
                      "jvmTypeKind" : "PRIMITIVE",
                      "jvmType" : {
                        "fqClassName" : "java.lang.String"
                      },
                      "primitiveValue" : "USD",
                      "jvmCtorArgs" : null
                    } ]
                  } ]
                }, {
                  "jvmTypeKind" : "REFERENCE",
                  "jvmType" : {
                    "fqClassName" : "net.corda.core.contracts.UniqueIdentifier"
                  },
                  "primitiveValue" : null,
                  "jvmCtorArgs" : [ {
                    "jvmTypeKind" : "PRIMITIVE",
                    "jvmType" : {
                      "fqClassName" : "java.lang.String"
                    },
                    "primitiveValue" : "7fc2161e-f8d0-4c86-a596-08326bdafd56",
                    "jvmCtorArgs" : null
                  } ]
                } ]
              } ],
              "timeoutMs" : 60000
            }
        """.trimIndent()

        // Vanilla ObjectMapper is no good here because: https://stackoverflow.com/a/53191565/698470
        val objectMapper = jacksonObjectMapper()

        val jsonReader = objectMapper.readerFor(InvokeContractV1Request::class.java)
        val req = jsonReader.readValue<InvokeContractV1Request>(reqBodyJson)

        val res = api.invokeContractV1(req)
        assertNotNull(res, "invokeContractV1 response was null")
        assertNotNull(res.statusCode, "invokeContractV1 response.statusCode was null")
    }

}
