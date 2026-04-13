# Hyperledger Cacti Documentation

This directory contains the source for the Hyperledger Cacti documentation
site. It uses MkDocs (documentation at [mkdocs.org](https://www.mkdocs.org)),
the Material for MkDocs theme, and the Mike plugin for versioned deployments to
GitHub Pages.

[Material for MkDocs]: https://squidfunk.github.io/mkdocs-material/
[Mike]: https://github.com/jimporter/mike

## Prerequisites

To preview the docs locally and update the published site, the following tools
are needed:

- A Bash shell
- git
- Python 3
- The [Material for Mkdocs] theme.
- The [Mike] MkDocs plugin for publishing versions to gh-pages.
  - Not used locally, but referenced in the `mkdocs.yml` file and needed for
    deploying the site to gh-pages.

### git
`git` can be installed locally, as described in the [Install Git Guide from GitHub](https://github.com/git-guides/install-git).

### Python 3
`Python 3` can be installed locally, as described in the [Python Getting Started guide](https://www.python.org/about/gettingstarted/).

### MkDocs

The MkDocs-related items can be installed locally, as described in the
[Material for MkDocs] installation instructions. The short, case-specific
version for this repository is:

```bash
pip install -r requirements.txt
```

### Verify Setup

To verify your setup, run `mkdocs --help` and confirm the help text is shown.

## Useful MkDocs Commands

The commands you will usually use with `mkdocs` are:

* `mkdocs serve` - Start the live-reloading docs server.
* `mkdocs build` - Build the documentation site.
* `mkdocs -h` - Print help message and exit.
* `mkdocs gh-deploy` - Build and push documents to `gh-pages` branch, and publish to URL configured in `mkdocs.yml`.

## Adding Content

The basic process for adding content to the site is:

- Create a new markdown file under the `docs` folder
- Add the new file to the table of contents (`nav` section in the `mkdocs.yml` file)

## Repository layout

    mkdocs.yml    # The configuration file.
    docs/
        index.md  # The documentation homepage.
        ...       # Other markdown pages, images and other files.
