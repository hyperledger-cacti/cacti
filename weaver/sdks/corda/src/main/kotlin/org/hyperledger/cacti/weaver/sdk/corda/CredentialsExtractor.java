/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 
package org.hyperledger.cacti.weaver.sdk.corda;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.security.InvalidKeyException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.SignatureException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Enumeration;
import java.util.Vector;

import javax.naming.InvalidNameException;
import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;

import org.bouncycastle.openssl.jcajce.JcaPEMWriter;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * @author VENKATRAMANRAMAKRISH
 *
 */
public class CredentialsExtractor {

	private static boolean isSelfSignedCertificate(X509Certificate xcert) {
		if (xcert == null) throw new NullPointerException("No certificate provided");
		if (!xcert.getIssuerX500Principal().getName().equals(xcert.getSubjectX500Principal().getName())) {
			return false;
		}
		try {
			xcert.verify(xcert.getPublicKey());
		} catch (InvalidKeyException | CertificateException | NoSuchAlgorithmException | NoSuchProviderException
				| SignatureException e) {
			e.printStackTrace();
			return false;
		}
		return true;
	}

	// Assume that the chain rises up in the hierarchy from low to high index
	private static boolean isValidCertificateChain(X509Certificate xcerts[]) {
		for (int i = 0 ; i< xcerts.length ; i++) {
			if (i == xcerts.length - 1) {
				return isSelfSignedCertificate(xcerts[i]);
			} else {
				if (!xcerts[i].getIssuerX500Principal().getName().equals(xcerts[i + 1].getSubjectX500Principal().getName())) {
					return false;
				}
				try {
					xcerts[i].verify(xcerts[i + 1].getPublicKey());
				} catch (InvalidKeyException | CertificateException | NoSuchAlgorithmException | NoSuchProviderException
						| SignatureException e) {
					e.printStackTrace();
					return false;
				}
			}
		}
		return true;
	}

	private static void loadKeyStore(KeyStore ks, String path) {
		File keyStoreFile = new File(path);
		if (!keyStoreFile.exists()) {
			throw new IllegalArgumentException("CredentialsExtractor: keystore file not found: " + path);
		}
		try (FileInputStream fis = new FileInputStream(keyStoreFile)) {
			ks.load(fis, null);
		} catch (NoSuchAlgorithmException | CertificateException | IOException e) {
			throw new IllegalStateException("CredentialsExtractor: failed to load keystore '" + path + "': " + e.getMessage(), e);
		}
	}

