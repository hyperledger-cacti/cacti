<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Policy DSL

This repo contains the `antlr` grammar file (`parser/Policy.g4`) for the verification policy DSL.

All other files in this repo are for testing the grammar file.

## Usage

Node version >= 14 is required for `antlr` (if using `fnm`, just run `fnm use`)

```bash
npm install
npm test
```

## Parser Generation

[`antlr`](https://www.antlr.org/) is a parser generation tool that is used for generating the lexer and parser from the grammar file.

Once `antlr` is installed (>= v4.9, since that's the version they switched to es6 modules), the parser files can be regenerated with:

`antlr4 -Dlanguage=JavaScript parser/Policy.g4`

## Resources

- https://markuseliasson.se/article/building-a-parser-for-sequence/
- https://tomassetti.me/parse-tree-abstract-syntax-tree/
