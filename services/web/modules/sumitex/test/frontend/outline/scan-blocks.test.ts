import { expect } from 'chai'
import { EditorState } from '@codemirror/state'
import { LanguageSupport, ensureSyntaxTree } from '@codemirror/language'
import { LaTeXLanguage } from '@/features/source-editor/languages/latex/latex-language'
import { plainText, scanBlocks } from '../../../frontend/js/outline/scan-blocks'

const scan = (...lines: string[]) => {
  const doc = lines.join('\n') + '\n'
  const state = EditorState.create({
    doc,
    extensions: [new LanguageSupport(LaTeXLanguage)],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return scanBlocks(state)
}

const brief = (blocks: ReturnType<typeof scanBlocks>) =>
  blocks.map(block => `${block.kind}:${block.title}`)

describe('SumiTeX outline: scanning blocks', function () {
  it('finds each kind, in order, with its line', function () {
    const blocks = scan(
      '\\section{Intro}',
      '\\begin{figure}[h]',
      '  \\includegraphics{img/setup}',
      '  \\caption{Setup photo}\\label{fig:setup}',
      '\\end{figure}',
      'See \\cref{fig:setup} and \\eqref{eq:e}.',
      '\\begin{equation}\\label{eq:e}',
      '  E = mc^2',
      '\\end{equation}',
      '\\begin{enumerate}',
      '  \\item one',
      '  \\item two',
      '\\end{enumerate}',
      '\\[ a^2 + b^2 = c^2 \\]',
      '\\begin{lstlisting}[language=Python, caption={Fibonacci}]',
      'print(1)',
      '\\end{lstlisting}',
      '\\begin{theorem}[Pythagoras]',
      '  x',
      '\\end{theorem}',
      '\\begin{tikzpicture}',
      '\\end{tikzpicture}',
      '\\todo{check the numbers}'
    )
    expect(brief(blocks)).to.deep.equal([
      'figure:Setup photo',
      'equation:E = mc^2',
      'list:enumerate (2)',
      'equation:a^2 + b^2 = c^2',
      'code:Fibonacci',
      'theorem:Pythagoras',
      'graph:tikzpicture',
      'note:check the numbers',
    ])
    expect(blocks[0]).to.include({
      line: 2,
      endLine: 5,
      label: 'fig:setup',
      image: 'img/setup',
    })
    expect(blocks[0].problems).to.deep.equal([])
    expect(blocks[1].math).to.include('E = mc^2')
    expect(blocks[2].items).to.equal(2)
  })

  it('counts a block inside another once, as the outer one', function () {
    const blocks = scan(
      '\\begin{figure}',
      '  \\begin{subfigure}{0.5\\linewidth}',
      '    \\caption{Left}',
      '  \\end{subfigure}',
      '  \\begin{tikzpicture}',
      '    \\draw (0,0) -- (1,1);',
      '  \\end{tikzpicture}',
      '  \\caption{Both sides}\\label{fig:both}',
      '\\end{figure}',
      '\\begin{table}',
      '  \\caption{Rates}',
      '  \\begin{tabular}{lcr}',
      '    a & b & c \\\\',
      '    d & e & f \\\\',
      '  \\end{tabular}',
      '\\end{table}',
      '\\begin{itemize}',
      '  \\item outer',
      '  \\begin{itemize}',
      '    \\item inner',
      '  \\end{itemize}',
      '\\end{itemize}'
    )
    expect(brief(blocks)).to.deep.equal([
      'figure:Both sides',
      'table:Rates',
      'list:itemize (1)',
    ])
    expect(blocks[1].size).to.deep.equal({ rows: 2, columns: 3 })
  })

  it('marks problems: no caption, no label, a label nothing refers to', function () {
    const blocks = scan(
      '\\begin{figure}',
      '  \\includegraphics{a}',
      '\\end{figure}',
      '\\begin{table}',
      '  \\caption{Has both}\\label{tab:lonely}',
      '\\end{table}',
      '\\begin{equation}\\label{eq:lonely} x \\end{equation}',
      '\\begin{equation} y \\end{equation}'
    )
    expect(blocks.map(block => block.problems)).to.deep.equal([
      ['No caption', 'No label'],
      ['Its label isn’t referred to in this file'],
      ['Its label isn’t referred to in this file'],
      [],
    ])
  })

  it('ignores blocks in comments and in verbatim', function () {
    const blocks = scan(
      '% \\begin{figure}\\caption{no}\\end{figure}',
      '\\begin{verbatim}',
      '\\begin{table}\\end{table}',
      '\\end{verbatim}'
    )
    expect(blocks).to.deep.equal([])
  })

  it('reads a caption as plain text', function () {
    expect(plainText('The \\textbf{growth} of $x$~rates\\label{f}')).to.equal(
      'The growth of x rates'
    )
  })
})
