# fabric-interop-sdk

Client library functions to augment or complement the Fabric-Node-SDK library

The near-term scope of this project is the development of library functions and a NodeJS-based API for exercising of those functions by a Fabric client application. The library can be imported by an application written in NodeJS the same way the `fabric-client` library is. Functions to be implemented within this library involve communication with relays and with remote Fabric networks for the purpose of running cross-network chaincode queries.

In the longer-term, we will add support for cross-network transaction invocations as well as event publish/subscribe.

Further down the line, we may add extra support, as required, for information exchange with remote networks running on DLT platforms other than Fabric.

# Prerequisites

Run `npm install`

then run `make build`, this will clone the proto files and generate the javascript proto files

# Testing

Run `npm test`

# Documentation

Run `npm run docs` to generate docs. View docs via the generated html file. 

# Steps to publish
1) Go to IBM artifactory (https://na.artifactory.swg-devops.com/artifactory/)
2) Click on your email id on top right
3) Generate/Copy the API key from profile, let's say it is - "ThisIsMyAPIKey"
4) Run this command on your system - 
	 curl --header 'X-JFrog-Art-Api: ThisIsMyAPIKey' https://na.artifactory.swg-devops.com/artifactory/api/npm/auth
5) The above command will return you auth token along with auth settings and your email id from artifactory.
6) Create a .npmrc file in the project root folder (from where you want to run npm publish)
7) Add this line to your .npmrc file,
	 @res-dlt-interop:registry=https://na.artifactory.swg-devops.com/artifactory/api/npm/res-dlt-interop-npm-local/
8) Add the output of curl to that file.
9) Final .npmrc should look like this - 
   "@res-dlt-interop:registry=https://na.artifactory.swg-devops.com/artifactory/api/npm/res-dlt-interop-npm-local/
    _auth = <Auth-token>
    always-auth = true
		email = user@email.com"
10) Run npm publish to publish package to artifactory.

NOTE:- Artifactory won't allow you to update the package through cli if same version exists,
you have to delete the package version in artifactory before publishing an update on the same package version.
