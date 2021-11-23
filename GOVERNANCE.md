# Governance

Hyperledger Cactus is managed under an open governance model as described in the Hyperledger charter. Cactus is led by a set of maintainers, who can be found in the MAINTAINERS.md file.

**Maintainers**

Cactus is led by the project’s maintainers. The maintainers are responsible for reviewing and merging all patches submitted for review, and they guide the overall technical direction of the project within the guidelines established by the Hyperledger Technical Steering Committee (TSC).

**Becoming a Maintainer**

The project’s maintainers will, from time-to-time, consider adding or removing a maintainer. An existing maintainer can submit a change set to the MAINTAINERS.md file. A nominated contributor may become a maintainer by a three-quarters approval of the proposal by the existing maintainers. Once approved, the change set is then merged and the individual is added to (or alternatively, removed from) the maintainers group.

Maintainers may be removed by explicit resignation, for prolonged inactivity (3 or more months), or for some infraction of the code of conduct or by consistently demonstrating poor judgement. A maintainer removed for inactivity should be restored following a sustained resumption of contributions and reviews (a month or more) demonstrating a renewed commitment to the project.  We require that maintainers that will be temporarily inactive do so “gracefully” and update other maintainers on their status and time availability rather than appearing to “fall off the face of the earth.”

**Releases**

A majority of the maintainers may decide to create a release of Cactus.  Any broader rules of Hyperledger pertaining to releases must be followed.  Once the project is mature, there will be a stable LTS (long term support) release branch, as well as the main branch for upcoming new features.

**Making Feature/Enhancement Proposals**

Code changes that are either bug fixes, direct and small improvements, or things that are on the roadmap (see below) can be issued as PRs in a relatively quick time period, although we recommend creating a Github ticket to track even bugs and small improvements.  For more substantial changes, however, a feature/enhancement proposal is required.  These proceed through the approval process like typical PRs, and require the same “2 + 1” approval policy for acceptance.

In particular, all contributors to the project should have enough time to voice an opinion on feature/enhancement proposals before they are accepted.  So the maintainers will determine some “comment period” between proposal submission and acceptance so that contributors have enough time to voice their opinions.

Significant changes can be marked as such via the predefined label with the same name. This is a tool that helps maintainers identify the most important issues/discussions to be had at any given time through the GitHub web interface.

To easily access the list of significant changes, navigate to the label:
https://github.com/hyperledger/cactus/labels/Significant_Change

We also recommend reading our CONTRIBUTING.md file (https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md) for more information about contributing.

**Approving Pull Requests**

Maintainers designated for review are required to review PRs in a timely manner (all circumstances considered, of course).  Any pull request must be reviewed by at least two maintainers, and if a PR is submitted by a maintainer, these two reviewers must be different from the original submitter.

The technical requirements for submitting/approving/merging pull requests are further detailed in the CONTRIBUTING.md file where it is laid out in detail how to ensure git commit graph tidiness.

**Reviewing Pull Requests**

We are strongly committed to processing pull requests from everyone in a fair manner meaning that pull requests are to be
reviewed in order of submission.
Reviewing PRs in order of submission does not guarantee nor necessitate accepting/merging said PRs in order of submission
since some PRs may require lengthy feedback loops while others may pass the muster without any change requests or
feedback at all, depending on the nature of the change being proposed.
Security related pull requests may be fast tracked even against the "in order of submission" principle if it appears
that a vulnerability makes a pull request a time sensitive issue where the sooner we propagate a fix the better it is.

**Maintainers Meeting**

The maintainers hold regular maintainers meetings, which are open to everyone. The purpose of the maintainers meeting is to plan for and review the progress of releases, and to discuss the technical and operational direction of the project.

Please see the wiki for maintainer meeting details.

One point to mention about meetings is that new feature/enhancement proposals as described above should be presented to a maintainers meeting for consideration, feedback, and acceptance.

**Roadmap**

The Cactus maintainers are required to maintain a roadmap.  There is a technical roadmap, with all of the issues as they directly relate to code, and a more public-friendly roadmap that anyone can digest.  The required features to be implemented will be maintained as issues at the official github repository of Cactus with tag string ‘for current release’ or ‘for future release’. The task which is not volunteered to work, will be dispatched to specific contributors following consensus among the majority of maintainers.

The technical roadmap is implicitly derived from the Github “milestones” feature. To access the list of milestones for Cactus use this link:
https://github.com/hyperledger/cactus/milestones

**Communications**

We use the Cactus email list for long-form communications and RocketChat for short, informal announcements and other communications.  We encourage all communication, whenever possible, to be public and in the clear (i.e. rather than sending an email directly to a person or two, send it out to the whole list if it pertains to the project).

**Future Changes**

The governance of Cactus may change as the project evolves.  In particular, if the project becomes large, we will incorporate tiered maintainership, with top-level maintainers, subprojects, subproject maintainers, release managers, and so forth.  We emphasize that this document is intended to be “living” and will be updated periodically.

We require that changes to this document require a three-quarters approval of the existing maintainers.  Note that this may also be changed in the future if deemed necessary.

**Attribution**

This document is based on the Hyperledger Fabric governance document, with some substantial changes.