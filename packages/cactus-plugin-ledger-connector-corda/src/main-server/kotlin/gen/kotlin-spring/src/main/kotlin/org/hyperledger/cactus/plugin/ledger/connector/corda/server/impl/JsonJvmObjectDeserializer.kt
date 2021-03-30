package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.utilities.loggerFor
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmObject
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmTypeKind
import org.xeustechnologies.jcl.JarClassLoader
import java.lang.Exception
import java.lang.IllegalStateException
import java.lang.RuntimeException
import java.lang.reflect.Constructor
import java.lang.reflect.Method
import java.util.*
import kotlin.collections.ArrayList

// FIXME: Make it so that this has a memory, remembering the .jar files that were added before (file-system?) or
// maybe use the keychain to save it there and then it can pre-populate at boot?
class JsonJvmObjectDeserializer(
    val jcl: JarClassLoader = JarClassLoader(JsonJvmObjectDeserializer::class.java.classLoader)
) {

    companion object {
        val logger = loggerFor<JsonJvmObjectDeserializer>()

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

        when (jvmObject.jvmTypeKind) {
            JvmTypeKind.REFERENCE -> {
                if (jvmObject.jvmCtorArgs == null) {
                    throw IllegalArgumentException("jvmObject.jvmCtorArgs cannot be null when jvmObject.jvmTypeKind == JvmTypeKind.REFERENCE")
                }
                val constructorArgs: Array<Any?> = jvmObject.jvmCtorArgs.map { x -> instantiate(x) }.toTypedArray()

                when {
                    DoubleArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Double }
                            .toDoubleArray()
                    }
                    FloatArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Float }
                            .toFloatArray()
                    }
                    LongArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Long }
                            .toLongArray()
                    }
                    ShortArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Short }
                            .toShortArray()
                    }
                    CharArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Char }
                            .toCharArray()
                    }
                    BooleanArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Boolean }
                            .toBooleanArray()
                    }
                    IntArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Int }
                            .toIntArray()
                    }
                    ByteArray::class.java.isAssignableFrom(clazz) -> {
                        return constructorArgs
                            .map { ca -> ca as Byte }
                            .toByteArray()
                    }
                    ArrayList::class.java.isAssignableFrom(clazz) -> {
                        return arrayListOf(*constructorArgs)
                    }
                    Array<Any>::class.java.isAssignableFrom(clazz) -> {
                        return arrayOf(*constructorArgs)
                    }
                    List::class.java.isAssignableFrom(clazz) -> {
                        return listOf(*constructorArgs)
                    }
                    Set::class.java.isAssignableFrom(clazz) -> {
                        return setOf(*constructorArgs)
                    }
                    Map::class.java.isAssignableFrom(clazz) -> {
                        val constructorArgsCasted = constructorArgs
                            .map { ca -> ca as Pair<*, *> }
                            .toTypedArray()

                        return mapOf(*constructorArgsCasted)
                    }
                    jvmObject.jvmType.constructorName != null -> {
                        val methodArgTypes: List<Class<*>> =
                            jvmObject.jvmCtorArgs.map { x -> getOrInferType(x.jvmType.fqClassName) }

                        var invocationTarget: Any? = null
                        if (jvmObject.jvmType.invocationTarget != null) {
                            try {
                                logger.debug("Instantiating InvocationTarget: ${jvmObject.jvmType.invocationTarget}")
                                invocationTarget = instantiate(jvmObject.jvmType.invocationTarget)
                                logger.debug("Instantiated OK InvocationTarget: ${jvmObject.jvmType.invocationTarget}")
                                logger.debug("InvocationTarget: $invocationTarget")
                            } catch (ex: Exception) {
                                val argTypes = jvmObject.jvmCtorArgs.joinToString(",") { x -> x.jvmType.fqClassName }
                                val className = jvmObject.jvmType.fqClassName
                                val constructorName = jvmObject.jvmType.constructorName
                                val message = "Failed to instantiate invocation target for " +
                                        "JvmType:${className}${constructorName}(${argTypes}) with an " +
                                        "InvocationTarget: ${jvmObject.jvmType.invocationTarget}"
                                throw InstantiationException(message, ex)
                            }
                        }

                        val factoryClass: Class<*> = if (invocationTarget == null) clazz else invocationTarget::class.java

                        val factoryMethod: Method
                        try {
                            factoryMethod = factoryClass.methods
                                .filter { c -> c.name == jvmObject.jvmType.constructorName }
                                .filter { c -> c.parameterCount == methodArgTypes.size }
                                .single { c ->
                                    c.parameterTypes
                                        .mapIndexed { index, clazz -> clazz.isAssignableFrom(methodArgTypes[index]) }
                                        .all { x -> x }
                                }
                        } catch (ex: NoSuchElementException) {
                            val argTypes = jvmObject.jvmCtorArgs.joinToString(",") { x -> x.jvmType.fqClassName }
                            val className = factoryClass.name
                            val methodsAsStrings =
                                factoryClass.methods.joinToString("\n") { c -> "$className#${c.name}(${c.parameterTypes.joinToString { p -> p.name }})" }
                            val targetMethod = "Cannot find matching method for ${className}#${jvmObject.jvmType.constructorName}(${argTypes})"
                            val availableMethods =
                                "Searched among the ${clazz.methods.size} available methods: $methodsAsStrings"
                            throw ConstructorLookupException("$targetMethod --- $availableMethods")
                        }

                        logger.info("Constructor=${factoryMethod}")
                        constructorArgs.forEachIndexed { index, it -> logger.info("Constructor ARGS: #${index} -> $it") }

                        val instance = factoryMethod.invoke(invocationTarget, *constructorArgs)
                        logger.info("Instantiated REFERENCE OK {}", instance)
                        return instance
                    }
                    else -> {
                        val constructorArgTypes: List<Class<*>> =
                            jvmObject.jvmCtorArgs.map { x -> getOrInferType(x.jvmType.fqClassName) }
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
                            val availableConstructors =
                                "Searched among the ${clazz.constructors.size} available constructors: $constructorsAsStrings"
                            throw RuntimeException("$targetConstructor --- $availableConstructors")
                        }

                        logger.info("Constructor=${constructor}")
                        constructorArgs.forEachIndexed { index, it -> logger.info("Constructor ARGS: #${index} -> $it") }
                        val instance = constructor.newInstance(*constructorArgs)
                        logger.info("Instantiated REFERENCE OK {}", instance)
                        return instance
                    }
                }

            }
            JvmTypeKind.PRIMITIVE -> {
                logger.info("Instantiated PRIMITIVE OK {}", jvmObject.primitiveValue)
                return jvmObject.primitiveValue
            }
            else -> {
                throw IllegalArgumentException("Unknown jvmObject.jvmTypeKind (${jvmObject.jvmTypeKind})")
            }
        }
    }
}