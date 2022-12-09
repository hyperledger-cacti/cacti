# Compiled Protos for Java and Kotlin

## Updating Version

If updating Protos version for Java/Kotlin, update the dependency version for in (can be done in same PR):
* `core/network/corda-interop-app/constants.properties`
* `core/drivers/corda-driver/build.gradle`
* `sdks/corda/build.gradle`
* `samples/corda/corda-simple-application/constants.properties`
* `tests/network-setups/corda/scripts/get-cordapps.sh`
* `tests/network-setups/corda/scripts/start-nodes.sh`

## Steps to publish:

1) Create a Personal Access Token from Github with write/read/delete access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `github.properties.template` as `github.properties`.
3) Replace <GITHUB Email> with your email id for github.
4) Replace <GITHUB Personal Access Token> with your personal access token.
5) Run `make publish` to publish package to github packages.

**NOTE:** Always publish to your fork first, and only after testing it well, then 
after PR approval, publish it to `hyperledger-labs/weaver-dlt-interoperability`.
To publish to your fork, replace `<your-git-name>` with your github username in `github.properties`:
```
...
url=https://maven.pkg.github.com/<your-git-name>/weaver-dlt-interoperability
```
and then follow above 4 steps.

**NOTE:** To change version, just modify it in `gradle.properties`.

## Steps to Use with Gradle:

1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `github.properties.template` as `github.properties`.
3) Replace <GITHUB Email> with your email id for github.
4) Replace <GITHUB Personal Access Token> with your personal access token.
5) Add this to your build.gradle (change the version accordingly):
```
dependencies {
	compile(group: 'com.weaver', name: 'protos-java-kt', version: "1.2.1")
}
```
