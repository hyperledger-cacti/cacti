<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Weaver Docs

This repository contains documentation for Weaver users as well as protocol contributors.

To get started with capturing and publishing documentation see instructions below.

This documentation site is built using [Docusaurus v2](https://v2.docusaurus.io/docs/).

**NOTE:** Required Node.js version >= 12.13.0 or above.

## Preview Locally

To edit and preview locally run a development server:

```
npm install
npm run start
```

## Build and Deploy to a Remote Server

The following command generates static content in the `build` directory, which can be served though a hosting service:

```
npm install
npm run build
```

Optionally, to deploy the build to Github Pages, run the following command:

```
$ npm run build && npm run deploy-gh-pages
```
