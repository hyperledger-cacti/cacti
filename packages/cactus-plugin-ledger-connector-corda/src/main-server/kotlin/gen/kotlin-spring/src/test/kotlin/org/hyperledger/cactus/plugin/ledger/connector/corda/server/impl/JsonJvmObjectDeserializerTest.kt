package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.*
import org.junit.jupiter.api.Test
import java.util.*
import kotlin.collections.ArrayList

enum class Direction {
    NORTH, SOUTH, WEST, EAST
}

class JsonJvmObjectDeserializerTest {

    companion object {
        val deserializer = JsonJvmObjectDeserializer()
    }

    @Test
    fun enumHappyPath() {
        val actual = Direction.WEST

        class FlightPlan(val direction: Direction)

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = FlightPlan::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Direction::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is FlightPlan)
        val flightPlan =  deserializedObject as FlightPlan
        val expected = flightPlan.direction
        assert(actual == expected)
    }

    @Test
    fun floatArrayHappyPath() {

        val actual = 42.42F

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = FloatArray::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Double::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is FloatArray)
        val array =  deserializedObject as FloatArray
        val expected = array[0]
        assert(actual == expected)
    }

    @Test
    fun doubleArrayHappyPath() {

        val actual = 42.42

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = DoubleArray::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Double::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is DoubleArray)
        val array =  deserializedObject as DoubleArray
        val expected = array[0]
        assert(actual == expected)
    }

    @Test
    fun intArrayHappyPath() {

        val actual = 42

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = IntArray::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Int::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is IntArray)
        val anIntArray =  deserializedObject as IntArray
        val expected = anIntArray[0]
        assert(actual == expected)
    }

    @Test
    fun byteArrayHappyPath() {

        val actual: Byte = 42

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = ByteArray::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Byte::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is ByteArray)
        val byteArray =  deserializedObject as ByteArray
        val expected = byteArray[0]
        assert(actual == expected)
    }

    @Test
    fun booleanArrayHappyPath() {

        val actual1 = true
        val actual2 = false

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = BooleanArray::class.java.name
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Boolean::class.java.name),
                    primitiveValue = actual1
                ),
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(Boolean::class.java.name),
                    primitiveValue = actual2
                )
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is BooleanArray)
        val array =  deserializedObject as BooleanArray
        val expected1 = array[0]
        assert(actual1 == expected1)

        val expected2 = array[1]
        assert(actual2 == expected2)
    }

    @Test
    fun invocationTargetHappyPath() {

        data class MyCustomClass(val id: String)

        class MyCustomFactory {
            fun createMyCustomClass(id: String): MyCustomClass {
                return MyCustomClass(id)
            }
        }

        val actual = UUID.randomUUID().toString()

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = MyCustomClass::class.java.name,
                constructorName = "createMyCustomClass",
                invocationTarget = JvmObject(
                    jvmTypeKind = JvmTypeKind.REFERENCE,
                    jvmType = JvmType(
                        fqClassName = MyCustomFactory::class.java.name
                    ),
                    jvmCtorArgs = emptyList()
                )
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(String::class.java.name),
                    primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is MyCustomClass)
        val myCustomClass =  deserializedObject as MyCustomClass
        val expected = myCustomClass.id
        assert(actual == expected)
    }

    @Test
    fun invocationTargetSadPath() {
        data class MyCustomClass(val id: String)

        class MyCustomFactory {
            fun createMyCustomClass(id: String): MyCustomClass {
                return MyCustomClass(id)
            }
        }

        val actual = UUID.randomUUID().toString()

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = MyCustomClass::class.java.name,
                constructorName = "createMyCustomClass",
                invocationTarget = JvmObject(
                    jvmTypeKind = JvmTypeKind.REFERENCE,
                    jvmType = JvmType(
                        fqClassName = MyCustomFactory::class.java.name
                    ),
                    jvmCtorArgs = listOf(
                        // this will make the constructor of the factory class (the invocation target)
                        // crash hard and we'll be there to assert that the exception message contains
                        // useful information
                        JvmObject(JvmTypeKind.PRIMITIVE, JvmType(Long::class.java.name), 1L)
                    )
                )
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(String::class.java.name),
                    primitiveValue = actual)
            )
        )

        try {
            deserializer.instantiate(jvmObject)
        } catch (ex: InstantiationException) {
            assert(ex.message.contains("Failed to instantiate invocation target for"))
            val factoryMethodName = jvmObject.jvmType.constructorName as String
            val factoryClassName = jvmObject.jvmType.invocationTarget?.jvmType?.fqClassName
            assert(ex.message.contains(factoryMethodName))
            assert(ex.message.contains(factoryClassName as String))
        }
    }

    @Test
    fun factoryMethodSadPath() {
        data class MyCustomClass(val id: String)

        class MyCustomFactory {
            fun createMyCustomClass(id: String): MyCustomClass {
                return MyCustomClass(id)
            }
        }

        val actual = UUID.randomUUID().toString()

        val jvmObject = JvmObject(
            jvmTypeKind = JvmTypeKind.REFERENCE,
            jvmType = JvmType(
                fqClassName = MyCustomClass::class.java.name,
                constructorName = "some-non-existent-method-name",
                invocationTarget = JvmObject(
                    jvmTypeKind = JvmTypeKind.REFERENCE,
                    jvmType = JvmType(
                        fqClassName = MyCustomFactory::class.java.name
                    ),
                    jvmCtorArgs = emptyList()
                )
            ),
            jvmCtorArgs = listOf(
                JvmObject(
                    jvmTypeKind = JvmTypeKind.PRIMITIVE,
                    jvmType = JvmType(String::class.java.name),
                    primitiveValue = actual)
            )
        )

        try {
            deserializer.instantiate(jvmObject)
        } catch (ex: ConstructorLookupException) {
            assert(ex.message.contains("Cannot find matching method for"))
            val factoryMethodName = jvmObject.jvmType.constructorName as String
            val factoryClassName = jvmObject.jvmType.invocationTarget?.jvmType?.fqClassName
            assert(ex.message.contains(factoryMethodName))
            assert(ex.message.contains(factoryClassName as String))
        }
    }

    @Test
    fun listOf() {
        val actual = UUID.randomUUID().toString()
        val jvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            JvmType(List::class.java.name),
            jvmCtorArgs = listOf(
                JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is List<*>)
        val list =  deserializedObject as List<*>
        assert(list.size == 1)
        val expected = list[0]
        assert(actual == expected)
    }

    @Test
    fun arrayOf() {
        val actual = UUID.randomUUID().toString()
        val jvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            JvmType(Array<Any>::class.java.name),
            jvmCtorArgs = listOf(
                JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is Array<*>)
        val list =  deserializedObject as Array<*>
        assert(list.size == 1)
        val expected = list[0]
        assert(actual == expected)
    }

    @Test
    fun arrayListOf() {
        val actual = UUID.randomUUID().toString()
        val jvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            JvmType(ArrayList::class.java.name),
            jvmCtorArgs = listOf(
                JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actual)
            )
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is ArrayList<*>)
        val list =  deserializedObject as ArrayList<*>
        assert(list.size == 1)
        val expected = list[0]
        assert(actual == expected)
    }

    @Test
    fun setOf() {
        val actual = UUID.randomUUID().toString()
        val listJvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            JvmType(Set::class.java.name),
            jvmCtorArgs = listOf(
                JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actual)
            )
        )

        val jvmObject = deserializer.instantiate(listJvmObject)
        assert(jvmObject is Set<*>)
        val list =  jvmObject as Set<*>
        assert(list.size == 1)
        val containsActual = list.contains(actual)
        assert(containsActual)
    }

    @Test
    fun mapOf() {
        val actualKey = UUID.randomUUID().toString()
        val actualValue = UUID.randomUUID().toString()
        val actualKeyJvmObject = JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actualKey)
        val actualValueJvmObject = JvmObject(JvmTypeKind.PRIMITIVE, JvmType(String::class.java.name), primitiveValue = actualValue)
        val actualPairJvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            jvmType = JvmType(Pair::class.java.name),
            jvmCtorArgs = listOf(actualKeyJvmObject, actualValueJvmObject)
        )
        val jvmObject = JvmObject(
            JvmTypeKind.REFERENCE,
            JvmType(Map::class.java.name),
            jvmCtorArgs = listOf(actualPairJvmObject)
        )

        val deserializedObject = deserializer.instantiate(jvmObject)
        assert(deserializedObject is Map<*, *>)
        val map =  deserializedObject as Map<*, *>
        assert(map.keys.contains(actualKey))
        val expectedValue = map[actualKey]
        assert(actualValue == expectedValue)
    }

}
