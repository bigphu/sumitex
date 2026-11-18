// Built-in snippets: diagrams. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\tikzpic}{TikZ picture}[tikz]
\begin{tikzpicture}
  #{}
\end{tikzpicture}
#{}
\endsnippet

\snippet{\flow}{Flowchart: three boxes and arrows}[tikz]
\preamble{\usetikzlibrary{positioning,arrows.meta}}
\begin{tikzpicture}[node distance=1.6cm,
  box/.style={draw, rounded corners, minimum height=2.2em, align=center}]
  \node[box] (a) {#{Data}};
  \node[box, right=of a] (b) {#{Model}};
  \node[box, right=of b] (c) {#{Results}};
  \draw[-{Stealth}] (a) -- (b);
  \draw[-{Stealth}] (b) -- (c);
\end{tikzpicture}
#{}
\endsnippet

\snippet{\lineplot}{Line plot of a function}[pgfplots]
\preamble{\pgfplotsset{compat=1.18}}
\begin{tikzpicture}
  \begin{axis}[xlabel={#{$x$}}, ylabel={#{$f(x)$}}, grid=major, width=0.8\linewidth]
    \addplot[thick, domain=#{-2:2}, samples=100] {#{x^2}};
  \end{axis}
\end{tikzpicture}
#{}
\endsnippet

\snippet{\scatter}{Scatter plot of data points}[pgfplots]
\preamble{\pgfplotsset{compat=1.18}}
\begin{tikzpicture}
  \begin{axis}[xlabel={#{$x$}}, ylabel={#{$y$}}, width=0.8\linewidth]
    \addplot[only marks] coordinates {#{(1,2.1) (2,3.4) (3,2.9) (4,4.6) (5,5.2)}};
  \end{axis}
\end{tikzpicture}
#{}
\endsnippet

\snippet{\barchart}{Bar chart}[pgfplots]
\preamble{\pgfplotsset{compat=1.18}}
\begin{tikzpicture}
  \begin{axis}[ybar, symbolic x coords={#{A,B,C}}, xtick=data,
    ylabel={#{Count}}, ymin=0, width=0.8\linewidth]
    \addplot coordinates {#{(A,3) (B,5) (C,2)}};
  \end{axis}
\end{tikzpicture}
#{}
\endsnippet
`

export default text
