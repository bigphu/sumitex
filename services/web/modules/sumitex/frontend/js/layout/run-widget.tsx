/**
 * The run widget in the title bar (guide 1d, step 3; mockup frame 6), after
 * JetBrains: the profile name opens the compile menu, ▶ recompiles, and the
 * result of the last compile shows as a dot on the button (ochre for
 * warnings, red for errors). While compiling, ▶ shows a spinner and stops
 * the compile when clicked.
 *
 * The menu follows the mockup: Profile (Full build, Draft, Current chapter
 * only), the compile actions, three switches, the project's compile
 * settings, and "Edit compile settings…".
 *
 * It uses the same compile context as the stock Recompile button. The stock
 * button stays mounted (hidden in the PDF pill) because it registers the
 * compile commands for the palette and the shortcuts.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import {
  OLDropdown,
  OLDropdownDivider,
  OLDropdownHeader,
  OLDropdownItem,
  OLDropdownMenu,
  OLDropdownToggle,
} from '@/shared/components/ol/ol-dropdown-menu'
import { useDetachCompileContext as useCompileContext } from '@/shared/context/detach-compile-context'
import { useStopOnFirstError } from '@/shared/hooks/use-stop-on-first-error'
import { useProjectContext } from '@/shared/context/project-context'
import { useProjectSettingsContext } from '@/features/ide-settings/context/project-settings-context'
import { useFileTreeOpenContext } from '@/features/ide-react/context/file-tree-open-context'
import { useFileTreePathContext } from '@/features/file-tree/contexts/file-tree-path'
import { useCommandRegistry } from '@/features/ide-react/context/command-registry-context'
import { useCommandProvider } from '@/features/ide-react/hooks/use-command-provider'
import getMeta from '@/utils/meta'
import {
  CompileProfile,
  getCurrentChapter,
  getProfile,
  loadProfile,
  setCurrentChapter,
  setProfile,
  subscribeProfile,
} from '../compile/profile'

const modifierKey = /Mac/i.test(navigator.platform) ? 'Cmd' : 'Ctrl'

const COMPILER_LABELS: Record<string, string> = {
  pdflatex: 'pdfLaTeX',
  latex: 'LaTeX',
  xelatex: 'XeLaTeX',
  lualatex: 'LuaLaTeX',
}

const compilerLabel = (compiler?: string) =>
  compiler ? (COMPILER_LABELS[compiler] ?? compiler) : ''

const PROFILE_LABELS: Record<CompileProfile, string> = {
  full: 'Full build',
  draft: 'Draft',
  chapter: 'Current chapter',
}

// A switch drawn inside a menu item, as in the mockup
function MenuSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={classNames('sx-menu-switch', { 'sx-menu-switch-on': on })}
      aria-hidden="true"
    >
      <span className="sx-menu-switch-knob" />
    </span>
  )
}

export default function RunWidget() {
  const { t } = useTranslation()
  const {
    autoCompile,
    compiling,
    draft,
    hasChanges,
    isNetworkStalled,
    logEntries,
    recompileFromScratch,
    setAutoCompile,
    setDraft,
    setStopOnValidationError,
    startCompile,
    stopCompile,
    stopOnFirstError,
    stopOnValidationError,
  } = useCompileContext()
  const { enableStopOnFirstError, disableStopOnFirstError } =
    useStopOnFirstError({ eventSource: 'dropdown' })
  const { projectId } = useProjectContext()
  const { compiler, imageName, rootDocId } = useProjectSettingsContext()
  const { openEntity } = useFileTreeOpenContext()
  const { pathInFolder } = useFileTreePathContext()
  const { registry } = useCommandRegistry()

  const profile = useSyncExternalStore(subscribeProfile, getProfile)
  const chapter = useSyncExternalStore(subscribeProfile, getCurrentChapter)

  // Load this project's profile, and keep it in step with the stock draft
  // option (which can also change elsewhere)
  useEffect(() => {
    loadProfile(projectId)
  }, [projectId])
  useEffect(() => {
    if (draft && getProfile() !== 'draft') setProfile('draft')
    if (!draft && getProfile() === 'draft') setProfile('full')
  }, [draft])

  // "Current chapter" is the open file, unless it's the main file
  const openDocId = openEntity?.type === 'doc' ? openEntity.entity._id : null
  useEffect(() => {
    if (!openDocId || openDocId === rootDocId) {
      setCurrentChapter(null)
    } else {
      const path = pathInFolder(openDocId)
      setCurrentChapter(path && path.endsWith('.tex') ? path : null)
    }
  }, [openDocId, rootDocId, pathInFolder])

  const pickProfile = (next: CompileProfile) => {
    setProfile(next)
    setDraft(next === 'draft')
  }

  // The profiles in the palette too (guide Phase 2c)
  useCommandProvider(
    () => [
      {
        id: 'sumitex-profile-full',
        label: 'Compile profile: Full build',
        handler: () => pickProfile('full'),
      },
      {
        id: 'sumitex-profile-draft',
        label: 'Compile profile: Draft (no images, faster)',
        handler: () => pickProfile('draft'),
      },
      {
        id: 'sumitex-profile-chapter',
        label: 'Compile profile: Current chapter only',
        handler: () => pickProfile('chapter'),
        disabled: !chapter,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, setDraft]
  )

  const errors = logEntries?.errors?.length ?? 0
  const warnings = logEntries?.warnings?.length ?? 0
  const status = errors > 0 ? 'error' : warnings > 0 ? 'warning' : null

  const imageDesc =
    (getMeta('ol-imageNames') || []).find(
      (image: { imageName: string; imageDesc: string }) =>
        image.imageName === imageName
    )?.imageDesc ?? imageName
  const mainDocument = rootDocId ? pathInFolder(rootDocId) : null
  const openSettings = () =>
    registry.get('open-settings')?.handler?.({ location: 'run-widget' })

  const chapterName = chapter?.split('/').pop()
  const profileLabel =
    profile === 'chapter' && !chapter ? 'Full build' : PROFILE_LABELS[profile]

  return (
    <div
      className={classNames('sx-run', { 'sx-run-changed': hasChanges })}
      role="group"
      aria-label="Compile"
    >
      <OLDropdown className="sx-run-profile-dropdown">
        <OLDropdownToggle
          id="sx-run-profile"
          variant="link"
          className="sx-run-profile"
          aria-label={t('toggle_compile_options_menu')}
        >
          {profileLabel}
        </OLDropdownToggle>
        <OLDropdownMenu className="sx-run-menu">
          <OLDropdownHeader>Profile</OLDropdownHeader>
          {(
            [
              ['full', 'Full build', compilerLabel(compiler)],
              ['draft', 'Draft', 'no images, faster'],
              [
                'chapter',
                'Current chapter only',
                chapterName ? `\\includeonly · ${chapterName}` : 'open a chapter file',
              ],
            ] as [CompileProfile, string, string][]
          ).map(([id, label, sub]) => (
            <li role="none" key={id}>
              <OLDropdownItem
                as="button"
                role="menuitemradio"
                aria-checked={profile === id}
                onClick={() => pickProfile(id)}
                leadingIcon={profile === id ? 'check' : <span className="sx-menu-icon-space" />}
                description={sub}
              >
                {label}
              </OLDropdownItem>
            </li>
          ))}
          <OLDropdownDivider />
          <li role="none">
            <OLDropdownItem
              as="button"
              onClick={() => startCompile()}
              disabled={compiling || isNetworkStalled}
              trailingIcon={<kbd className="sx-menu-kbd">{modifierKey}+Enter</kbd>}
            >
              {t('recompile')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem
              as="button"
              onClick={() => recompileFromScratch()}
              disabled={compiling || isNetworkStalled}
            >
              {t('recompile_from_scratch')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem
              as="button"
              onClick={() => stopCompile()}
              disabled={!compiling}
            >
              {t('stop_compile')}
            </OLDropdownItem>
          </li>
          <OLDropdownDivider />
          {(
            [
              ['Auto-compile when idle', autoCompile, () => setAutoCompile(!autoCompile)],
              [
                'Stop on first error',
                stopOnFirstError,
                () => (stopOnFirstError ? disableStopOnFirstError() : enableStopOnFirstError()),
              ],
              [
                'Check syntax first',
                stopOnValidationError,
                () => setStopOnValidationError(!stopOnValidationError),
              ],
            ] as [string, boolean, () => void][]
          ).map(([label, on, toggle]) => (
            <li role="none" key={label}>
              <OLDropdownItem
                as="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={toggle}
                trailingIcon={<MenuSwitch on={on} />}
              >
                {label}
              </OLDropdownItem>
            </li>
          ))}
          <OLDropdownDivider />
          {(
            [
              ['Compiler', compilerLabel(compiler)],
              ['TeX Live', imageDesc],
              ['Main document', mainDocument],
            ] as [string, string | null | undefined][]
          )
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <li role="none" key={label}>
                <OLDropdownItem
                  as="button"
                  onClick={openSettings}
                  trailingIcon={<span className="sx-menu-value">{value}</span>}
                >
                  {label}
                </OLDropdownItem>
              </li>
            ))}
          <OLDropdownDivider />
          <li role="none">
            <OLDropdownItem as="button" onClick={openSettings}>
              Edit compile settings…
            </OLDropdownItem>
          </li>
        </OLDropdownMenu>
      </OLDropdown>

      <OLTooltip
        id="sx-run-tooltip"
        description={
          compiling ? t('stop_compile') : `${t('recompile_pdf')} (${modifierKey} + Enter)`
        }
        overlayProps={{ delay: { show: 300, hide: 0 }, placement: 'bottom' }}
      >
        <button
          type="button"
          className={classNames('sx-run-play', status && `sx-run-${status}`)}
          onClick={() => (compiling ? stopCompile() : startCompile())}
          disabled={isNetworkStalled}
          aria-label={compiling ? t('stop_compile') : t('recompile')}
        >
          {compiling ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <MaterialIcon type="play_arrow" />
          )}
          {status && !compiling && <span className="sx-run-dot" aria-hidden="true" />}
        </button>
      </OLTooltip>
    </div>
  )
}
