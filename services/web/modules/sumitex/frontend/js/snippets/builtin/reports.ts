// Built-in snippets: reports. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\cref}{Smart reference ("Figure 3")}[hyperref,cleveref]
\cref{#{label}}#{}
\endsnippet

\snippet{\fn}{Footnote}
\footnote{#{}}#{}
\endsnippet

\snippet{\siqty}{Quantity with a unit (9.81 m/s²)}[siunitx]
\qty{#{9.81}}{#{\metre\per\second\squared}}#{}
\endsnippet

\snippet{\toc}{Table of contents on its own page}
\tableofcontents
\clearpage
#{}
\endsnippet

\snippet{\appx}{Appendix with its first section}
\appendix
\section{#{Additional results}}
#{}
\endsnippet
`

export default text
