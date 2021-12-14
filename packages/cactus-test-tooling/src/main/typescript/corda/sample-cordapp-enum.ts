/**
 * Enumerates over a sub-set of the sample corda applications
 * from the `sample-kotlin` repo under the Corda GitHub
 * organization.
 * @see https://github.com/corda/samples-kotlin
 */
export const enum SampleCordappEnum {
  ADVANCED_OBLIGATION = "ADVANCED_OBLIGATION",
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
  [SampleCordappEnum.BASIC_CORDAPP]: {
    rootDir: "/samples-kotlin/Basic/cordapp-example/",
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
    jars: [
      {
        jarRelativePath: "workflows/build/libs/workflows-0.1.jar",
        fileName: "_workflows-0.1.jar",
      },
    ],
  },
});
