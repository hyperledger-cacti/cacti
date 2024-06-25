
# CI Build and Test Refactoring

This epic builds on the proof of concept here: https://github.com/hyperledger/cacti/pull/3348

Intention is to refactor the cacti ci scripts to push logic from ci jobs to commonly defined targets in the base packages, to simplify ci logic and minimize changes to ci when new packages are introduced.  These targets may be, for instance:

 - test
 - build:docker
  
### Task Breakdown
- [x] Switch from lerna-lite to lerna 8.1 to take advantage of the lerna --since syntax, which unlike 'lerna-lite changed', can use git to compute changed packages.  This allows ci to easily identify cascading changes.
- [ ] Programatically refactor ci.yaml:
  - [ ] Parse and output ci.yaml with no changes to prepare for programatic changes
  - [ ] Add test targets to individual package.json files to run jest and tape tests 
  - [ ] Add build:docker targets to individual package:json files for scanning in ci
  - [ ] Add test:long target (or custom variable?) to individual packages which returns the name of long tests which must be run as individual jobs in ci 
- [ ] Integrate weaver packages (TBD)
  - [ ] Add package.json and nx.json files to the weaver fabric go SDK so file changes are visible to lerna
  - [ ] Expose weaver tests in ci as packages/cacti-test packages 
  