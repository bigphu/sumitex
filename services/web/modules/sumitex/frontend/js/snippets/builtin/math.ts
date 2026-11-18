// Built-in snippets: math. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\eq}{Numbered equation}[amsmath]
\begin{equation}
  #{equation}
  \label{eq:#{label}}
\end{equation}
#{}
\endsnippet

\snippet{\eqs}{Unnumbered display equation}
\[
  #{x}
\]
#{}
\endsnippet

\snippet{\align}{Aligned equations}[amsmath]
\begin{align}
  #{} &= #{} \\
  &= #{}
\end{align}
#{}
\endsnippet

\snippet{\sube}{Numbered sub-equations (1a), (1b)}[amsmath]
\begin{subequations}
  \label{eq:#{group}}
  \begin{align}
    #{a} &= #{b} \\
    #{c} &= #{d}
  \end{align}
\end{subequations}
#{}
\endsnippet

\snippet[math]{\cases}{Piecewise function}[amsmath]
\begin{cases}
  #{} & \text{if } #{} \\
  #{} & \text{otherwise}
\end{cases}#{}
\endsnippet

\snippet{\align#{n:1-20}}{Aligned equations, #{n} lines}[amsmath]
\begin{align}
\rows{n}{  #{} &= #{}}
\end{align}
#{}
\endsnippet

\snippet[math]{\cases#{n:1-9}}{Piecewise function, #{n} cases}[amsmath]
\begin{cases}
\rows{n}{  #{} & \text{if } #{}}
\end{cases}#{}
\endsnippet
`

export default text
