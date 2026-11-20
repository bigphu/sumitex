/**
 * What a palette row can show beyond the stock title and description, as
 * in the mockup (frames 2 and 17): a group heading, an icon, keys on the
 * right, or a file:line location. SumiTeX's own sources fill it in; for
 * the stock sources palette-row.tsx works it out from the result.
 */
export type PaletteGroup =
  | 'Recent files'
  | 'Recently used'
  | 'Suggested'
  | 'Files'
  | 'Commands'
  | 'Sections in this file'
  | 'Blocks in this project'
  | 'Labels in this file'
  | 'Go to line'

export type PaletteExtras = {
  group?: PaletteGroup
  /** A short glyph shown before the title, such as § or # */
  glyph?: string
  /** A Material icon shown before the title (blocks, as in the Outline) */
  icon?: string
  /** Shown on the right in a mono font, e.g. 03-method.tex:20 */
  location?: string
  /** Indent level, for sections */
  indent?: number
}
