/**
 * SumiTeX's built-in snippets and math shortcuts, one file per subject.
 * Each file is plain snippet text (../format.ts): to add one, add a
 * \snippet or \shortcut to the file it belongs in, or a new file listed
 * here.
 */
import shortcuts from './shortcuts'
import figures from './figures'
import tables from './tables'
import lists from './lists'
import math from './math'
import linear_algebra from './linear-algebra'
import statistics from './statistics'
import machine_learning from './machine-learning'
import theorems from './theorems'
import code from './code'
import diagrams from './diagrams'
import reports from './reports'

export const BUILTIN_FILES: [group: string, text: string][] = [
  ['shortcuts', shortcuts],
  ['figures', figures],
  ['tables', tables],
  ['lists', lists],
  ['math', math],
  ['linear-algebra', linear_algebra],
  ['statistics', statistics],
  ['machine-learning', machine_learning],
  ['theorems', theorems],
  ['code', code],
  ['diagrams', diagrams],
  ['reports', reports],
]
