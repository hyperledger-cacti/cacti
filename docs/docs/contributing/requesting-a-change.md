# Requesting a Change

Hyperledger Cacti is a powerful tool which serves a wide range of use cases.
Put yourself in our shoes – with a project of this size, it can be challenging
to maintain existing functionality while constantly adding new features at the
same time. We highly value every idea or contribution from our community, and
we kindly ask you to take the time to read the following guidelines before 
submitting your change request in our public [issue tracker]. This will help us 
better understand the proposed change, and how it will benefit the community.

This guide is our best effort to explain the criteria and reasoning behind our
decisions when evaluating change requests and considering them for
implementation. 

  [issue tracker]: https://github.com/hyperledger-cacti/cacti/issues

## Before creating an issue

Before you invest your time to fill out and submit a change request, we kindly
ask you to do some preliminary work by answering some questions to determine if
your idea is a good fit and matches the project's philosophy and tone.

__Please find answers to the following questions before creating an issue.__

### It's not a bug, it's a feature

Change requests are intended for suggesting minor adjustments, ideas for new
features, or to influence the project's direction and vision. It is important
to note that change requests are not intended for reporting bugs, as they're
missing essential information for debugging.

If you want to report a bug, please refer to our [bug reporting guide] instead.

  [bug reporting guide]: reporting-a-bug.md

### Source of inspiration

If you have seen your idea implemented in similar project, make sure to collect enough information on its implementation before submitting, as this allows us to evaluate potential fit more quickly. Explain what you like and dislike about the implementation.

### Benefit for the community

Our [Discord server] is the best place to connect with our community. When 
evaluating new ideas, it's essential to seek input from other users and consider 
alternative viewpoints. This approach helps to implement new features in a way
that benefits a large number of users.

  [Discord server]: https://discord.gg/hyperledger

## Issue template

Now that you have taken the time to do the necessary preliminary work and ensure 
that your idea meets our requirements, you are invited to create a change
request. The following guide will walk you through all necessary steps to help
you submit a comprehensive and useful issue:

- [Title]
- [Context] <small>optional</small>
- [Description]
- [Related links]
- [Use cases]
- [Visuals] <small>optional</small>
- [Checklist]

  [Title]: #title
  [Context]: #context
  [Description]: #description
  [Related links]: #related-links
  [Use cases]: #use-cases
  [Visuals]: #visuals
  [Checklist]: #checklist

### Title

A good title is short and descriptive. It should be a one-sentence executive
summary of the idea, so the potential impact and benefit for the community can 
be inferred from the title.

### Context <small>optional</small> { #context }

Before describing your idea, you can provide additional context for us to
understand what you are trying to achieve. Explain the circumstances
in which you're using Hyperledger Cacti, and what you _think_ might be
relevant. Don't write about the change request here.

!!! success "Why we need this"
    Some ideas might only benefit specific settings, environments or edge cases. With a little context, change requests can be prioritized more accurately.

### Description

Next, provide a detailed and clear description of your idea. Explain why your 
idea is relevant to Hyperledger Cacti and must be implemented here, and not
in one of its dependencies.

-   __Explain the <u>what</u>, not the <u>why</u>__ – don't explain
    [the benefits of your idea][Use cases] here, we're getting there.
    Focus on describing the proposed change request as precisely as possible.

-   __Keep it short and concise__ – be brief and to the point when describing 
    your idea, there is no need to over-describe it. Maintainers and future
    users will be grateful for having to read less.

-   __One idea at a time__ – if you have multiple ideas that don't belong 
together, please open separate change requests for each of those ideas.

-   :material-run-fast: __Stretch goal__ – if you have a customization or another way to add the proposed change, you can help other users by sharing it here before we maintainers can add it to our code base.

!!! success "Why we need this"
    To understand and evaluate your proposed change, we need to have a clear understanding of your idea. By providing a detailed and precise description, you can help save you and us time spent discussing further clarification of your idea in the comments.

### Related links

Please provide any relevant links to issues, discussions, or documentation 
sections related to your change request. If you (or someone else) already
discussed this idea with the community on our discussion board, please include 
the link to the discussion as well.

!!! success "Why we need this"
    Related links help us gain a comprehensive understanding of your change request by providing additional context. Additionally, linking to previous issues and discussions allows us to quickly evaluate the feedback and input already provided by the community.

### Use cases

Explain how your change request would work from a user's
perspective – what's the expected impact and why does it not only benefit you,
but other users? How many of them? Furthermore, would it potentially break
existing functionality?

!!! success "Why we need this"
    Understanding the use cases and benefits of an idea is crucial in evaluating its potential impact and usefulness for the project and its users. This information helps us to understand the expected value of the idea and how it aligns with the goals of the project.

### Visuals <small>optional</small> { #visuals }

We now have a clear and detailed description of your idea, including information 
on its potential use cases and relevant links for context. If you have any 
visuals, such as sketches, screenshots, mockups, or external assets, you may 
present them in this section.

!!! tip
    You can drag and drop the files here or include links to external assets.

Additionally, if you have seen this change, feature, or improvement used 
elsewhere, please provide an example by showcasing 
it and describing how it was implemented and incorporated.

!!! success "Why we need this"
    Illustrations and visuals can help us maintainers better understand and envision your idea. Screenshots, sketches, or mockups can create an additional level of detail and clarity that text alone may not be able to convey. Also, seeing how your idea has been implemented in other projects can help us understand its potential impact and feasibility in Hyperledger Cacti, which helps us maintainers evaluate and triage change requests.

### Checklist

Thanks for following the change request guide and creating a high-quality 
change request. This section ensures that you have read this guide and have
worked to your best knowledge to provide us with every piece of information to 
review your idea for Hyperledger Cacti.

__We'll take it from here.__

## Credits
This document is based on [Material for MkDocs Requesting a Change](https://github.com/squidfunk/mkdocs-material/blob/master/docs/contributing/requesting-a-change.md).
