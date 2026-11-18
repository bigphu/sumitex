/**
 * Snippets that bring their packages (features list, 7): the first presets
 * from the catalogue, the ones used most.
 *
 * In templates, `#{name}` is a placeholder (Tab and Shift+Tab move between
 * them, in order of appearance) and `#{}` an empty one; the cursor ends at
 * the last. Everything else is literal (snippetTemplate, in
 * snippets-with-packages.ts, escapes it for CodeMirror).
 *
 * A snippet should compile as soon as it goes in, since auto-compile may
 * run before anything is typed: images name mwe's example-image files
 * (in TeX Live), and math never starts with an empty placeholder line,
 * which TeX reads as a paragraph break. Triggers avoid real command names
 * (\tikzpic, not \tikz, which draws inline pictures).
 */

export type PresetContext = 'text' | 'math'

export type Preset = {
  /** What you type, with its backslash */
  trigger: string
  /** What the menu shows */
  label: string
  category:
    | 'figure'
    | 'table'
    | 'list'
    | 'math'
    | 'theorem'
    | 'reference'
    | 'code'
    | 'diagram'
    | 'project'
    | 'personal'
  /** Where it is offered: in text (the default) or inside math */
  context?: PresetContext
  template: string
  /** Packages it needs, in load order */
  packages?: string[]
  /** Preamble lines it needs, added before \begin{document} when missing */
  preamble?: string[]
}

const r = String.raw

export const PRESETS: Preset[] = [
  // Figures
  {
    trigger: r`\fig`,
    label: 'Figure with image',
    category: 'figure',
    packages: ['graphicx'],
    template: r`\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\linewidth]{#{example-image}}
  \caption{#{caption}}
  \label{fig:#{label}}
\end{figure}
#{}`,
  },
  {
    trigger: r`\subfig`,
    label: 'Two subfigures side by side',
    category: 'figure',
    packages: ['graphicx', 'subcaption'],
    template: r`\begin{figure}[htbp]
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
#{}`,
  },
  {
    trigger: r`\herefig`,
    label: 'Figure pinned exactly here',
    category: 'figure',
    packages: ['graphicx', 'float'],
    template: r`\begin{figure}[H]
  \centering
  \includegraphics[width=0.8\linewidth]{#{example-image}}
  \caption{#{caption}}
  \label{fig:#{label}}
\end{figure}
#{}`,
  },

  // Tables
  {
    trigger: r`\table`,
    label: 'Basic table',
    category: 'table',
    template: r`\begin{table}[htbp]
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
#{}`,
  },
  {
    trigger: r`\booktab`,
    label: 'Clean table with rules',
    category: 'table',
    packages: ['booktabs'],
    template: r`\begin{table}[htbp]
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
#{}`,
  },
  {
    trigger: r`\widetab`,
    label: 'Full-width table',
    category: 'table',
    packages: ['tabularx', 'booktabs'],
    template: r`\begin{table}[htbp]
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
#{}`,
  },

  // Lists
  {
    trigger: r`\ilist`,
    label: 'Bulleted list',
    category: 'list',
    template: r`\begin{itemize}
  \item #{}
  \item
  \item
\end{itemize}
#{}`,
  },
  {
    trigger: r`\elist`,
    label: 'Numbered list',
    category: 'list',
    template: r`\begin{enumerate}
  \item #{}
  \item
  \item
\end{enumerate}
#{}`,
  },
  {
    trigger: r`\alist`,
    label: 'Lettered list a), b), c)',
    category: 'list',
    packages: ['enumitem'],
    template: r`\begin{enumerate}[label=\alph*)]
  \item #{}
  \item
  \item
\end{enumerate}
#{}`,
  },

  // Math
  {
    trigger: r`\eq`,
    label: 'Numbered equation',
    category: 'math',
    packages: ['amsmath'],
    template: r`\begin{equation}
  #{equation}
  \label{eq:#{label}}
\end{equation}
#{}`,
  },
  {
    trigger: r`\align`,
    label: 'Aligned equations',
    category: 'math',
    packages: ['amsmath'],
    template: r`\begin{align}
  #{} &= #{} \\
  &= #{}
\end{align}
#{}`,
  },
  {
    trigger: r`\cases`,
    label: 'Piecewise function',
    category: 'math',
    context: 'math',
    packages: ['amsmath'],
    template: r`\begin{cases}
  #{} & \text{if } #{} \\
  #{} & \text{otherwise}
\end{cases}#{}`,
  },
  {
    trigger: r`\bmat`,
    label: 'Matrix in brackets',
    category: 'math',
    context: 'math',
    packages: ['amsmath'],
    template: r`\begin{bmatrix}
  #{a} & #{b} \\
  #{c} & #{d}
\end{bmatrix}#{}`,
  },

  // Theorems
  {
    trigger: r`\thm`,
    label: 'Theorem',
    category: 'theorem',
    packages: ['amsthm'],
    preamble: [r`\newtheorem{theorem}{Theorem}`],
    template: r`\begin{theorem}
  #{}
\end{theorem}
#{}`,
  },
  {
    trigger: r`\proof`,
    label: 'Proof ending with □',
    category: 'theorem',
    packages: ['amsthm'],
    template: r`\begin{proof}
  #{}
\end{proof}
#{}`,
  },

  // References
  {
    trigger: r`\cref`,
    label: 'Smart reference ("Figure 3")',
    category: 'reference',
    packages: ['hyperref', 'cleveref'],
    template: r`\cref{#{label}}#{}`,
  },

  // Code and diagrams
  {
    trigger: r`\code`,
    label: 'Code listing',
    category: 'code',
    packages: ['listings'],
    template: r`\begin{lstlisting}[language=#{Python}, caption={#{caption}}, numbers=left]
#{}
\end{lstlisting}
#{}`,
  },
  {
    trigger: r`\algo`,
    label: 'Pseudocode',
    category: 'code',
    packages: ['algorithm', 'algpseudocode'],
    template: r`\begin{algorithm}
  \caption{#{caption}}
  \begin{algorithmic}[1]
    \Procedure{#{Name}}{#{args}}
      \State #{}
      \State \Return
    \EndProcedure
  \end{algorithmic}
\end{algorithm}
#{}`,
  },
  {
    trigger: r`\tikzpic`,
    label: 'TikZ picture',
    category: 'diagram',
    packages: ['tikz'],
    template: r`\begin{tikzpicture}
  #{}
\end{tikzpicture}
#{}`,
  },
]
