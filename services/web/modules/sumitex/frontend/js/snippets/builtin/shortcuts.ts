// Built-in snippets: shortcuts. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
% Math shortcuts that expand as you type (\shortcut: math, auto).

% Structure
\shortcut{//}{\frac{#{}}{#{}}#{}}
\shortcut{sq}{\sqrt{#{}}#{}}
\shortcut{^^}{^{#{}}#{}}
\shortcut{__}{_{#{}}#{}}
\shortcut{sum}{\sum_{#{}}^{#{}}#{}}
\shortcut{int}{\int_{#{}}^{#{}}#{}}
\shortcut{lim}{\lim_{#{n} \to #{\infty}}#{}}

% Greek: @ and a letter
\shortcut{@a}{\alpha}
\shortcut{@b}{\beta}
\shortcut{@g}{\gamma}
\shortcut{@d}{\delta}
\shortcut{@e}{\epsilon}
\shortcut{@z}{\zeta}
\shortcut{@h}{\eta}
\shortcut{@t}{\theta}
\shortcut{@i}{\iota}
\shortcut{@k}{\kappa}
\shortcut{@l}{\lambda}
\shortcut{@m}{\mu}
\shortcut{@n}{\nu}
\shortcut{@x}{\xi}
\shortcut{@p}{\pi}
\shortcut{@r}{\rho}
\shortcut{@s}{\sigma}
\shortcut{@u}{\upsilon}
\shortcut{@f}{\phi}
\shortcut{@c}{\chi}
\shortcut{@y}{\psi}
\shortcut{@o}{\omega}
\shortcut{@G}{\Gamma}
\shortcut{@D}{\Delta}
\shortcut{@T}{\Theta}
\shortcut{@L}{\Lambda}
\shortcut{@X}{\Xi}
\shortcut{@P}{\Pi}
\shortcut{@S}{\Sigma}
\shortcut{@U}{\Upsilon}
\shortcut{@F}{\Phi}
\shortcut{@Y}{\Psi}
\shortcut{@O}{\Omega}

% Arrows and relations
\shortcut{<->}{\leftrightarrow}
\shortcut{->}{\to}
\shortcut{=>}{\implies}
\shortcut{<=>}{\iff}
\shortcut{<=}{\leq}
\shortcut{>=}{\geq}
\shortcut{!=}{\neq}
\shortcut{+-}{\pm}
\shortcut{xx}{\times}
\shortcut{~~}{\sim}
\shortcut{~=}{\approx}
\shortcut{:=}{\coloneqq}
\shortcut{<<}{\ll}
\shortcut{>>}{\gg}
\shortcut{...}{\dots}
\shortcut{ooo}{\infty}

% Sets and logic
\shortcut{RR}{\mathbb{R}}
\shortcut{NN}{\mathbb{N}}
\shortcut{ZZ}{\mathbb{Z}}
\shortcut{QQ}{\mathbb{Q}}
\shortcut{CC}{\mathbb{C}}
\shortcut{AA}{\forall}
\shortcut{EX}{\exists}
\shortcut{sse}{\subseteq}
\shortcut{nin}{\notin}

% Accents and fonts
\shortcut{bar}{\bar{#{}}#{}}
\shortcut{hat}{\hat{#{}}#{}}
\shortcut{til}{\tilde{#{}}#{}}
\shortcut{cal}{\mathcal{#{}}#{}}
\shortcut{bb}{\mathbb{#{}}#{}}
\shortcut{bf}{\mathbf{#{}}#{}}
\shortcut{bs}{\boldsymbol{#{}}#{}}

`

export default text
