import { expect } from 'chai'
import { mathTitle, previewTex } from '../../../frontend/js/outline/math-text'

describe('SumiTeX outline: equations as people read them', function () {
  it('reads the mockup’s equation as the mockup shows it', function () {
    expect(
      mathTitle('\\hat{\\theta} = \\arg\\min_{\\theta} \\frac{1}{n} \\sum_{i=1}^{n} \\ell(f_\\theta(x_i), y_i)')
    ).to.equal('θ̂ = arg min_θ 1/n Σᵢ₌₁ⁿ ℓ(f_θ(xᵢ), yᵢ)')
  })

  it('reads an align as its lines, without & or the label', function () {
    expect(
      mathTitle(
        '\\alpha + \\beta \\iff \\pi \\int_{-\\infty}^{+\\infty}x dx + \\sum_{n}^{n+1}i &= 123 \\\\\n &= 123123123\n \\label{eq:x}'
      )
    ).to.equal('α + β ⇔ π ∫_(-∞)^(+∞)x dx + Σₙⁿ⁺¹i = 123 ; = 123123123')
  })

  it('keeps common shapes readable', function () {
    expect(mathTitle('E = mc^2')).to.equal('E = mc²')
    expect(mathTitle('x \\in \\mathbb{R}^d')).to.equal('x ∈ ℝᵈ')
    expect(mathTitle('\\sqrt{a^2 + b^2} \\leq \\frac{a+b}{2}')).to.equal('√(a² + b²) ≤ (a+b)/2')
    expect(mathTitle('\\left( \\sum_k x_k \\right)^{p}')).to.equal('(Σₖ xₖ)ᵖ')
    expect(mathTitle('\\text{if } x > 0')).to.equal('if x > 0')
  })

  it('draws an align the way LaTeX lays it out', function () {
    expect(previewTex('align', 'a &= b \\\\ &= c \\label{eq:x}')).to.equal(
      '\\begin{aligned}a &= b \\\\ &= c\\end{aligned}'
    )
    expect(previewTex('gather*', 'a \\\\ b')).to.equal('\\begin{gathered}a \\\\ b\\end{gathered}')
    expect(previewTex('equation', 'x = 1 \\label{eq:y}')).to.equal('x = 1')
  })
})
