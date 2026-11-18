// Built-in snippets: statistics. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet[math]{\hyp}{Null and alternative hypotheses}[amsmath]
H_0\colon #{\mu = \mu_0} \quad \text{vs.} \quad H_1\colon #{\mu \neq \mu_0}#{}
\endsnippet

\snippet[math]{\gauss}{Normally distributed variable}
#{X} \sim \mathcal{N}(#{\mu}, #{\sigma^2})#{}
\endsnippet

\snippet[math]{\confint}{Confidence interval for a mean}
\bar{x} \pm z_{#{\alpha/2}} \frac{#{s}}{\sqrt{#{n}}}#{}
\endsnippet

\snippet[math]{\ols}{Least-squares estimator}
\hat{\beta} = (X^\top X)^{-1} X^\top y#{}
\endsnippet

\snippet{\regtab}{Regression results table}[booktabs]
\begin{table}[htbp]
  \centering
  \begin{tabular}{lcc}
    \toprule
     & #{Estimate} & #{Std. error} \\
    \midrule
    #{Intercept} & #{0.12} & #{0.03} \\
    #{$x$} & #{1.05} & #{0.21} \\
    \midrule
    $n$ & \multicolumn{2}{c}{100} \\
    $R^2$ & \multicolumn{2}{c}{#{0.84}} \\
    \bottomrule
  \end{tabular}
  \caption{#{Regression results}}
  \label{tab:#{regression}}
\end{table}
#{}
\endsnippet

\shortcut{EE}{\mathbb{E}}
\shortcut{PP}{\mathbb{P}}
\shortcut{Var}{\operatorname{Var}}
\shortcut{Cov}{\operatorname{Cov}}
\shortcut{iid}{\overset{\text{iid}}{\sim}}
`

export default text
