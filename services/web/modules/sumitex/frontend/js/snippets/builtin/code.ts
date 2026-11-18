// Built-in snippets: code. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet{\code}{Code listing}[listings]
\begin{lstlisting}[language=#{Python}, caption={#{caption}}, numbers=left]
#{}
\end{lstlisting}
#{}
\endsnippet

\snippet{\algo}{Pseudocode}[algorithm,algpseudocode]
\begin{algorithm}
  \caption{#{caption}}
  \begin{algorithmic}[1]
    \Procedure{#{Name}}{#{args}}
      \State #{}
      \State \Return
    \EndProcedure
  \end{algorithmic}
\end{algorithm}
#{}
\endsnippet

\snippet{\train}{Training loop (pseudocode)}[algorithm,algpseudocode]
\begin{algorithm}
  \caption{#{Training loop}}
  \begin{algorithmic}[1]
    \Require data $\mathcal{D}$, learning rate $#{\eta}$
    \For{#{epoch} $= 1, \dots, #{E}$}
      \For{each minibatch $B \subset \mathcal{D}$}
        \State $\theta \gets \theta - \eta \nabla_\theta \mathcal{L}(\theta; B)$
      \EndFor
    \EndFor
    \State \Return $\theta$
  \end{algorithmic}
\end{algorithm}
#{}
\endsnippet
`

export default text
