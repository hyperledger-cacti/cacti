import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

val corda_release_group = "net.corda"
val corda_core_release_group =  "net.corda"
val corda_release_version = "4.6"
val corda_core_release_version = "4.6"
val corda_platform_version = 5

tasks.named<Test>("test") {
    useJUnitPlatform()
}

buildscript {
    repositories {
        maven { url = uri("https://repo1.maven.org/maven2") }
    }
    dependencies {
        classpath("org.springframework.boot:spring-boot-gradle-plugin:2.2.0.M3")
    }
}

group = "org.hyperledger.cactus.plugin.ledger.connector.corda.server"
version = "0.3.0"

repositories {
    maven { url = uri("https://repo1.maven.org/maven2") }
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "1.8"
}

plugins {
    val kotlinVersion = "1.3.30"
    id("org.jetbrains.kotlin.jvm") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.jpa") version kotlinVersion
    id("org.jetbrains.kotlin.plugin.spring") version kotlinVersion
    id("org.springframework.boot") version "2.2.0.M3"
    id("io.spring.dependency-management") version "1.0.5.RELEASE"
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")
    implementation("javax.json:javax.json-api:1.1.4")
    implementation("$corda_core_release_group:corda-core:$corda_core_release_version")
    implementation("$corda_core_release_group:corda-rpc:$corda_core_release_version")
    implementation("$corda_release_group:corda-jackson:$corda_release_version")
    implementation("$corda_release_group:corda-node-api:$corda_release_version")
    implementation("$corda_release_group:corda:$corda_release_version")

    implementation("co.paralleluniverse:quasar-core:0.7.12_r3")
    implementation("org.xeustechnologies:jcl-core:2.8")
    implementation("org.xeustechnologies:jcl-spring:2.8")
    implementation("com.fasterxml.jackson.core:jackson-core:2.12.1")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.12.1")
    implementation("com.fasterxml.jackson.core:jackson-annotations:2.12.1")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.12.1")

    implementation("com.hierynomus:sshj:0.31.0")

    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(module = "junit")
    }
}

configurations {
    all {
        exclude(group = "junit", module = "junit")
        exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
    }
}

repositories {
	maven { url = uri("https://repo1.maven.org/maven2") }
	maven { url = uri("https://repo.spring.io/snapshot") }
	maven { url = uri("https://repo.spring.io/milestone") }

    mavenLocal()
    mavenCentral()
    maven { url = uri("https://ci-artifactory.corda.r3cev.com/artifactory/corda") }
    // Can be removed post-release - used to get nightly snapshot build.
    maven { url = uri("https://ci-artifactory.corda.r3cev.com/artifactory/corda-lib") }
    maven { url = uri("https://ci-artifactory.corda.r3cev.com/artifactory/corda-lib-dev") }
    maven { url = uri("https://jitpack.io") }
    maven { url = uri("https://repo.gradle.org/gradle/libs-releases-local") }
}
