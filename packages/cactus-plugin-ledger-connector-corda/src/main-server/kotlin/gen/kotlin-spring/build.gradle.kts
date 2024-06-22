import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

group = "org.hyperledger.cactus.plugin.ledger.connector.corda.server"
version = project.properties["version"]!!

val corda_release_group = "net.corda"
val corda_core_release_group =  "net.corda"
val corda_release_version = "4.12"
val corda_core_release_version = "4.12"
val spring_boot_version = "3.3.1"
val jackson_version = "2.16.1"

tasks.named<Test>("test") {
    useJUnitPlatform()
}

buildscript {
    repositories {
        maven { url = uri("https://repo1.maven.org/maven2") }
        maven { url = uri("https://download.corda.net/maven/corda-releases") }
        maven { url = uri("https://jitpack.io") }
    }
    dependencies {
        classpath("org.springframework.boot:spring-boot-gradle-plugin:3.3.1")
    }
}

repositories {
    maven { url = uri("https://repo1.maven.org/maven2") }
    maven { url = uri("https://download.corda.net/maven/corda-releases") }
    maven { url = uri("https://jitpack.io") }
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = JavaVersion.VERSION_17.toString()
}

plugins {
    val kotlinVersion = "1.9.24"
    id("org.jetbrains.kotlin.jvm") version kotlinVersion
    id("org.springframework.boot") version "3.3.1"
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.springframework.boot:spring-boot-starter-web:$spring_boot_version")
    implementation("org.springframework.boot:spring-boot-starter-validation:$spring_boot_version")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:$jackson_version")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml:$jackson_version")
    implementation("javax.json:javax.json-api:1.1.4")
    implementation("$corda_core_release_group:corda-core:$corda_core_release_version")
    implementation("$corda_core_release_group:corda-rpc:$corda_core_release_version")
    implementation("$corda_release_group:corda-jackson:$corda_release_version")
    implementation("$corda_release_group:corda-node-api:$corda_release_version")
    implementation("$corda_release_group:corda:$corda_release_version")

    implementation("co.paralleluniverse:quasar-core:0.7.12_r3")
    implementation("org.xeustechnologies:jcl-core:2.8")
    implementation("org.xeustechnologies:jcl-spring:2.8")
    implementation("com.fasterxml.jackson.core:jackson-core:$jackson_version")
    implementation("com.fasterxml.jackson.core:jackson-databind:$jackson_version")
    implementation("com.fasterxml.jackson.core:jackson-annotations:$jackson_version")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:$jackson_version")

    implementation("com.hierynomus:sshj:0.38.0")

    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.springframework.boot:spring-boot-starter-validation:$spring_boot_version")
    testImplementation("org.springframework.boot:spring-boot-starter-test:$spring_boot_version") {
        exclude(module = "junit")
    }
}

configurations {
    all {
        exclude(group = "junit", module = "junit")
        exclude(group = "org.junit.vintage", module = "junit-vintage-engine")

        resolutionStrategy.eachDependency {
            if (requested.group == "org.yaml" && requested.name == "snakeyaml") {
                useVersion("2.+")
                because("CVE-2022-1471, CVE-2022-25857, CVE-2022-1471 - SnakeYaml: Constructor Deserialization Remote Code Execution, snakeyaml: Denial of Service due to missing nested depth limitation for collections")
            } else if (requested.group == "org.springframework" && requested.name == "spring-web") {
                useVersion("[6.0.0,99[")
                because("CVE-2016-1000027 - https://avd.aquasec.com/nvd/cve-2016-1000027 spring: HttpInvokerServiceExporter readRemoteInvocation method untrusted java deserialization")
            } else if (requested.group == "org.apache.commons" && requested.name == "commons-configuration2") {
                useVersion("[2.8.0,99[")
                because("CVE-2022-33980 - CRITICAL - https://avd.aquasec.com/nvd/cve-2022-33980 - apache-commons-configuration: Apache Commons Configuration insecure interpolation defaults")
            }
        }
    }
}

repositories {
	maven { url = uri("https://repo1.maven.org/maven2") }
	maven { url = uri("https://repo.spring.io/snapshot") }
	maven { url = uri("https://repo.spring.io/milestone") }

    mavenLocal()
    mavenCentral()
    maven { url = uri("https://download.corda.net/maven/corda-dependencies") }
    maven { url = uri("https://jitpack.io") }
    maven { url = uri("https://repo.gradle.org/gradle/libs-releases-local") }
}
