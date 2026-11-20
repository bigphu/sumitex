import getMeta from '@/utils/meta'
import { useTranslation } from 'react-i18next'
import { useRailContext } from '@/features/ide-react/context/rail-context'
import { useCallback } from 'react'
import {
  OLDropdownDivider,
  OLDropdownItem,
  OLDropdownMenu,
} from '@/shared/components/ol/ol-dropdown-menu'
import { OPEN_SNIPPET_LIBRARY_EVENT } from '@modules/sumitex/frontend/js/completions/snippet-library' // SumiTeX
import { openGuide, useGuideInfo } from '@modules/sumitex/frontend/js/guide/guide-store' // SumiTeX

export default function RailHelpDropdown() {
  const showSupport = getMeta('ol-showSupport')
  const showDocumentation = getMeta('ol-wikiEnabled')
  const { t } = useTranslation()
  const { setActiveModal } = useRailContext()
  const guide = useGuideInfo() // SumiTeX
  const openKeyboardShortcutsModal = useCallback(() => {
    setActiveModal('keyboard-shortcuts')
  }, [setActiveModal])
  const openContactUsModal = useCallback(() => {
    setActiveModal('contact-us')
  }, [setActiveModal])

  return (
    <OLDropdownMenu>
      <OLDropdownItem onClick={openKeyboardShortcutsModal}>
        {t('keyboard_shortcuts')}
      </OLDropdownItem>
      {/* SumiTeX: the snippet library, next to the keys */}
      <OLDropdownItem
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent(OPEN_SNIPPET_LIBRARY_EVENT, { detail: 'browse' })
          )
        }
      >
        Snippets &amp; shortcuts
      </OLDropdownItem>
      {/* SumiTeX: the guide, when this server has one */}
      {guide.enabled && guide.guideProjectId && (
        <OLDropdownItem onClick={openGuide}>SumiTeX guide</OLDropdownItem>
      )}
      {showDocumentation && (
        <OLDropdownItem
          href="/learn"
          role="menuitem"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('documentation')}
        </OLDropdownItem>
      )}
      {showSupport && (
        <>
          <OLDropdownDivider />
          <OLDropdownItem onClick={openContactUsModal}>
            {t('contact_us')}
          </OLDropdownItem>
        </>
      )}
    </OLDropdownMenu>
  )
}
