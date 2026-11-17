/**
 * Plain-language explanations for the compile errors writers meet most
 * (guide Phase 3a; features list, 6), shown when a problem is opened in
 * the Problems panel (layout/log-problems.tsx).
 *
 * Each one says what LaTeX means and what to do, in the error's own terms
 * where the log gives them (the command, the file, how many points too
 * wide). Links go to the package's page on CTAN, or to a well-known LaTeX
 * guide for general errors. Errors not listed here keep Overleaf's hint.
 *
 * Kept as data, one entry per error, so adding one needs no other change.
 */
import type { ReactNode } from 'react'
import type { LogEntry } from '@/features/pdf-preview/util/types'
import { COMMANDS, ENVIRONMENTS, ctanUrl } from './packages'

export type Explanation = { text: ReactNode; link?: string }

const GUIDE = 'https://en.wikibooks.org/wiki/LaTeX'

const command = (entry: LogEntry) =>
  entry.contentDetails?.[0]?.match(/^\\([a-zA-Z@]+)/)?.[1]

const has = <T,>(table: Record<string, T>, key: string | undefined) =>
  key !== undefined && Object.prototype.hasOwnProperty.call(table, key)

type Rule = {
  /** Overleaf's rule id, when its parser recognises the error */
  ruleId?: string
  /** Otherwise, a pattern for the message */
  message?: RegExp
  explain: (entry: LogEntry, match: RegExpMatchArray | null) => Explanation
}

