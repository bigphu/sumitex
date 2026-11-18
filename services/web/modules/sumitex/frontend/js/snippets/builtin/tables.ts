// Built-in snippets: tables. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\table}{Basic table}
\begin{table}[htbp]
  \centering
  \begin{tabular}{|l|l|}
    \hline
    #{Header 1} & #{Header 2} \\
    \hline
    #{} &  \\
    \hline
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet

\snippet{\booktab}{Clean table with rules}[booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabular}{ll}
    \toprule
    #{Header 1} & #{Header 2} \\
    \midrule
    #{} &  \\
    \bottomrule
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet

\snippet{\widetab}{Full-width table}[tabularx,booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabularx}{\linewidth}{lX}
    \toprule
    #{Header 1} & #{Header 2} \\
    \midrule
    #{} &  \\
    \bottomrule
  \end{tabularx}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet

\snippet{\numtab}{Numbers aligned on the decimal point}[siunitx,booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabular}{l S[table-format=2.2] S[table-format=1.2]}
    \toprule
    {#{Sample}} & {#{Mean}} & {#{SD}} \\
    \midrule
    #{A} & 12.34 & 1.20 \\
    #{B} & 9.87 & 0.85 \\
    \bottomrule
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet

\snippet{\table#{r:1-20}x#{c:1-12}}{Table, #{r} × #{c}}
\begin{table}[htbp]
  \centering
  \begin{tabular}{|\repeat{c}{l|}}
    \hline
    \cols{c}{#{Header @col}} \\
    \hline
\lines{r}{    \cols{c}{#{}} \\}
    \hline
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet

\snippet{\booktab#{r:1-20}x#{c:1-12}}{Clean table, #{r} × #{c}}[booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabular}{\repeat{c}{l}}
    \toprule
    \cols{c}{#{Header @col}} \\
    \midrule
\lines{r}{    \cols{c}{#{}} \\}
    \bottomrule
  \end{tabular}
  \caption{#{caption}}
  \label{tab:#{label}}
\end{table}
#{}
\endsnippet
`

export default text
