// Built-in snippets: lists. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\ilist}{Bulleted list}
\begin{itemize}
  \item #{}
  \item
  \item
\end{itemize}
#{}
\endsnippet

\snippet{\elist}{Numbered list}
\begin{enumerate}
  \item #{}
  \item
  \item
\end{enumerate}
#{}
\endsnippet

\snippet{\alist}{Lettered list a), b), c)}[enumitem]
\begin{enumerate}[label=\alph*)]
  \item #{}
  \item
  \item
\end{enumerate}
#{}
\endsnippet

\snippet{\ilist#{n:1-20}}{Bulleted list, #{n} items}
\begin{itemize}
\lines{n}{  \item #{}}
\end{itemize}
#{}
\endsnippet

\snippet{\elist#{n:1-20}}{Numbered list, #{n} items}
\begin{enumerate}
\lines{n}{  \item #{}}
\end{enumerate}
#{}
\endsnippet

\snippet{\alist#{n:1-20}}{Lettered list, #{n} items}[enumitem]
\begin{enumerate}[label=\alph*)]
\lines{n}{  \item #{}}
\end{enumerate}
#{}
\endsnippet
`

export default text
