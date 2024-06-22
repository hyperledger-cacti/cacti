/**
 * Enumerates over a sub-set of the sample corda applications
 * from the `sample-kotlin` repo under the Corda GitHub
 * organization.
 * @see https://github.com/corda/samples-kotlin
 */
export enum SampleCordappEnum {
  ADVANCED_OBLIGATION = "ADVANCED_OBLIGATION",
  ADVANCED_NEGOTIATION = "ADVANCED_NEGOTIATION",
  BASIC_CORDAPP = "BASIC_CORDAPP",
  BASIC_FLOW = "BASIC_FLOW",
}

/**
 * Stores the mapping between the samples and their project
 * roots on the file-system within the samples-kotlin git
 * repository and the jars location.
 * @see https://github.com/corda/samples-kotlin
 */
export const SAMPLE_CORDAPP_DATA = Object.freeze({
  [SampleCordappEnum.ADVANCED_OBLIGATION]: {
    rootDir: "/samples-kotlin/Advanced/obligation-cordapp/",
    cordappDirPartyA:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/cordapps",
    cordappDirPartyB:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/cordapps",
    cordappDirPartyC:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantC/cordapps",
    cordappDirNotary:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/Notary/cordapps",
    jars: [
      {
        jarRelativePath: "contracts/build/libs/contracts-1.0.jar",
        fileName: "_contracts-1.0.jar",
      },
      {
        jarRelativePath: "workflows/build/libs/workflows-1.0.jar",
        fileName: "_workflows-1.0.jar",
      },
    ],
  },
  [SampleCordappEnum.ADVANCED_NEGOTIATION]: {
    rootDir: "/samples-kotlin/Advanced/negotiation-cordapp/",
    cordappDirPartyA:
      "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyA/cordapps",
    cordappDirPartyB:
      "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyB/cordapps",
    cordappDirPartyC: "NOT_APPLICABLE__THIS_SAMPLE_ONLY_HAS_A_AND_B_PARTIES",
    cordappDirNotary:
      "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/Notary/cordapps",
    jars: [
      {
        jarRelativePath: "contracts/build/libs/contracts-0.2.jar",
        fileName: "_contracts-0.2.jar",
      },
      {
        jarRelativePath: "workflows/build/libs/workflows-0.2.jar",
        fileName: "_workflows-0.2.jar",
      },
    ],
  },
  [SampleCordappEnum.BASIC_CORDAPP]: {
    rootDir: "/samples-kotlin/Basic/cordapp-example/",
    cordappDirPartyA:
      "/samples-kotlin/Basic/cordapp-example/build/nodes/ParticipantA/cordapps",
    cordappDirPartyB:
      "/samples-kotlin/Basic/cordapp-example/build/nodes/ParticipantB/cordapps",
    cordappDirPartyC:
      "/samples-kotlin/Basic/cordapp-example/build/nodes/ParticipantC/cordapps",
    cordappDirNotary:
      "/samples-kotlin/Basic/cordapp-example/build/nodes/Notary/cordapps",
    jars: [
      {
        jarRelativePath: "contracts/build/libs/contracts-1.0.jar",
        fileName: "_contracts-1.0.jar",
      },
      {
        jarRelativePath: "workflows/build/libs/workflows-1.0.jar",
        fileName: "_workflows-1.0.jar",
      },
    ],
  },
  [SampleCordappEnum.BASIC_FLOW]: {
    rootDir: "/samples-kotlin/Basic/flow-database-access/",
    cordappDirPartyA:
      "/samples-kotlin/Basic/flow-database-access/build/nodes/PartyA/cordapps",
    cordappDirPartyB: "-",
    cordappDirPartyC: "-",
    cordappDirNotary: "-",
    jars: [
      {
        jarRelativePath: "workflows/build/libs/workflows-0.1.jar",
        fileName: "_workflows-0.1.jar",
      },
    ],
  },
});