const RULES: Rule[] = [
  {
    ruleId: 'hint_undefined_control_sequence',
    explain: entry => {
      const name = command(entry)
      if (name && has(COMMANDS, name)) {
        const pkg = COMMANDS[name].suggest
        return {
          text: (
            <>
              LaTeX doesn't know <code>\{name}</code> yet. It comes from the{' '}
              <b>{pkg}</b> package: load it with the button above, then
              recompile.
            </>
          ),
          link: ctanUrl(pkg),
        }
      }
      return {
        text: (
          <>
            LaTeX doesn't know {name ? <code>\{name}</code> : 'a command'} on
            this line. Usually it is misspelled, or it comes from a package
            the document doesn't load. Check the spelling first.
          </>
        ),
        link: `${GUIDE}/Commands`,
      }
    },
  },
  {
    ruleId: 'hint_undefined_environment',
    explain: entry => {
      const env = entry.contentDetails?.[0]
      if (env && has(ENVIRONMENTS, env)) {
        const pkg = ENVIRONMENTS[env].suggest
        return {
          text: (
            <>
              The <code>{env}</code> environment comes from the <b>{pkg}</b>{' '}
              package, which the document doesn't load. Add it with the
              button above, then recompile.
            </>
          ),
          link: ctanUrl(pkg),
        }
      }
      return {
        text: (
          <>
            LaTeX doesn't know the environment{' '}
            {env ? <code>{env}</code> : 'started here'}. Check its spelling
            in both <code>\begin</code> and <code>\end</code>, or load the
            package that defines it.
          </>
        ),
      }
    },
  },
  {
    ruleId: 'hint_missing_begin_document_',
    explain: () => ({
      text: (
        <>
          LaTeX met text or a command that only belongs in the document
          before <code>\begin{'{document}'}</code>. This is often a knock-on
          error: an earlier mistake (an unknown command in the preamble, for
          example) made LaTeX give up on the preamble. Fix the first error in
          the list and recompile.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_missing_inserted',
    explain: () => ({
      text: (
        <>
          Something that only works in maths, such as <code>_</code>,{' '}
          <code>^</code> or <code>\alpha</code>, is in ordinary text, so LaTeX
          added a <code>$</code> to switch to maths. Put the formula in{' '}
          <code>$…$</code>, or write <code>\_</code> for a literal underscore.
        </>
      ),
      link: `${GUIDE}/Mathematics`,
    }),
  },
  {
    ruleId: 'hint_file_not_found',
    explain: entry => {
      const file = entry.message?.match(/File [`']?([^'`\s]+)'? not found/)?.[1]
      if (file && /\.(sty|cls)$/.test(file)) {
        return {
          text: (
            <>
              <code>{file}</code> isn't installed on this server's TeX Live.
              Check the package or class name for typos; if it is right, it
              may need a newer TeX Live (Compiler settings) or a copy in the
              project.
            </>
          ),
          link: ctanUrl(file.replace(/\.(sty|cls)$/, '')),
        }
      }
      return {
        text: (
          <>
            LaTeX can't find {file ? <code>{file}</code> : 'a file'}. Check the
            spelling, the folder and the letter case. Paths are relative to
            the main file, not to the file that mentions them.
          </>
        ),
      }
    },
  },
  {
    ruleId: 'hint_misplaced_alignment_tab_character',
    explain: () => ({
      text: (
        <>
          An <code>&amp;</code> appears outside a table or an aligned
          equation, where it has no column to separate. To print an
          ampersand, write <code>\&amp;</code>.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_extra_alignment_tab_has_been_changed',
    explain: () => ({
      text: (
        <>
          A row of this table has more <code>&amp;</code> than the table has
          columns. Add a column to the column specification (for example{' '}
          <code>{'{lll}'}</code>) or remove the extra <code>&amp;</code>.
        </>
      ),
      link: `${GUIDE}/Tables`,
    }),
  },
  {
    ruleId: 'hint_reference_undefined',
    explain: () => ({
      text: (
        <>
          A <code>\ref</code> points at a label that doesn't exist yet. Check
          the label's spelling. If you just added the label, recompile once
          more: LaTeX needs two runs to resolve references.
        </>
      ),
      link: `${GUIDE}/Labels_and_Cross-referencing`,
    }),
  },
  {
    ruleId: 'hint_there_were_undefined_references',
    explain: () => ({
      text: (
        <>
          Some <code>\ref</code> or <code>\cite</code> point at nothing yet,
          and show as <b>??</b> in the PDF. The warnings above say which.
          Often a second compile fixes them.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_citation_on_page_undefined_on_input_line',
    explain: () => ({
      text: (
        <>
          This citation key isn't in the bibliography. Check that the key
          matches an entry in your <code>.bib</code> file exactly (keys are
          case-sensitive), and that the bibliography is printed with{' '}
          <code>\bibliography</code> or <code>\printbibliography</code>.
        </>
      ),
      link: `${GUIDE}/Bibliography_Management`,
    }),
  },
  {
    ruleId: 'hint_label_multiply_defined_labels',
    explain: () => ({
      text: (
        <>
          Two <code>\label</code> commands use the same name, so references
          to it can point at the wrong one. Rename one of them; SumiTeX
          underlines both in the editor.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_mismatched_environment',
    explain: () => ({
      text: (
        <>
          An <code>\end</code> doesn't match the <code>\begin</code> it
          closes, often because an environment in between was left open.
          Check the pairs from the inside out.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_can_be_used_only_in_preamble',
    explain: () => ({
      text: (
        <>
          This command (often <code>\usepackage</code>) only works before{' '}
          <code>\begin{'{document}'}</code>. Move it up into the preamble of
          the main file.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_double_superscript',
    explain: () => ({
      text: (
        <>
          Two superscripts in a row, like <code>x^a^b</code>, are ambiguous.
          Group them: <code>{'x^{ab}'}</code> or <code>{'{x^a}^b'}</code>.
        </>
      ),
    }),
  },
  {
    ruleId: 'hint_double_subscript',
    explain: () => ({
      text: (
        <>
          Two subscripts in a row, like <code>x_a_b</code>, are ambiguous.
          Group them: <code>{'x_{ab}'}</code> or <code>{'{x_a}_b'}</code>.
        </>
      ),
    }),
  },
  {
    message: /Overfull \\hbox \(([\d.]+)pt too wide\)/,
    explain: (_, match) => ({
      text: (
        <>
          A line is {match?.[1]} pt wider than the text column, so it sticks
          into the margin. Usually a long word, a URL or a formula LaTeX
          can't break. Rephrase, allow a break (<code>\allowbreak</code>,{' '}
          <code>\url</code>), or accept the warning if it is small.
        </>
      ),
    }),
  },
  {
    message: /Underfull \\hbox/,
    explain: () => ({
      text: (
        <>
          A line has too little text and LaTeX stretched the spaces more
          than it likes. Often a <code>\\</code> after a paragraph or a short
          last line; harmless unless the gaps look odd in the PDF.
        </>
      ),
    }),
  },
]

/** SumiTeX's explanation for a log entry, or null to keep Overleaf's */
export function explain(entry: LogEntry): Explanation | null {
  for (const rule of RULES) {
    if (rule.ruleId && entry.ruleId === rule.ruleId) return rule.explain(entry, null)
    if (rule.message) {
      const match = entry.message?.match(rule.message)
      if (match) return rule.explain(entry, match)
    }
  }
  return null
}
