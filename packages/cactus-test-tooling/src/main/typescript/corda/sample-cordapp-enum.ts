/**
 * Enumerates over a sub-set of the sample corda applications
 * from the `sample-kotlin` repo under the Corda GitHub
 * organization.
 * @see https://github.com/corda/samples-kotlin
 */
export const enum SampleCordappEnum {
  ADVANCED_OBLIGATION = "ADVANCED_OBLIGATION",
  BASIC_CORDAPP = "BASIC_CORDAPP",
}

/**
 * Stores the mapping between the samples and their project
 * roots on the file-system within the samples-kotlin git
 * repository.
 * @see https://github.com/corda/samples-kotlin
 */
export const SAMPLE_CORDAPP_ROOT_DIRS = Object.freeze({
  [SampleCordappEnum.ADVANCED_OBLIGATION]:
    "/samples-kotlin/Advanced/obligation-cordapp/",
  [SampleCordappEnum.BASIC_CORDAPP]: "/samples-kotlin/Basic/cordapp-example/",
});
