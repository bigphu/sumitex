import {
  createContext,
  useContext,
  useMemo,
  Dispatch,
  SetStateAction,
  FC,
  useState,
} from 'react'
import { UserSettings } from '../../../../types/user-settings'
import getMeta from '@/utils/meta'

export const defaultSettings: UserSettings = {
  pdfViewer: 'pdfjs',
  autoComplete: true,
  autoPairDelimiters: true,
  syntaxValidation: false,
  previewTabs: false,
  editorTheme: 'textmate',
  editorDarkTheme: 'sumitex_dark', // SumiTeX
  editorLightTheme: 'sumitex_light', // SumiTeX
  overallTheme: '',
  mode: 'default',
  fontSize: 12,
  fontFamily: 'jetbrainsmono', // SumiTeX
  lineHeight: 'normal',
  mathPreview: true,
  editorTabs: true,
  referencesSearchMode: 'advanced',
  breadcrumbs: false,
  nonBlinkingCursor: false,
  darkModePdf: false,
  floatingMenu: true,
  zotero: {
    enabled: true,
    groups: [],
    disablePersonalLibrary: false,
  },
  mendeley: {
    enabled: true,
    groups: [],
    disablePersonalLibrary: false,
  },
  papers: {
    enabled: true,
    groups: [],
    disablePersonalLibrary: false,
  },
}

type UserSettingsContextValue = {
  userSettings: UserSettings
  setUserSettings: Dispatch<
    SetStateAction<UserSettingsContextValue['userSettings']>
  >
}

export const UserSettingsContext = createContext<
  UserSettingsContextValue | undefined
>(undefined)

export const UserSettingsProvider: FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [userSettings, setUserSettings] = useState<UserSettings>(
    () => getMeta('ol-userSettings') || defaultSettings
  )

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      userSettings,
      setUserSettings,
    }),
    [userSettings, setUserSettings]
  )

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettingsContext() {
  const context = useContext(UserSettingsContext)
  if (!context) {
    throw new Error(
      'useUserSettingsContext is only available inside UserSettingsProvider'
    )
  }
  return context
}
