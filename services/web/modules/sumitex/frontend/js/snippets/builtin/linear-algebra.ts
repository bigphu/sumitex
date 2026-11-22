// Built-in snippets: linear algebra. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet[math]{\bmat}{Matrix in brackets}[amsmath]
\begin{bmatrix}
  #{a} & #{b} \\
  #{c} & #{d}
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\pmat}{Matrix in parentheses}[amsmath]
\begin{pmatrix}
  #{a} & #{b} \\
  #{c} & #{d}
\end{pmatrix}#{}
\endsnippet

\snippet[math]{\vmat}{Determinant |…|}[amsmath]
\begin{vmatrix}
  #{a} & #{b} \\
  #{c} & #{d}
\end{vmatrix}#{}
\endsnippet

\snippet[math]{\matn}{m × n matrix with dots}[amsmath]
\begin{bmatrix}
  #{a}_{11} & \cdots & #{a}_{1n} \\
  \vdots & \ddots & \vdots \\
  #{a}_{m1} & \cdots & #{a}_{mn}
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\colvec}{Column vector}[amsmath]
\begin{bmatrix}
  #{x_1} \\ #{x_2} \\ \vdots \\ #{x_n}
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\idmat}{3 × 3 identity matrix}[amsmath]
\begin{bmatrix}
  1 & 0 & 0 \\
  0 & 1 & 0 \\
  0 & 0 & 1
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\sys}{System of equations with a brace}[amsmath]
\left\{
\begin{aligned}
  #{x + y} &= #{b_1} \\
  #{x - y} &= #{b_2}
\end{aligned}
\right.#{}
\endsnippet

% Any size: \bmat3x4, \pmat2x2, \vmat3x3, \colvec5, \idmat4
\snippet[math]{\bmat#{r:1-12}x#{c:1-12}}{Matrix in brackets, #{r} × #{c}}[amsmath]
\begin{bmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\pmat#{r:1-12}x#{c:1-12}}{Matrix in parentheses, #{r} × #{c}}[amsmath]
\begin{pmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{pmatrix}#{}
\endsnippet

\snippet[math]{\vmat#{r:1-12}x#{c:1-12}}{Determinant, #{r} × #{c}}[amsmath]
\begin{vmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{vmatrix}#{}
\endsnippet

\snippet[math]{\colvec#{n:1-20}}{Column vector, #{n} entries}[amsmath]
\begin{bmatrix}
\rows{n}{  #{}}
\end{bmatrix}#{}
\endsnippet

\snippet[math]{\idmat#{n:1-12}}{#{n} × #{n} identity matrix}[amsmath]
\begin{bmatrix}
\rows{n}{  \cols{n}{\ifsame{@row}{@col}{1}{0}}}
\end{bmatrix}#{}
\endsnippet

% As you type, sizes 1 to 9: mat3x4, pmat2x2, vmat3x3, vec4, id3
\snippet[math,auto]{mat#{r:1-9}x#{c:1-9}}{Matrix #{r} × #{c}}[amsmath]
\begin{bmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{bmatrix}#{}
\endsnippet

\snippet[math,auto]{pmat#{r:1-9}x#{c:1-9}}{Matrix in parentheses #{r} × #{c}}[amsmath]
\begin{pmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{pmatrix}#{}
\endsnippet

\snippet[math,auto]{vmat#{r:1-9}x#{c:1-9}}{Determinant #{r} × #{c}}[amsmath]
\begin{vmatrix}
\rows{r}{  \cols{c}{#{}}}
\end{vmatrix}#{}
\endsnippet

\snippet[math,auto]{vec#{n:1-9}}{Column vector of #{n}}[amsmath]
\begin{bmatrix}
\rows{n}{  #{}}
\end{bmatrix}#{}
\endsnippet

\snippet[math,auto]{id#{n:1-9}}{#{n} × #{n} identity}[amsmath]
\begin{bmatrix}
\rows{n}{  \cols{n}{\ifsame{@row}{@col}{1}{0}}}
\end{bmatrix}#{}
\endsnippet

% Linear algebra
\shortcut{TT}{^\top}   % Transpose
\shortcut{inv}{^{-1}}   % Inverse
\shortcut{Tr}{\operatorname{tr}}   % Trace
\shortcut{rank}{\operatorname{rank}}   % Rank
\shortcut{diag}{\operatorname{diag}}   % Diagonal
\shortcut{span}{\operatorname{span}}   % Span
\shortcut{det}{\det}   % Determinant
\shortcut{otimes}{\otimes}   % Tensor product
\shortcut{oplus}{\oplus}   % Direct sum
\shortcut{odot}{\odot}   % Element-wise product
`

export default text
