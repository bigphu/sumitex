import { sendSearchEvent } from '@/features/event-tracking/search-events'
import { useProjectContext } from '@/shared/context/project-context'
import useEventListener from '@/shared/hooks/use-event-listener'
import usePersistedState from '@/shared/hooks/use-persisted-state'
import { isMac } from '@/shared/utils/os'
import {
  createContext,
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ImperativePanelHandle } from 'react-resizable-panels'

export type RailTabKey =
  | 'file-tree'
  | 'integrations'
  | 'review-panel'
  | 'chat'
  | 'full-project-search'
  | 'dimensions'
  | 'workbench'
  // SumiTeX
  | 'sumitex-outline'
  | 'sumitex-history'

export type RailModalKey =
  | 'keyboard-shortcuts'
  | 'contact-us'
  | 'dictionary'
  | 'labs'

export function dispatchOpenRailModal(key: RailModalKey) {
  window.dispatchEvent(new CustomEvent('ui:open-rail-modal', { detail: key }))
}

const RailContext = createContext<
  | {
      selectedTab: RailTabKey
      isOpen: boolean
      setIsOpen: Dispatch<SetStateAction<boolean>>
      panelRef: React.RefObject<ImperativePanelHandle>
      togglePane: () => void
      handlePaneExpand: () => void
      handlePaneCollapse: () => void
      resizing: boolean
      setResizing: Dispatch<SetStateAction<boolean>>
      activeModal: RailModalKey | null
      setActiveModal: Dispatch<SetStateAction<RailModalKey | null>>
      openTab: (tab: RailTabKey) => void
      selectTab: (tab: RailTabKey) => void
      // SumiTeX: Review opens in the right island with its own state;
      // reviewInlineOpen shows the stock inline panel while a new comment
      // is being written
      reviewPanelOpen: boolean
      setReviewPanelOpen: Dispatch<SetStateAction<boolean>>
      reviewInlineOpen: boolean
      setReviewInlineOpen: Dispatch<SetStateAction<boolean>>
    }
  | undefined
>(undefined)

export const RailProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { projectId } = useProjectContext()
  const [isOpen, setIsOpen] = usePersistedState(
    `rail-is-open-${projectId}`,
    true
  )
  const [resizing, setResizing] = useState(false)
  const [activeModal, setActiveModalInternal] = useState<RailModalKey | null>(
    null
  )
  const setActiveModal: Dispatch<SetStateAction<RailModalKey | null>> =
    useCallback(modalKey => {
      setActiveModalInternal(modalKey)
    }, [])

  const panelRef = useRef<ImperativePanelHandle>(null)

  const togglePane = useCallback(() => {
    setIsOpen(value => !value)
  }, [setIsOpen])

  const handlePaneExpand = useCallback(() => {
    setIsOpen(true)
  }, [setIsOpen])

  const handlePaneCollapse = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const [selectedTab, setSelectedTab] = usePersistedState<RailTabKey>(
    `selected-rail-tab-${projectId}`,
    'file-tree'
  )

  // Keep the panel collapse/expanded state in sync with isOpen and selectedTab
  useLayoutEffect(() => {
    const panelHandle = panelRef.current

    if (panelHandle) {
      if (isOpen) {
        panelHandle.expand()
      } else {
        panelHandle.collapse()
      }
    }
  }, [isOpen, selectedTab])

  // SumiTeX: Review no longer takes over the left side panel. It has its own
  // open state and its column sits on the editor's right; every way of
  // opening the 'review-panel' tab opens it there instead.
  const [reviewPanelOpen, setReviewPanelOpen] = usePersistedState<boolean>(
    `sumitex-review-open-${projectId}`,
    false
  )

  const [reviewInlineOpen, setReviewInlineOpen] = useState(false)

  // A left panel saved as 'review-panel' before this change: show Files there
  // and open Review on the right
  useEffect(() => {
    if (selectedTab === 'review-panel') {
      setSelectedTab('file-tree')
      setReviewPanelOpen(true)
    }
  }, [selectedTab, setSelectedTab, setReviewPanelOpen])

  const selectTab = useCallback(
    (tab: RailTabKey) => {
      if (tab === 'review-panel') {
        setReviewPanelOpen(true) // SumiTeX
        return
      }
      setSelectedTab(tab)
    },
    [setSelectedTab, setReviewPanelOpen]
  )

  const openTab = useCallback(
    (tab: RailTabKey) => {
      if (tab === 'review-panel') {
        setReviewPanelOpen(true) // SumiTeX
        return
      }
      setSelectedTab(tab)
      setIsOpen(true)
    },
    [setIsOpen, setSelectedTab, setReviewPanelOpen]
  )

  useEventListener(
    'ui.toggle-review-panel',
    useCallback(() => {
      setReviewPanelOpen(open => !open) // SumiTeX
    }, [setReviewPanelOpen])
  )

  useEventListener(
    'ui:open-rail-modal',
    useCallback(
      (event: Event) => {
        setActiveModal((event as CustomEvent<RailModalKey>).detail)
      },
      [setActiveModal]
    )
  )

  useEventListener(
    'keydown',
    useCallback(
      (event: KeyboardEvent) => {
        if (
          (isMac ? event.metaKey : event.ctrlKey) &&
          event.shiftKey &&
          event.key.toLowerCase() === 'f'
        ) {
          event.preventDefault()
          sendSearchEvent('search-open', {
            searchType: 'full-project',
            method: 'keyboard',
          })
          openTab('full-project-search')
        }
      },
      [openTab]
    )
  )

  const value = useMemo(
    () => ({
      selectedTab,
      isOpen,
      setIsOpen,
      panelRef,
      togglePane,
      handlePaneExpand,
      handlePaneCollapse,
      resizing,
      setResizing,
      activeModal,
      setActiveModal,
      openTab,
      selectTab,
      reviewPanelOpen,
      setReviewPanelOpen,
      reviewInlineOpen,
      setReviewInlineOpen,
    }),
    [
      selectedTab,
      isOpen,
      setIsOpen,
      panelRef,
      togglePane,
      handlePaneExpand,
      handlePaneCollapse,
      resizing,
      setResizing,
      activeModal,
      setActiveModal,
      openTab,
      selectTab,
      reviewPanelOpen,
      setReviewPanelOpen,
      reviewInlineOpen,
      setReviewInlineOpen,
    ]
  )

  return <RailContext.Provider value={value}>{children}</RailContext.Provider>
}

export const useRailContext = () => {
  const context = useContext(RailContext)
  if (!context) {
    throw new Error('useRailContext is only available inside RailProvider')
  }
  return context
}
