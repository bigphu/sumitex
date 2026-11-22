import { AvailableUnfilledIcon } from '@/shared/components/material-icon'

const iconTypeFromName = (name: string): AvailableUnfilledIcon => {
  let ext = name.split('.').pop()
  ext = ext ? ext.toLowerCase() : ext

  if (ext === 'pdf') {
    return 'picture_as_pdf' // SumiTeX: PDFs apart from images
  } else if (ext && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'eps'].includes(ext)) { // SumiTeX: svg, eps
    return 'image'
  } else if (ext && ['csv', 'xls', 'xlsx'].includes(ext)) {
    return 'table_chart'
  } else if (ext && ['py', 'r'].includes(ext)) {
    return 'code'
  } else if (ext && ['bib'].includes(ext)) {
    return 'book_5'
  }
  return 'description'
}

export default iconTypeFromName
