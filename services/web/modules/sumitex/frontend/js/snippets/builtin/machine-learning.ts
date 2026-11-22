// Built-in snippets: machine learning. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
\snippet[math]{\loss}{Empirical risk (average loss)}[amsmath]
\mathcal{L}(#{\theta}) = \frac{1}{#{n}} \sum_{i=1}^{#{n}} \ell\bigl(f_{#{\theta}}(x_i), y_i\bigr)#{}
\endsnippet

\snippet[math]{\softmax}{Softmax}[amsmath]
\operatorname{softmax}(#{z})_i = \frac{e^{#{z}_i}}{\sum_{j} e^{#{z}_j}}#{}
\endsnippet

\snippet[math]{\gdstep}{Gradient descent step}
#{\theta}_{t+1} = #{\theta}_t - #{\eta} \nabla \mathcal{L}(#{\theta}_t)#{}
\endsnippet

% Machine learning
\shortcut{amin}{\operatorname*{arg\,min}_{#{}}#{}}   % Arg min
\shortcut{amax}{\operatorname*{arg\,max}_{#{}}#{}}   % Arg max
\shortcut{nrm}{\lVert #{} \rVert#{}}   % Norm
\shortcut{abs}{\lvert #{} \rvert#{}}   % Absolute value
\shortcut{grad}{\nabla}   % Gradient (nabla)
\shortcut{par}{\frac{\partial #{}}{\partial #{}}#{}}   % Partial derivative
\shortcut{KL}{D_{\mathrm{KL}}(#{} \,\|\, #{})#{}}   % KL divergence
\shortcut{smax}{\operatorname{softmax}}   % Softmax
\shortcut{ell}{\ell}   % Script l (loss)
`

export default text
