package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.ObjectWriter
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.stereotype.Service
import net.corda.core.flows.FlowLogic
import net.corda.core.messaging.CordaRPCOps;
import net.corda.core.messaging.FlowProgressHandle
import net.corda.core.node.NodeDiagnosticInfo
import net.corda.core.transactions.SignedTransaction
import net.corda.core.utilities.loggerFor
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.api.ApiPluginLedgerConnectorCordaService
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.*
import org.xeustechnologies.jcl.JarClassLoader
import java.lang.IllegalArgumentException
import java.lang.IllegalStateException
import java.lang.RuntimeException
import java.lang.reflect.Constructor
import java.util.*
import java.util.concurrent.TimeUnit


@Service()
class ApiPluginLedgerConnectorCordaServiceImpl(
    val rpc: NodeRPCConnection = NodeRPCConnection("localhost", "user1", "test", 10006)
) : ApiPluginLedgerConnectorCordaService {

    companion object {

        // FIXME: do not recreate the mapper for every service implementation instance that we create...
        val mapper: ObjectMapper = jacksonObjectMapper()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)

        val writer: ObjectWriter = mapper.writer()

        val jcl: JarClassLoader = JarClassLoader(ApiPluginLedgerConnectorCordaServiceImpl::class.java.classLoader)

        val logger = loggerFor<ApiPluginLedgerConnectorCordaServiceImpl>()

        // If something is missing from here that's because they also missed at in the documentation:
        // https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html
        val exoticTypes: Map<String, Class<*>> = mapOf(

            "byte" to Byte::class.java,
            "char" to Char::class.java,
            "int" to Int::class.java,
            "short" to Short::class.java,
            "long" to Long::class.java,
            "float" to Float::class.java,
            "double" to Double::class.java,
            "boolean" to Boolean::class.java,

            "byte[]" to ByteArray::class.java,
            "char[]" to CharArray::class.java,
            "int[]" to IntArray::class.java,
            "short[]" to ShortArray::class.java,
            "long[]" to LongArray::class.java,
            "float[]" to FloatArray::class.java,
            "double[]" to DoubleArray::class.java,
            "boolean[]" to BooleanArray::class.java
        )
    }

    fun getOrInferType(fqClassName: String): Class<*> {
        Objects.requireNonNull(fqClassName, "fqClassName must not be null for its type to be inferred.")

        return if (exoticTypes.containsKey(fqClassName)) {
            exoticTypes.getOrElse(
                fqClassName,
                { throw IllegalStateException("Could not locate Class<*> for $fqClassName Exotic JVM types map must have been modified on a concurrent threat.") })
        } else {
            try {
                jcl.loadClass(fqClassName, true)
            } catch (ex: ClassNotFoundException) {
                Class.forName(fqClassName)
            }
        }
    }

    fun instantiate(jvmObject: JvmObject): Any? {
        logger.info("Instantiating ... JvmObject={}", jvmObject)

        val clazz = getOrInferType(jvmObject.jvmType.fqClassName)

        if (jvmObject.jvmTypeKind == JvmTypeKind.REFERENCE) {
            if (jvmObject.jvmCtorArgs == null) {
                throw IllegalArgumentException("jvmObject.jvmCtorArgs cannot be null when jvmObject.jvmTypeKind == JvmTypeKind.REFERENCE")
            }
            val constructorArgs: Array<Any?> = jvmObject.jvmCtorArgs.map { x -> instantiate(x) }.toTypedArray()

            if (List::class.java.isAssignableFrom(clazz)) {
                return listOf(*constructorArgs)
            } else if (Currency::class.java.isAssignableFrom(clazz)) {
                // FIXME introduce a more dynamic/flexible way of handling classes with no public constructors....
                return Currency.getInstance(jvmObject.jvmCtorArgs.first().primitiveValue as String)
            } else if (Array<Any>::class.java.isAssignableFrom(clazz)) {
                // TODO verify that this actually works and also
                // if we need it at all since we already have lists covered
                return arrayOf(*constructorArgs)
            }
            val constructorArgTypes: List<Class<*>> = jvmObject.jvmCtorArgs.map { x -> getOrInferType(x.jvmType.fqClassName) }
            val constructor: Constructor<*>
            try {
                constructor = clazz.constructors
                    .filter { c -> c.parameterCount == constructorArgTypes.size }
                    .single { c ->
                        c.parameterTypes
                            .mapIndexed { index, clazz -> clazz.isAssignableFrom(constructorArgTypes[index]) }
                            .all { x -> x }
                    }
            } catch (ex: NoSuchElementException) {
                val argTypes = jvmObject.jvmCtorArgs.joinToString(",") { x -> x.jvmType.fqClassName }
                val className = jvmObject.jvmType.fqClassName
                val constructorsAsStrings = clazz.constructors
                    .mapIndexed { i, c -> "$className->Constructor#${i + 1}(${c.parameterTypes.joinToString { p -> p.name }})" }
                    .joinToString(" ;; ")
                val targetConstructor = "Cannot find matching constructor for ${className}(${argTypes})"
                val availableConstructors = "Searched among the ${clazz.constructors.size} available constructors: $constructorsAsStrings"
                throw RuntimeException("$targetConstructor --- $availableConstructors")
            }

            logger.info("Constructor=${constructor}")
            constructorArgs.forEachIndexed { index, it -> logger.info("Constructor ARGS: #${index} -> $it") }
            val instance = constructor.newInstance(*constructorArgs)
            logger.info("Instantiated REFERENCE OK {}", instance)
            return instance
        } else if (jvmObject.jvmTypeKind == JvmTypeKind.PRIMITIVE) {
            logger.info("Instantiated PRIMITIVE OK {}", jvmObject.primitiveValue)
            return jvmObject.primitiveValue
        } else {
            throw IllegalArgumentException("Unknown jvmObject.jvmTypeKind (${jvmObject.jvmTypeKind})")
        }
    }

    fun dynamicInvoke(rpc: CordaRPCOps, req: InvokeContractV1Request): InvokeContractV1Response {
        @Suppress("UNCHECKED_CAST")
        val classFlowLogic = getOrInferType(req.flowFullClassName) as Class<out FlowLogic<*>>
        val params = req.params.map { p -> instantiate(p) }.toTypedArray()
        logger.info("params={}", params)

        val flowHandle = when (req.flowInvocationType) {
            FlowInvocationType.TRACKED_FLOW_DYNAMIC -> rpc.startTrackedFlowDynamic(classFlowLogic, *params)
            FlowInvocationType.FLOW_DYNAMIC -> rpc.startFlowDynamic(classFlowLogic, *params)
        }

        val timeoutMs: Long = req.timeoutMs?.toLong() ?: 60000

        val progress: List<String> = when (req.flowInvocationType) {
            FlowInvocationType.TRACKED_FLOW_DYNAMIC -> (flowHandle as FlowProgressHandle<*>)
                .progress
                .toList()
                .toBlocking()
                .first()
            FlowInvocationType.FLOW_DYNAMIC -> emptyList()
        }
        val returnValue = flowHandle.returnValue.get(timeoutMs, TimeUnit.MILLISECONDS)
        val id = flowHandle.id

        logger.info("Progress(${progress.size})={}", progress)
        logger.info("ReturnValue={}", returnValue)
        logger.info("Id=$id")
        // FIXME: If the full return value (SignedTransaction instance) gets returned as "returnValue"
        // then Jackson crashes like this:
        // 2021-03-01 06:58:25.608 ERROR 7 --- [nio-8080-exec-7] o.a.c.c.C.[.[.[/].[dispatcherServlet]:
        // Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception
        // [Request processing failed; nested exception is org.springframework.http.converter.HttpMessageNotWritableException:
        // Could not write JSON: Failed to deserialise group OUTPUTS_GROUP at index 0 in transaction:
        // net.corda.samples.obligation.states.IOUState: Interface net.corda.core.contracts.LinearState
        // requires a field named participants but that isn't found in the schema or any superclass schemas;
        // nested exception is com.fasterxml.jackson.databind.JsonMappingException:
        // Failed to deserialise group OUTPUTS_GROUP at index 0 in transaction: net.corda.samples.obligation.states.IOUState:
        // Interface net.corda.core.contracts.LinearState requires a field named participants but that isn't found in
        // the schema or any superclass schemas (through reference chain:
        // org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response["returnValue"]->
        // net.corda.client.jackson.internal.StxJson["wire"]->net.corda.client.jackson.internal.WireTransactionJson["outputs"])]
        // with root cause
        return InvokeContractV1Response(id.toString(), progress, (returnValue as SignedTransaction).id)
    }

    override fun deployContractJarsV1(deployContractJarsV1Request: DeployContractJarsV1Request?): DeployContractJarsSuccessV1Response {
        try {
            val decoder = Base64.getDecoder()
            val deployedJarFileNames = deployContractJarsV1Request!!.jarFiles.map {
                val jarFileInputStream = decoder.decode(it.contentBase64).inputStream()
                jcl.add(jarFileInputStream)
                // FIXME SSH jar upload needs to be implemented as well
                it.filename
            }

            return DeployContractJarsSuccessV1Response(deployedJarFileNames)
        } catch (ex: Throwable) {
            logger.error("Failed to serve DeployContractJarsV1Request", ex)
            throw ex
        }
    }

    override fun diagnoseNodeV1(diagnoseNodeV1Request: DiagnoseNodeV1Request?): DiagnoseNodeV1Response {
        val reader = mapper.readerFor(object : TypeReference<org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeDiagnosticInfo?>() {})

        val nodeDiagnosticInfoCorda = rpc.proxy.nodeDiagnosticInfo()

        val json = writer.writeValueAsString(nodeDiagnosticInfoCorda)
        logger.debug("NodeDiagnosticInfo JSON=\n{}", json)

        val nodeDiagnosticInfoCactus = reader.readValue<org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeDiagnosticInfo>(json)
        logger.debug("Responding with marshalled org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeDiagnosticInfo: {}", nodeDiagnosticInfoCactus)
        return DiagnoseNodeV1Response(nodeDiagnosticInfo = nodeDiagnosticInfoCactus)
    }

    override fun invokeContractV1(invokeContractV1Request: InvokeContractV1Request?): InvokeContractV1Response {
        Objects.requireNonNull(invokeContractV1Request, "InvokeContractV1Request must be non-null!")
        return dynamicInvoke(rpc.proxy, invokeContractV1Request!!)
    }

    override fun listFlowsV1(listFlowsV1Request: ListFlowsV1Request?): ListFlowsV1Response {
        val flows = rpc.proxy.registeredFlows()
        return ListFlowsV1Response(flows)
    }

    override fun networkMapV1(body: Any?): List<NodeInfo> {
        val reader = mapper.readerFor(object : TypeReference<List<NodeInfo?>?>() {})

        val networkMapSnapshot = rpc.proxy.networkMapSnapshot()
        val networkMapJson = writer.writeValueAsString(networkMapSnapshot)
        logger.trace("networkMapSnapshot=\n{}", networkMapJson)

        val nodeInfoList = reader.readValue<List<NodeInfo>>(networkMapJson)
        logger.info("Returning {} NodeInfo elements in response.", nodeInfoList.size)
        return nodeInfoList;
    }
}
