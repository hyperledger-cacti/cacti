PD_DEB_URL = https://github.com/jgm/pandoc/releases/download/2.9.2/pandoc-2.9.2-1-amd64.deb
PD_DEB_FILE = pandoc-2.9.2-1-amd64.deb
PD = pandoc
SECTIONS = $(sort $(wildcard ./*-a.md))
PDFLAGS = --from=markdown_mmd+yaml_metadata_block+smart+grid_tables+pipe_tables --standalone --self-contained --to=html --metadata title="" ${SECTIONS}
WK_DEB_FILE = wkhtmltox_0.12.5-1.bionic_amd64.deb
WK_DEB_URL = https://downloads.wkhtmltopdf.org/0.12/0.12.5/wkhtmltox_0.12.5-1.bionic_amd64.deb
WK = wkhtmltopdf
WKFLAGS = --dpi 150 --disable-smart-shrinking hyperledger-cactus-whitepaper.html --allow $(pwd)

CURRENT_UID := $(shell id -u)
CURRENT_GID := $(shell id -g)
MAKEFILE_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
WKFLAGS = --log-level info --dpi 150 --disable-smart-shrinking
WKMARGINS = --margin-bottom 1mm --margin-top 1mm --margin-left 1mm --margin-right 1mm


.PHONY: all
all: clean configure pdf


.PHONY: clean
clean:
	rm -rf $(MAKEFILE_DIR)/build/*


.PHONY: pdf
pdf: html pdf-wk-with-flags pdf-wk-no-flags pdf-pandoc

.PHONY: pdf-wk-no-flags
pdf-wk-no-flags:
	docker run --rm --volume $(MAKEFILE_DIR):/whitepaper --user ${CURRENT_UID}:${CURRENT_UID} --workdir /whitepaper/ --entrypoint wkhtmltopdf icalialabs/wkhtmltopdf --allow /whitepaper $(WKMARGINS) /whitepaper/build/hyperledger-cactus-whitepaper.html - /whitepaper/build/hyperledger-cactus-whitepaper-wk-no-flags.pdf

.PHONY: pdf-wk-with-flags
pdf-wk-with-flags:
	docker run --rm --volume $(MAKEFILE_DIR):/whitepaper --user ${CURRENT_UID}:${CURRENT_UID} --workdir /whitepaper/ --entrypoint wkhtmltopdf icalialabs/wkhtmltopdf --allow /whitepaper $(WKMARGINS) $(WKFLAGS) /whitepaper/build/hyperledger-cactus-whitepaper.html - /whitepaper/build/hyperledger-cactus-whitepaper-wk-with-flags.pdf

.PHONY: pdf-pandoc
pdf-pandoc:
	docker run --rm --volume $(MAKEFILE_DIR):/whitepaper --user ${CURRENT_UID}:${CURRENT_UID} --workdir /whitepaper/ petermetz/cactus-whitepaper-builder:2021-03-22-fix-703 -H deeplists.tex -V geometry:margin=1cm --standalone --output /whitepaper/build/hyperledger-cactus-whitepaper-pandoc.pdf $(sort $(wildcard *a.md))

.PHONY: html
html:
	docker run --rm --volume $(MAKEFILE_DIR):/whitepaper --user ${CURRENT_UID}:${CURRENT_UID} --workdir /whitepaper petermetz/cactus-whitepaper-builder:2021-03-22-fix-703 --verbose -V fontsize=12pt -V geometry:margin=1cm -H pandoc.css --from=gfm --standalone --self-contained --to=html --metadata title="" --output=build/hyperledger-cactus-whitepaper.html --to=html $(sort $(wildcard *a.md))

configure:
	docker build $(MAKEFILE_DIR) -t cactus-whitepaper-builder
