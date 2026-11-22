// Built-in snippets: shortcuts. The format is described in
// ../format.ts; this is plain .sxs text.
const text = String.raw`
% Math shortcuts that expand as you type (\shortcut: math, auto).

% Structure
\shortcut{//}{\frac{#{}}{#{}}#{}}   % Fraction
\shortcut{sq}{\sqrt{#{}}#{}}   % Square root
\shortcut{^^}{^{#{}}#{}}   % Superscript
\shortcut{__}{_{#{}}#{}}   % Subscript
\shortcut{sum}{\sum_{#{}}^{#{}}#{}}   % Sum with limits
\shortcut{int}{\int_{#{}}^{#{}}#{}}   % Integral with limits
\shortcut{lim}{\lim_{#{n} \to #{\infty}}#{}}   % Limit

% Greek: @ and a letter
\shortcut{@a}{\alpha}   % alpha
\shortcut{@b}{\beta}   % beta
\shortcut{@g}{\gamma}   % gamma
\shortcut{@d}{\delta}   % delta
\shortcut{@e}{\epsilon}   % epsilon
\shortcut{@z}{\zeta}   % zeta
\shortcut{@h}{\eta}   % eta
\shortcut{@t}{\theta}   % theta
\shortcut{@i}{\iota}   % iota
\shortcut{@k}{\kappa}   % kappa
\shortcut{@l}{\lambda}   % lambda
\shortcut{@m}{\mu}   % mu
\shortcut{@n}{\nu}   % nu
\shortcut{@x}{\xi}   % xi
\shortcut{@p}{\pi}   % pi
\shortcut{@r}{\rho}   % rho
\shortcut{@s}{\sigma}   % sigma
\shortcut{@u}{\upsilon}   % upsilon
\shortcut{@f}{\phi}   % phi
\shortcut{@c}{\chi}   % chi
\shortcut{@y}{\psi}   % psi
\shortcut{@o}{\omega}   % omega
\shortcut{@G}{\Gamma}   % Gamma (capital)
\shortcut{@D}{\Delta}   % Delta (capital)
\shortcut{@T}{\Theta}   % Theta (capital)
\shortcut{@L}{\Lambda}   % Lambda (capital)
\shortcut{@X}{\Xi}   % Xi (capital)
\shortcut{@P}{\Pi}   % Pi (capital)
\shortcut{@S}{\Sigma}   % Sigma (capital)
\shortcut{@U}{\Upsilon}   % Upsilon (capital)
\shortcut{@F}{\Phi}   % Phi (capital)
\shortcut{@Y}{\Psi}   % Psi (capital)
\shortcut{@O}{\Omega}   % Omega (capital)

% Arrows and relations
\shortcut{<->}{\leftrightarrow}   % Left-right arrow
\shortcut{->}{\to}   % Right arrow (to)
\shortcut{=>}{\implies}   % Implies
\shortcut{<=>}{\iff}   % If and only if
\shortcut{<=}{\leq}   % Less than or equal
\shortcut{>=}{\geq}   % Greater than or equal
\shortcut{!=}{\neq}   % Not equal
\shortcut{+-}{\pm}   % Plus or minus
\shortcut{xx}{\times}   % Times
\shortcut{~~}{\sim}   % Similar to
\shortcut{~=}{\approx}   % Approximately equal
\shortcut{:=}{\coloneqq}   % Defined as
\shortcut{<<}{\ll}   % Much less than
\shortcut{>>}{\gg}   % Much greater than
\shortcut{...}{\dots}   % Dots
\shortcut{ooo}{\infty}   % Infinity

% Sets and logic
\shortcut{RR}{\mathbb{R}}   % Real numbers
\shortcut{NN}{\mathbb{N}}   % Natural numbers
\shortcut{ZZ}{\mathbb{Z}}   % Integers
\shortcut{QQ}{\mathbb{Q}}   % Rational numbers
\shortcut{CC}{\mathbb{C}}   % Complex numbers
\shortcut{AA}{\forall}   % For all
\shortcut{EX}{\exists}   % There exists
\shortcut{sse}{\subseteq}   % Subset or equal
\shortcut{nin}{\notin}   % Not in

% Accents and fonts
\shortcut{bar}{\bar{#{}}#{}}   % Bar accent
\shortcut{hat}{\hat{#{}}#{}}   % Hat accent
\shortcut{til}{\tilde{#{}}#{}}   % Tilde accent
\shortcut{cal}{\mathcal{#{}}#{}}   % Calligraphic letter
\shortcut{bb}{\mathbb{#{}}#{}}   % Blackboard bold letter
\shortcut{bf}{\mathbf{#{}}#{}}   % Bold letter
\shortcut{bs}{\boldsymbol{#{}}#{}}   % Bold symbol

`

export default text
