package org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl

import net.corda.core.utilities.loggerFor
import net.schmizz.sshj.common.KeyType
import net.schmizz.sshj.transport.verification.HostKeyVerifier
import net.schmizz.sshj.transport.verification.OpenSSHKnownHosts
import net.schmizz.sshj.transport.verification.OpenSSHKnownHosts.KnownHostEntry
import java.io.*
import java.lang.RuntimeException
import java.nio.charset.Charset
import java.security.PublicKey
import java.util.*

// TODO: Once we are able to support host key verification this can be either
// deleted or just left alone if it actually ends up being used by the
// fix that makes it so that we can do host key verification.
class InMemoryHostKeyVerifier(inputStream: InputStream?, charset: Charset?) :
    HostKeyVerifier {
    private val entries: MutableList<KnownHostEntry> = ArrayList()

    companion object {
        val logger = loggerFor<InMemoryHostKeyVerifier>()
    }

    init {

        // we construct the OpenSSHKnownHosts instance with a dummy file that does not exist because
        // that's the only way to trick it into doing nothing on the file system which is what we want
        // since this implementation is about providing an in-memory host key verification process...
        val nonExistentFilePath = UUID.randomUUID().toString()
        val hostsFile = File(nonExistentFilePath)
        val openSSHKnownHosts = OpenSSHKnownHosts(hostsFile)

        // we just wanted an EntryFactory which we could not instantiate without instantiating the OpenSSHKnownHosts
        // class as well (which is a limitation of Kotlin compared to Java it seems).
        val entryFactory: OpenSSHKnownHosts.EntryFactory = openSSHKnownHosts.EntryFactory()
        val reader = BufferedReader(InputStreamReader(inputStream, charset))
        while (reader.ready()) {
            val line = reader.readLine()
            try {
                logger.debug("Parsing line {}", line)
                val entry = entryFactory.parseEntry(line)
                if (entry != null) {
                    entries.add(entry)
                    logger.debug("Added entry {}", entry)
                }
            } catch (e: Exception) {
                throw RuntimeException("Failed to init InMemoryHostKeyVerifier", e)
            }
        }
        logger.info("Parsing of host key entries successful.")
    }

    override fun verify(hostname: String, port: Int, key: PublicKey): Boolean {
        logger.debug("Verifying {}:{} {}", hostname, port, key)
        val type = KeyType.fromKey(key)
        if (type === KeyType.UNKNOWN) {
            logger.debug("Rejecting key due to unknown key type {}", type)
            return false
        }
        for (e in entries) {
            try {
                if (e.appliesTo(type, hostname) && e.verify(key)) {
                    logger.debug("Accepting key type {} for host {} with key of {}", type, hostname, key)
                    return true
                }
            } catch (ioe: IOException) {
                throw RuntimeException("Crashed while attempting to verify key type $type for host $hostname ", ioe)
            }
        }
        logger.debug("Rejecting due to none of the {} entries being acceptable.", entries.size)
        return false
    }
}