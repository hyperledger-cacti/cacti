FROM pandoc/latex:2.19

RUN tlmgr list

RUN tlmgr update --self && \
    tlmgr install \
    enumitem \
    merriweather \
    fontaxes \
    mweights \
    mdframed \
    needspace \
    sourcesanspro \
    sourcecodepro \
    titling \
    ly1 \
    pagecolor \
    adjustbox \
    collectbox \
    titlesec \
    fvextra \
    pdftexcmds \
    footnotebackref \
    zref \
    fontawesome5 \
    footmisc \
    sectsty