	private static String encodeCertificatePem(X509Certificate xcert) {
		try (StringWriter sw = new StringWriter();
				JcaPEMWriter xwriter = new JcaPEMWriter(sw)) {
			xwriter.writeObject(xcert);
			xwriter.flush();
			// The PEM writer appends a trailing newline; main's temp-file read-back dropped it.
			// Strip it here so the base64 output stays byte-identical to what downstream consumers
			// (e.g. CredentialsCreator) already expect, making the temp-file removal a no-op.
			String pem = sw.toString().stripTrailing();
			return Base64.getEncoder().encodeToString(pem.getBytes(StandardCharsets.UTF_8));
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	// Return sequence: <node org id> <root CA cert>, <doorman CA cert>, <node CA cert>, <id cert 1>, <id cert 2>,....
	private static Vector<String> getCertChain(KeyStore ks, String nodeKeyStorePath) {
		Vector<String> chainCerts = new Vector<String>();
		loadKeyStore(ks, nodeKeyStorePath);
		try {
			Enumeration<String> aliases = ks.aliases();
			while (aliases.hasMoreElements()) {
				String alias = aliases.nextElement();
				Certificate[] certs = ks.getCertificateChain(alias);
				if (certs != null && certs.length == 4) {
					X509Certificate xcerts[] = new X509Certificate[certs.length];
					for (int i = 0 ; i < certs.length ; i++) {
						if (!certs[i].getType().equals("X.509")) {
							continue;
						}
						X509Certificate xcert = (X509Certificate) certs[i];
						xcerts[i] = xcert;
					}
					if (!isValidCertificateChain(xcerts)) {
						continue;
					}
					int certExtractCount = 1;
					if (chainCerts.size() == 0) {
						certExtractCount = 4;
					}
					for (int i = 0 ; i < certExtractCount ; i++) {
						String encodedCert = encodeCertificatePem(xcerts[i]);
						if (encodedCert == null) {
							return null;
						}
						if (i == 0) {
							chainCerts.add(encodedCert);
						} else if (i == 1) {
							String xcertOrg = null;
							try {
								LdapName identity = new LdapName(xcerts[0].getSubjectX500Principal().getName());
								for (Rdn rdn: identity.getRdns()) {
									if (rdn.getType().equals("O")) {
										xcertOrg = rdn.getValue().toString();
									}
								}
							} catch (InvalidNameException e) {
								e.printStackTrace();
								return null;
							}
							if (xcertOrg == null) {
								return null;
							}
							chainCerts.add(0, xcertOrg);
							chainCerts.add(1, encodedCert);
						} else if (i == 2) {
							chainCerts.add(1, encodedCert);
						} else if (i == 3) {
							chainCerts.add(1, encodedCert);
						}
					}
				}
			}
		} catch (KeyStoreException e) {
			e.printStackTrace();
			return null;
		}
		return chainCerts;
	}

	private static JsonObject getNodeIdCertChain(KeyStore ks, JsonObject configObj, String nodeKeyStorePath) {
		Vector<String> certs = getCertChain(ks, nodeKeyStorePath);
		if (certs == null || certs.size() <= 3) {
			return null;
		}
		configObj.addProperty("name", certs.elementAt(0));
		JsonArray rootArr = new JsonArray();
		rootArr.add(certs.elementAt(1));
		configObj.add("root_certs", rootArr);
		JsonArray doormanArr = new JsonArray();
		doormanArr.add(certs.elementAt(2));
		configObj.add("doorman_certs", doormanArr);
		JsonArray nodeCA = new JsonArray();
		nodeCA.add(certs.elementAt(3));
		configObj.add("nodeca_certs", nodeCA);
		JsonArray nodeIdCert = new JsonArray();
		nodeIdCert.add(certs.elementAt(4));
		configObj.add("nodeid_cert", nodeIdCert);
		return configObj;
	}

	private static JsonObject getNodeTlsCertChain(KeyStore ks, JsonObject configObj, String nodeKeyStorePath) {
		Vector<String> certs = getCertChain(ks, nodeKeyStorePath);
		if (certs == null || certs.size() <= 3) {
			return null;
		}
		JsonArray rootArr = new JsonArray();
		rootArr.add(certs.elementAt(1));
		configObj.add("tls_root_certs", rootArr);
		JsonArray doormanArr = new JsonArray();
		doormanArr.add(certs.elementAt(2));
		doormanArr.add(certs.elementAt(3));
		configObj.add("tls_intermediate_certs", doormanArr);
		return configObj;
	}

	public static String getConfig(String baseNodesPath, String[] nodes) {
		KeyStore ks = null;
		try {
			ks = KeyStore.getInstance(KeyStore.getDefaultType());
		} catch (KeyStoreException e) {
			e.printStackTrace();
			return null;
		}
		JsonObject configObj = new JsonObject();
		for (String node: nodes) {
			String nodePath = baseNodesPath + node + "/certificates";
			JsonObject nodeConfigObj = new JsonObject();
			String nodeKeyStorePath = nodePath + "/nodekeystore.jks";
			nodeConfigObj = getNodeIdCertChain(ks, nodeConfigObj, nodeKeyStorePath);
			if (nodeConfigObj == null) {
				throw new IllegalStateException("CredentialsExtractor: unable to extract identity certificate chain for node '"
						+ node + "'; expected a 4-certificate chain (node identity, node CA, doorman CA, root CA) in keystore: "
						+ nodeKeyStorePath);
			}
			//nodeConfigObj = getNodeTlsCertChain(ks, nodeConfigObj, nodePath + "/sslkeystore.jks");
			configObj.add(node, nodeConfigObj);
			System.out.println("Extracted configuration for " + node);
		}
		System.out.println("Extracted configuration for all nodes");
		Gson gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
		return gson.toJson(configObj);
	}

}
