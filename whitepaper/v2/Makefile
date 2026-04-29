TEXLIVE_IMAGE ?= texlive/texlive:TL2024-historic
SOURCE_DATE_EPOCH ?= 1704067200
LATEXMK ?= latexmk
OUT_DIR ?= build
MAIN ?= main

.PHONY: all pdf clean container-pdf

all: pdf

pdf:
	mkdir -p $(OUT_DIR)
	SOURCE_DATE_EPOCH=$(SOURCE_DATE_EPOCH) \
	FORCE_SOURCE_DATE=1 \
	TZ=UTC \
	LC_ALL=C \
	$(LATEXMK) -pdf -interaction=nonstopmode -halt-on-error -outdir=$(OUT_DIR) $(MAIN).tex

container-pdf:
	docker run --rm \
		-e SOURCE_DATE_EPOCH=$(SOURCE_DATE_EPOCH) \
		-e FORCE_SOURCE_DATE=1 \
		-e TZ=UTC \
		-e LC_ALL=C \
		-v "$(PWD):/work" \
		-w /work \
		$(TEXLIVE_IMAGE) \
		latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=$(OUT_DIR) $(MAIN).tex

clean:
	rm -rf $(OUT_DIR)
