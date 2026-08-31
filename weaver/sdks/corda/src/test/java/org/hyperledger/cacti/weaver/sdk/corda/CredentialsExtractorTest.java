/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package org.hyperledger.cacti.weaver.sdk.corda;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.TreeSet;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * End-to-end tests for {@link CredentialsExtractor}.
 *
 * The only public entry point is {@link CredentialsExtractor#getConfig(String, String[])},
 * and its only consumer is {@code CredentialsCreator}. These tests treat {@code getConfig}
 * as a black box.
 *
 * Happy path: run {@code getConfig} against the real Corda dev-network keystores under test
 * resources and compare the output against a committed golden snapshot
 * ({@code expected/credentials-config.json}). The snapshot was produced once from
 * {@code getConfig} itself and reviewed as correct, so the tests deliberately do NOT
 * re-implement any part of credential extraction (no keystore loading, no chain walking, no
 * PEM/X.509 decoding). That keeps them immune to dependency updates (BouncyCastle, the JCE
 * providers, etc.) — only a genuine change in the extracted output can make them fail.
 * Comparison is semantic (via {@code org.json}) so JSON key ordering is irrelevant, and the
 * node set is taken from the golden file rather than hard-coded, so the number of nodes is
 * not assumed.
 *
 * Error path: {@code getConfig} must fail with a descriptive exception (not an opaque NPE)
 * when a node keystore is missing or contains no valid identity chain.
 */
public class CredentialsExtractorTest {

	private static final String GOLDEN_RESOURCE = "expected/credentials-config.json";

	/** Base path of the valid dev-network nodes. Ends with a separator, as getConfig expects. */
	private static String baseNodesPath() {
		return resourceDir("corda-network/nodes");
	}

	private static String resourceDir(String resource) {
		URL url = CredentialsExtractorTest.class.getClassLoader().getResource(resource);
		assertNotNull(url, "test resource " + resource + " must be on the classpath");
		String path = new File(url.getPath()).getAbsolutePath();
		return path.endsWith(File.separator) ? path : path + File.separator;
	}

	/** getConfig output for the given nodes, parsed as JSON. */
	private static JSONObject runConfig(String base, String[] nodes) {
		String json = CredentialsExtractor.getConfig(base, nodes);
		assertNotNull(json, "getConfig returned null");
		return new JSONObject(json);
	}

	/** The committed golden snapshot, read from the test classpath. */
	private static JSONObject goldenConfig() throws Exception {
		try (InputStream in = CredentialsExtractorTest.class.getClassLoader().getResourceAsStream(GOLDEN_RESOURCE)) {
			assertNotNull(in, "golden resource " + GOLDEN_RESOURCE + " must be on the classpath");
			return new JSONObject(new String(in.readAllBytes(), StandardCharsets.UTF_8));
		}
	}

	private static Set<String> keys(JSONObject o) {
		return new TreeSet<>(o.keySet());
	}

	/** The node names to request, taken from the golden snapshot (not hard-coded). */
	private static String[] goldenNodes() throws Exception {
		return keys(goldenConfig()).toArray(new String[0]);
	}

	// ---------- Happy path ----------

	@Test
	void getConfigMatchesGoldenSnapshot() throws Exception {
		JSONObject expected = goldenConfig();
		JSONObject actual = runConfig(baseNodesPath(), goldenNodes());
		// org.json's similar() is a deep, order-independent value comparison.
		assertTrue(expected.similar(actual),
				"getConfig output no longer matches expected/credentials-config.json.\nExpected: "
						+ expected + "\nActual:   " + actual);
	}

	@Test
	void topLevelNodesMatchGolden() throws Exception {
		assertEquals(keys(goldenConfig()), keys(runConfig(baseNodesPath(), goldenNodes())),
				"set of node entries differs from the golden snapshot");
	}

	@Test
	void eachNodeMatchesGoldenFieldByField() throws Exception {
		JSONObject expected = goldenConfig();
		JSONObject actual = runConfig(baseNodesPath(), goldenNodes());
		for (String node : keys(expected)) {
			assertTrue(actual.has(node), "missing node entry: " + node);
			JSONObject expNode = expected.getJSONObject(node);
			JSONObject actNode = actual.getJSONObject(node);
			assertEquals(keys(expNode), keys(actNode), node + ": field set differs from golden");
			for (String field : keys(expNode)) {
				Object expVal = expNode.get(field);
				Object actVal = actNode.get(field);
				if (expVal instanceof JSONArray) {
					assertTrue(((JSONArray) expVal).similar(actVal), node + "." + field + " differs from golden");
				} else {
					assertEquals(expVal, actVal, node + "." + field + " differs from golden");
				}
			}
		}
	}

	@Test
	void getConfigExtractsEachNodeIndividually() throws Exception {
		JSONObject golden = goldenConfig();
		// Request each node on its own: proves per-node extraction is independent and
		// position-agnostic (no cross-wiring between nodes).
		for (String node : goldenNodes()) {
			JSONObject actual = runConfig(baseNodesPath(), new String[] { node });
			assertEquals(new TreeSet<>(Set.of(node)), keys(actual),
					"requesting only " + node + " must yield exactly that node");
			assertTrue(golden.getJSONObject(node).similar(actual.getJSONObject(node)),
					node + " differs from golden when requested alone");
		}
	}

	@Test
	void getConfigHandlesVaryingNodeCountsAndOrder() throws Exception {
		JSONObject golden = goldenConfig();
		String[] all = goldenNodes();
		// Reversed full set (order-independence at full count) plus, when available, a
		// 3-node and a 2-node subset — so counts other than 0/1/N are also exercised.
		java.util.List<String[]> subsets = new java.util.ArrayList<>();
		String[] reversed = all.clone();
		java.util.Collections.reverse(java.util.Arrays.asList(reversed));
		subsets.add(reversed);
		if (all.length >= 3) {
			subsets.add(new String[] { all[0], all[1], all[2] });
		}
		if (all.length >= 2) {
			subsets.add(new String[] { all[1], all[0] });
		}
		for (String[] subset : subsets) {
			JSONObject actual = runConfig(baseNodesPath(), subset);
			assertEquals(new TreeSet<>(Set.of(subset)), keys(actual),
					"output nodes must be exactly the requested subset " + Set.of(subset));
			for (String node : subset) {
				assertTrue(golden.getJSONObject(node).similar(actual.getJSONObject(node)),
						node + " differs from golden in subset of size " + subset.length);
			}
		}
	}

	@Test
	void emptyNodeListYieldsEmptyJsonObject() {
		assertEquals(0, runConfig(baseNodesPath(), new String[] {}).length(),
				"empty node list must yield an empty JSON object");
	}

	// ---------- Error path: fail loudly with a descriptive message ----------

	@Test
	void missingKeystoreThrowsDescriptiveException() {
		RuntimeException ex = assertThrows(RuntimeException.class,
				() -> CredentialsExtractor.getConfig(baseNodesPath(), new String[] { "DoesNotExist" }));
		assertNotNull(ex.getMessage(), "exception must carry a message");
		assertTrue(ex.getMessage().contains("keystore file not found"),
				"message should explain the file is missing, was: " + ex.getMessage());
		assertTrue(ex.getMessage().contains("nodekeystore.jks"),
				"message should name the missing keystore path, was: " + ex.getMessage());
	}

	@Test
	void keystoreWithoutValidChainThrowsDescriptiveException() {
		// corda-network-invalid/BadNode holds a trust-store (no length-4 identity chain) as its nodekeystore.jks.
		String invalidBase = resourceDir("corda-network-invalid");
		RuntimeException ex = assertThrows(RuntimeException.class,
				() -> CredentialsExtractor.getConfig(invalidBase, new String[] { "BadNode" }));
		assertNotNull(ex.getMessage(), "exception must carry a message");
		assertTrue(ex.getMessage().contains("identity certificate chain"),
				"message should explain the chain could not be extracted, was: " + ex.getMessage());
		assertTrue(ex.getMessage().contains("BadNode"),
				"message should name the offending node, was: " + ex.getMessage());
	}

	@Test
	void getConfigFailsFastWhenAnyNodeIsInvalid() throws Exception {
		// A valid node followed by a missing one: getConfig must throw rather than return a
		// partial config for the good node.
		String good = goldenNodes()[0];
		RuntimeException ex = assertThrows(RuntimeException.class,
				() -> CredentialsExtractor.getConfig(baseNodesPath(), new String[] { good, "DoesNotExist" }));
		assertNotNull(ex.getMessage(), "exception must carry a message");
		assertTrue(ex.getMessage().contains("keystore file not found"),
				"message should explain the missing keystore, was: " + ex.getMessage());
		assertTrue(ex.getMessage().contains("DoesNotExist"),
				"message should name the offending node, was: " + ex.getMessage());
	}

	@Test
	void corruptKeystoreThrowsDescriptiveException() {
		// corda-network-invalid/CorruptNode holds a nodekeystore.jks that exists but is not a
		// valid keystore, so KeyStore.load fails.
		String invalidBase = resourceDir("corda-network-invalid");
		RuntimeException ex = assertThrows(RuntimeException.class,
				() -> CredentialsExtractor.getConfig(invalidBase, new String[] { "CorruptNode" }));
		assertNotNull(ex.getMessage(), "exception must carry a message");
		assertTrue(ex.getMessage().contains("failed to load keystore"),
				"message should explain the keystore could not be loaded, was: " + ex.getMessage());
		assertTrue(ex.getMessage().contains("nodekeystore.jks"),
				"message should name the keystore path, was: " + ex.getMessage());
	}

	/**
	 * The following four fixtures each hold a 4-certificate chain that is the right length but
	 * does not form a valid chain, exercising the distinct rejection paths in the chain
	 * validator. The malformed keystores were generated with BouncyCastle and committed as
	 * opaque binaries. From the caller's perspective the observable behaviour is identical:
	 * getConfig must reject the node with a descriptive "identity certificate chain" error
	 * rather than emit credentials from an unverified chain.
	 */
	@Test
	void unrelatedCertChainThrowsDescriptiveException() {
		// UnrelatedChainNode: four unrelated self-signed certs; issuer of one does not match the
		// subject of the next (DN-linkage check fails).
		assertInvalidChainRejected("UnrelatedChainNode");
	}

	@Test
	void nonSelfSignedTopCertChainThrowsDescriptiveException() {
		// NonSelfSignedTopNode: lower links chain correctly, but the top cert is not self-signed
		// (the chain never terminates in a self-signed root).
		assertInvalidChainRejected("NonSelfSignedTopNode");
	}

	@Test
	void badSignatureCertChainThrowsDescriptiveException() {
		// BadSignatureNode: DNs line up but a certificate is signed by the wrong key, so the
		// signature verification fails.
		assertInvalidChainRejected("BadSignatureNode");
	}

	@Test
	void selfSignedTopWithBadSignatureThrowsDescriptiveException() {
		// SelfSignedBadSigNode: lower links chain correctly and the top cert looks self-signed
		// (issuer == subject) but is signed by a different key, so its self-verification fails.
		assertInvalidChainRejected("SelfSignedBadSigNode");
	}

	private static void assertInvalidChainRejected(String node) {
		String invalidBase = resourceDir("corda-network-invalid");
		RuntimeException ex = assertThrows(RuntimeException.class,
				() -> CredentialsExtractor.getConfig(invalidBase, new String[] { node }));
		assertNotNull(ex.getMessage(), "exception must carry a message");
		assertTrue(ex.getMessage().contains("identity certificate chain"),
				"message should explain the chain could not be extracted, was: " + ex.getMessage());
		assertTrue(ex.getMessage().contains(node),
				"message should name the offending node, was: " + ex.getMessage());
	}
}
