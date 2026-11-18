// Built-in snippets: figures. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\fig}{Figure with image}[graphicx]
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\linewidth]{#{example-image}}
  \caption{#{caption}}
  \label{fig:#{label}}
\end{figure}
#{}
\endsnippet

\snippet{\subfig}{Two subfigures side by side}[graphicx,subcaption]
\begin{figure}[htbp]
  \centering
  \begin{subfigure}{0.48\linewidth}
    \includegraphics[width=\linewidth]{#{example-image-a}}
    \caption{#{left caption}}
  \end{subfigure}
  \hfill
  \begin{subfigure}{0.48\linewidth}
    \includegraphics[width=\linewidth]{#{example-image-b}}
    \caption{#{right caption}}
  \end{subfigure}
  \caption{#{caption}}
  \label{fig:#{label}}
\end{figure}
#{}
\endsnippet

\snippet{\herefig}{Figure pinned exactly here}[graphicx,float]
\begin{figure}[H]
  \centering
  \includegraphics[width=0.8\linewidth]{#{example-image}}
  \caption{#{caption}}
  \label{fig:#{label}}
\end{figure}
#{}
\endsnippet
`

export default text
