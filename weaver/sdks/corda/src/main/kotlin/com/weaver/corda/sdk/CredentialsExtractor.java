/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 
package com.weaver.corda.sdk;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.SignatureException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
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

	private static boolean loadKeyStore(KeyStore ks, String path) {
		FileInputStream fis = null;
		try {
			fis = new FileInputStream(new File(path));	// Trust store file path
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		}
		try {
			ks.load(fis, null);
			fis.close();
			return true;
		} catch (NoSuchAlgorithmException | CertificateException | IOException e) {
			e.printStackTrace();
		}
		return false;
	}

	private static String readFile(String path) {
		try {
			FileReader fr = new FileReader(path);
			BufferedReader br = new BufferedReader(fr);
			StringBuffer pem = new StringBuffer();
			while(true) {
				String line = br.readLine();
				if (line == null) {
					break;
				}
				if (pem.length() > 0) {
					pem.append("\n");
				}
				pem.append(line.trim());
			}
			br.close();
			fr.close();
			return Base64.getEncoder().encodeToString(pem.toString().getBytes());
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}

	private static String getRootCertPEM(KeyStore ks, String trustStore, String tempStore) {
		if (!loadKeyStore(ks, trustStore)) {
			return null;
		}
		try {
			Enumeration<String> aliases = ks.aliases();
			while (aliases.hasMoreElements()) {
				String alias = aliases.nextElement();
				System.out.println("Trust store alias:" + alias);
				if (ks.isCertificateEntry(alias)) {
					System.out.println("This is a certificate alias");
				} else {
					continue;
				}
				Certificate cert = ks.getCertificate(alias);
				if (cert != null) {
					if (cert.getType().equals("X.509")) {
						X509Certificate xcert = (X509Certificate) cert;
						System.out.println(xcert.getIssuerX500Principal().getName());
						System.out.println(xcert.getSubjectX500Principal().getName());
						System.out.println(xcert.getCriticalExtensionOIDs());
						if (isSelfSignedCertificate(xcert)) {
							System.out.println("This is a Self-signed certificate");
						}
						else {
							return null;
						}
						try {
							File outputDir = new File(tempStore + "root/");
							if (!outputDir.exists()) {
								outputDir.mkdirs();
							}
							JcaPEMWriter xwriter = new JcaPEMWriter(new FileWriter(tempStore + "root/rootcert.pem"));
							xwriter.writeObject(xcert);
							xwriter.close();
							return readFile(tempStore + "root/rootcert.pem");
						} catch (IOException e) {
							e.printStackTrace();
							break;
						}
					}
				}
			}
		} catch (KeyStoreException e) {
			e.printStackTrace();
		}
		return null;
	}

	// Return sequence: <node org id> <root CA cert>, <doorman CA cert>, <node CA cert>, <id cert 1>, <id cert 2>,....
	private static Vector<String> getCertChain(KeyStore ks, String nodeKeyStorePath, String tmpStore, String[] tmpCertfiles) {
		Vector<String> chainCerts = new Vector<String>();
		if (!loadKeyStore(ks, nodeKeyStorePath)) {
			return null;
		}
		try {
			Enumeration<String> aliases = ks.aliases();
			while (aliases.hasMoreElements()) {
				String alias = aliases.nextElement();
				Certificate[] certs = ks.getCertificateChain(alias);
				if (certs.length == 4) {
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
						try {
							File outputDir = new File(tmpStore);
							if (!outputDir.exists()) {
								outputDir.mkdirs();
							}
							String filePath = tmpStore + tmpCertfiles[i] + ".pem";
							JcaPEMWriter xwriter = new JcaPEMWriter(new FileWriter(filePath));
							xwriter.writeObject(xcerts[i]);
							xwriter.close();
							if (i == 0) {
								chainCerts.add(readFile(filePath));
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
								chainCerts.add(1, readFile(filePath));
							} else if (i == 2) {
								chainCerts.add(1, readFile(filePath));
							} else if (i == 3) {
								chainCerts.add(1, readFile(filePath));
							}
						} catch (IOException e) {
							e.printStackTrace();
							return null;
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

	private static JsonObject getNodeIdCertChain(KeyStore ks, JsonObject configObj, String nodeKeyStorePath, String tempStore) {
		String tmpStore = tempStore + "node/";
		String[] tmpCertfiles = new String[] { "nodeIdentity", "nodeCA", "doormanCA", "rootCA" };
		Vector<String> certs = getCertChain(ks, nodeKeyStorePath, tmpStore, tmpCertfiles);
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
		/*JsonArray idArr = new JsonArray();
		for (int i = 3 ; i < certs.size() ; i++) {
			idArr.add(certs.elementAt(i));
		}
		obj.add("admins", idArr);*/
		return configObj;
	}

	private static JsonObject getNodeTlsCertChain(KeyStore ks, JsonObject configObj, String nodeKeyStorePath, String tempStore) {
		String tmpStore = tempStore + "ssl/";
		String[] tmpCertfiles = new String[] { "nodeTlsCert", "nodeTlsCA", "doormanTlsCA", "rootTlsCA" };
		Vector<String> certs = getCertChain(ks, nodeKeyStorePath, tmpStore, tmpCertfiles);
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

	private static void deleteFolder(File folder) {
		if (folder.isDirectory()) {
			for (File subf: folder.listFiles()) {
				deleteFolder(subf);
			}
		}
		folder.delete();
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
			String tempStore = nodePath + "/tmp/";
			JsonObject nodeConfigObj = new JsonObject();
			nodeConfigObj = getNodeIdCertChain(ks, nodeConfigObj, nodePath + "/nodekeystore.jks", tempStore);
			if (configObj == null) {
				System.out.println("Unable to extract node certificate chain");
				break;
			} else {
				//nodeConfigObj = getNodeTlsCertChain(ks, nodeConfigObj, nodePath + "/sslkeystore.jks", tempStore);
				//if (nodeConfigObj == null) {
				//	System.out.println("Unable to extract TLS certificate chain");
				//	break;
				//} else {
				//	configObj.add(node, nodeConfigObj);
				//}
				configObj.add(node, nodeConfigObj);
			}
			deleteFolder(new File(tempStore));
			System.out.println("Extracted configuration for " + node);
		}
		System.out.println("Extracted configuration for all nodes");
		Gson gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
		return gson.toJson(configObj);
	}

	/*public static void main(String[] args) {
		String baseNodesPath = "store/certs/";
		String config = getConfig(baseNodesPath);
		if (config == null) {
			System.out.println("Unable to get config");
		} else {
			try {
				FileWriter fw = new FileWriter(baseNodesPath + "config.json");
				fw.write(config);
				fw.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
			System.out.println("Written configuration JSON to file");
		}
	}*/

}
