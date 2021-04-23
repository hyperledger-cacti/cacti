# Frequently Asked Questions - Hyperledger Cactus <!-- omit in toc -->

- [Where does the project name come from?](#where-does-the-project-name-come-from)
- [Re-building the code after I change it slow. What to do?](#re-building-the-code-after-i-change-it-slow-what-to-do)
- [How can I not re-build the whole project every time I make a small change?](#how-can-i-not-re-build-the-whole-project-every-time-i-make-a-small-change)
- [Why do you need all these packages/monorepo? It looks complicated!](#why-do-you-need-all-these-packagesmonorepo-it-looks-complicated)
- [Prototyping something and the linter blocking my builds is slowing me down needlessly](#prototyping-something-and-the-linter-blocking-my-builds-is-slowing-me-down-needlessly)

## Where does the project name come from?

It was the first one on our proposed list of names that satisfied the following criteria:

1. It is a single, relatively short word
2. It is (probably, hopefully) easy to say in most languages, not just English
3. It received approval from the legal and marketing departments

Also: In 2020, the Hyperledger Global Forum was held in Phoenix, Arizona where
some of the maintainers (Peter, Shingo, Takuma) have met in-person for the first time.
The area has a lot of cacti some of which were also featured in the official graphics
of the conference itself.

## Re-building the code after I change it slow. What to do?

Try using the `npm run watch` command which will trigger a re-build as soon as
you save a .ts or openapi.json file. It only builds the specific packages that
have changes in their source code so it tends to be 1-2 orders of magnitude faster
than `npm run build:dev:backend` for example.

Note: You need to make a change to trigger the re-build via the watch script,
so if you started the script after having made a change then quickly make
another change such as adding a new line or something like it in order to trigger
the file save which will in turn trigger the re-build.

## How can I not re-build the whole project every time I make a small change?

The answer is the same as for [Re-building the code after I change it slow. What to do?](#re-building-the-code-after-i-change-it-slow-what-to-do)

## Why do you need all these packages/monorepo? It looks complicated!

It is a bit more complicated than having a single package indeed, but it provides
us with the flexibility we need to
a) implement the plugin architecture where people can opt in to use certain
packages but not others
b) follow the unix philosophy of having smaller components/tools that do one thing and do that very well (hopefully)
c) there are more reasons we could mention but they are all mostly just reiterations of the above 2

## Prototyping something and the linter blocking my builds is slowing me down needlessly

You have a number of options at your disposal, all achieving roughly the same outcome:
1. You can turn off the linter temporarily in the code file that you are working on with a comment such as this: `/* eslint-disable */`
Do note however, that prior to your pull requests being accepted, this will have to be removed and the linter errors fixed.
2. If you genuinely believe that the code files or whole directories of them that you are working on should not be
subject to the linter at all, you can also ignore them by adding a glob pattern to the `.eslintignore` file in the
project root. This is usually not recommended, but in certain cases will be justifiable, for example if you are working
with a code generator that outputs source code that you are not supposed to change because it is regenerated upon every
subsequent compilation.
3. Another temporary option is to completely exclude the linting from the build
by altering the `lint` npm script in the root `package.json` file to be a no-op
by replacing its contents

`"lint": "eslint '*/*/src/**/*.{js,ts}' --quiet --fix",`

with something like this for example:

`"lint": "echo OK",`
