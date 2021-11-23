# Frequently Asked Questions - Hyperledger Cactus <!-- omit in toc -->

- Quick-Start Topics:
  - [What are the minimum and recommended hardware specs? Do you have a cool story about this?](#what-are-the-minimum-and-recommended-hardware-specs-do-you-have-a-cool-story-about-this)
  - [Cactus API-Server returns `Unauthorized Error` using Postman on local machine](#cactus-api-server-returns-unauthorized-error-using-postman-on-local-machine)
  - [npm install fails with `code EMFILE` (syscall connect)](#npm-install-fails-with-code-emfile-syscall-connect)
  - [Where does the project name come from?](#where-does-the-project-name-come-from)
- Other Topics:
  - [Re-building the code after I change it slow. What to do?](#re-building-the-code-after-i-change-it-slow-what-to-do)
  - [The watch script fails with `Internal watch failed: watch ENOSPC`](#the-watch-script-fails-with-internal-watch-failed-watch-enospc)
  - [How can I not re-build the whole project every time I make a small change?](#how-can-i-not-re-build-the-whole-project-every-time-i-make-a-small-change)
  - [Why do you need all these packages/monorepo? It looks complicated!](#why-do-you-need-all-these-packagesmonorepo-it-looks-complicated)
  - [Prototyping something and the linter blocking my builds is slowing me down needlessly](#prototyping-something-and-the-linter-blocking-my-builds-is-slowing-me-down-needlessly)
  - [Why do all the tests bind the HTTP/S listeners to a random port?](#why-do-all-the-tests-bind-the-https-listeners-to-a-random-port)
  - [HTTP requests sent with Postman/curl/etc. hang if I'm debugging a test case with VSCode, why?](#http-requests-sent-with-postmancurletc-hang-if-im-debugging-a-test-case-with-vscode-why)
  - [How do I run test cases with my own ledger images?](#how-do-i-run-test-cases-with-my-own-ledger-images)

## What are the minimum and recommended hardware specs? Do you have a cool story about this?

> If and when people read this in the future, always inflate the numbers
> a bit as we continue to add more and more tests every day (test automation is
> very important to us)

- **The bare minimum** for general development (building the code, running the tests,
 etc) would be around **2 CPU cores (4 threads) and 6 GB RAM free/available**.

- **A recommended** setup would be for a dev machine in my opinion is **16 GB RAM 4 CPU**
**cores (8 threads)** and of course SSD for persistent storage.

- Cool story/anecodte: Peter ran the tests on a VPS with 4 GB RAM in it once and the only
tests that failed were the Corda ones because those are hungrier than the others.


## Cactus API-Server returns `Unauthorized Error` using Postman on local machine
After installation of latest Cactus version a first API-Test with Postman is showing `Unauthorized Error`:
   - Reason:  We have decided that the
software should be `secure by default` above all else and allow for
customization/degradation of security as an opt-in feature rather than starting from that state.
  - How to enable manually the CORS patterns in config file: Open `config.json` and adapt the following settings:
    - "authorizationProtocol": "NONE"
    - "apiMtlsEnabled": false
    - "apiTlsEnabled": false
    - Restart the Cactus API-Server to use the changed settings

## npm install fails with `code EMFILE` (syscall connect)

If you encounter this error it happens because the number of open files permitted
by your operating system is lower than the number of files npm needs to have open
in order to finish installing your dependencies.

You can most likely solve this problem (assuming you are running on the recommended
operating system distribution) by running the command below on the terminal which
will increase said limit to 200k from the default () 4096.

```sh
echo fs.file-max=200000 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

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

## The watch script fails with `Internal watch failed: watch ENOSPC`

This happens because by default your operating system is configured to limit
the number of files watchable to a number lower than the number of source files
are there in the project that needs to be watched for changes.

How the raising of this limit can be done will depend heavily on the operating
system and its version that you use, but for Ubuntu 20.04 and likely its sibling
versions the solution presented should work:

```sh
echo fs.inotify.max_user_watches=582222 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```
[Stackoverflow.com - Node.JS: Getting error : [nodemon] Internal watch failed: watch ENOSPC](https://stackoverflow.com/a/34664097/698470)


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

## Why do all the tests bind the HTTP/S listeners to a random port?

This makes it much more cumbersome to do debugging while a test case is running.
The reason why we need it is because if we always used the same ports, we could
only run the tests one at a time so that they don't butt heads when allocating
their ports. This is not really feasible as the full test suite is already
taking above an hour at the time of this writing to execute and that would
likely triple if we started running tests sequentially.

The best workaround to this for now is to just set the port manually to a fixed
number when you are debugging a specific test case and then set it back to zero
prior to sending your pull request.
## HTTP requests sent with Postman/curl/etc. hang if I'm debugging a test case with VSCode, why?

When you use the execution stops on a breakpoint, that suspends all activities
from happening not just the test case's code itself. Meaning that your HTTP
request will not be processed by the API server / plugin until you let the execution
proceed via the UI/shortcuts of the debugger.

Once you let the execution continue, requests that previously appeared to be
hanging should finish successfully.

## How do I run test cases with my own ledger images?

Build and tag the image locally using a name that is non-ambiguous with the official tags. Modify the test code to skip the pull using the start method's omitPull parameter - e.g. replace

`await this.fabric.start();`

with

`await this.fabric.start(true);`

Then, modify the test to use the locally built image with the tag you specified. 
Exact variable names may differ between test ledger classes, be sure to check the constructors for the right convention. Examples:

Fabric
```
this.fabric = new FabricTestLedgerV1({
  imageName: "*your image name*",
  imageVersion: "*your image tag*",
  ...
});
```

Quorum
```
this.quorum = new QuorumTestLedger({
  containerImageName: "*your image name*",
  containerImageVersion: "*your image tag*",
  ...
});
```
