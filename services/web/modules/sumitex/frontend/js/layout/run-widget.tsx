/**
 * The run widget in the title bar (guide 1d, step 3), after JetBrains:
 * the profile name opens the compile menu, ▶ recompiles, and the result of
 * the last compile shows as a dot on the button (ochre for warnings, red
 * for errors). While compiling, the button shows a spinner and stops the
 * compile when clicked.
 *
 * It uses the same compile context as the stock Recompile button. The stock
 * button stays mounted (hidden in the PDF pill) because it registers the
 * compile commands for the palette and the shortcuts.
 */
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

const modifierKey = /Mac/i.test(navigator.platform) ? 'Cmd' : 'Ctrl'

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

  const errors = logEntries?.errors?.length ?? 0
  const warnings = logEntries?.warnings?.length ?? 0
  const status = errors > 0 ? 'error' : warnings > 0 ? 'warning' : null

  const check = (on: boolean) => (on ? 'check' : null)

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
          {/* Profile names from the mockup: a normal compile is a full build */}
          {draft ? 'Draft' : 'Full build'}
        </OLDropdownToggle>
        <OLDropdownMenu>
          <OLDropdownHeader>{t('compile_mode')}</OLDropdownHeader>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setDraft(false)} trailingIcon={check(!draft)}>
              {t('normal')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setDraft(true)} trailingIcon={check(draft)}>
              {t('fast')}&nbsp;<span className="subdued">[draft]</span>
            </OLDropdownItem>
          </li>
          <OLDropdownDivider />
          <OLDropdownHeader>{t('auto_compile')}</OLDropdownHeader>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setAutoCompile(true)} trailingIcon={check(autoCompile)}>
              {t('on')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setAutoCompile(false)} trailingIcon={check(!autoCompile)}>
              {t('off')}
            </OLDropdownItem>
          </li>
          <OLDropdownDivider />
          <OLDropdownHeader>{t('syntax_checks')}</OLDropdownHeader>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setStopOnValidationError(true)} trailingIcon={check(stopOnValidationError)}>
              {t('stop_on_validation_error')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem as="button" onClick={() => setStopOnValidationError(false)} trailingIcon={check(!stopOnValidationError)}>
              {t('ignore_validation_errors')}
            </OLDropdownItem>
          </li>
          <OLDropdownDivider />
          <OLDropdownHeader>{t('compile_error_handling')}</OLDropdownHeader>
          <li role="none">
            <OLDropdownItem as="button" onClick={enableStopOnFirstError} trailingIcon={check(stopOnFirstError)}>
              {t('stop_on_first_error')}
            </OLDropdownItem>
          </li>
          <li role="none">
            <OLDropdownItem as="button" onClick={disableStopOnFirstError} trailingIcon={check(!stopOnFirstError)}>
              {t('try_to_compile_despite_errors')}
            </OLDropdownItem>
          </li>
          <OLDropdownDivider />
          <li role="none">
            <OLDropdownItem as="button" onClick={() => recompileFromScratch()} disabled={compiling || isNetworkStalled}>
              {t('recompile_from_scratch')}
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
