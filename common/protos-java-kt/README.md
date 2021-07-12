# Compiled Protos for Java and Kotlin

## Steps to publish:

1) Create a Personal Access Token from Github with write/read/delete access to packages.
2) Create a copy of `artifactory.properties.template` as `artifactory.properties`.
3) Replace <GITHUB Email> with your email id for github.
3) Replace <GITHUB Personal Access Token> with your personal access token.
4) Run `make publish` to publish package to github packages.

**NOTE:** Always publish to your fork first, and only after testing it well, then 
before creating PR, publish it to `hyperledger-labs/weaver-dlt-interoperability`.
To publish to your fork, modify in `build.gradle`:
```
...
publishing {
    publications {
        ... (Don't change this block)
    }
	repositories {
		maven {
			url 'https://maven.pkg.github.com/<your-git-name>/weaver-dlt-interoperability'
			...
		}
	}
}
```
and then follow above 4 steps.

## Steps to Use with Gradle:

1) Create a Personal Access Token from Github with read access to packages.
2) Create a copy of `artifactory.properties.template` as `artifactory.properties`.
3) Replace <GITHUB Email> with your email id for github.
3) Replace <GITHUB Personal Access Token> with your personal access token.
4) Add this to your build.gradle (change the version accordingly):
```
dependencies {
	compile(group: 'com.weaver', name: 'protos-java-kt', version: "1.2.0")
}
```
