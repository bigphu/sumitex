// Built-in snippets: theorems. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\thm}{Theorem}[amsthm]
\preamble{\newtheorem{theorem}{Theorem}}
\begin{theorem}
  #{}
\end{theorem}
#{}
\endsnippet

\snippet{\proof}{Proof ending with □}[amsthm]
\begin{proof}
  #{}
\end{proof}
#{}
\endsnippet

\snippet{\lem}{Lemma}[amsthm]
\preamble{\newtheorem{lemma}{Lemma}}
\begin{lemma}
  #{}
\end{lemma}
#{}
\endsnippet

\snippet{\cor}{Corollary}[amsthm]
\preamble{\newtheorem{corollary}{Corollary}}
\begin{corollary}
  #{}
\end{corollary}
#{}
\endsnippet

\snippet{\prop}{Proposition}[amsthm]
\preamble{\newtheorem{proposition}{Proposition}}
\begin{proposition}
  #{}
\end{proposition}
#{}
\endsnippet

\snippet{\defn}{Definition}[amsthm]
\preamble{\newtheorem{definition}{Definition}}
\begin{definition}
  #{}
\end{definition}
#{}
\endsnippet

\snippet{\rem}{Remark}[amsthm]
\preamble{\newtheorem{remark}{Remark}}
\begin{remark}
  #{}
\end{remark}
#{}
\endsnippet
`

export default text
