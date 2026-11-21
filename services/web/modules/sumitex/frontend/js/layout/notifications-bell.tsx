/**
 * Notifications, in the title bar with Review and Chat (right-strip.tsx;
 * at the foot of the right strip when the stock toolbar is in use). Until
 * now these only showed on the Projects page: project invitations, Dropbox
 * and file-limit notices, and the like (GET /notifications).
 *
 * The bell shows how many are waiting. It opens a small list beside the
 * strip: an invitation can be joined from there, any other notice shows its
 * text with a link to the Projects page, and each can be dismissed
 * (DELETE /notifications/:id, as on the Projects page). The list refreshes
 * every few minutes and whenever the window comes back into focus.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { deleteJSON, getJSON, postJSON } from '@/infrastructure/fetch-json'
import { debugConsole } from '@/utils/debugging'
import type {
  Notification,
  NotificationProjectInvite,
} from '@ol-types/project/dashboard/notification'

const REFRESH_MS = 5 * 60 * 1000

// The server sends each notice "translated" as HTML, but most templates have
// no server string (the Projects page draws them itself), so the HTML is
// often just the template's name. Say what each one is about instead.
const plainText = (html?: string) =>
  new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ??
  ''

function describe(notification: Notification): string {
  const opts = ((notification as { messageOpts?: Record<string, unknown> })
    .messageOpts ?? {}) as Record<string, string | undefined>
  switch (notification.templateKey) {
    case 'notification_tpds_file_limit':
      return `“${opts.projectName}” has too many files to sync with Dropbox.`
    case 'notification_dropbox_duplicate_project_names':
      return `You have more than one project called “${opts.projectName}”, so Dropbox can't sync it.`
    case 'notification_dropbox_unlinked_due_to_lapsed_reconfirmation':
      return 'Dropbox was unlinked from your account because your institutional email needs reconfirming.'
    case 'notification_ip_matched_affiliation':
      return `It looks like you're at ${opts.university_name}. You can link your account to it.`
    case 'notification_group_invitation':
      return "You've been invited to join a group subscription."
  }
  const text = plainText(notification.html).trim()
  return text && text !== notification.templateKey
    ? text
    : 'A notice is waiting on your Projects page.'
}

const isInvite = (n: Notification): n is NotificationProjectInvite =>
  n.templateKey === 'notification_project_invite'

function Invite({ notification }: { notification: NotificationProjectInvite }) {
  const { t } = useTranslation()
  const { projectId, projectName, userName, token } = notification.messageOpts
  const [state, setState] = useState<'idle' | 'joining' | 'joined' | 'failed'>(
    'idle'
  )

  const join = () => {
    setState('joining')
    postJSON(`/project/${projectId}/invite/token/${token}/accept`)
      .then(() => setState('joined'))
      .catch(error => {
        // 404: already accepted somewhere else
        if (error?.response?.status === 404) setState('joined')
        else {
          debugConsole.error(error)
          setState('failed')
        }
      })
  }

  return (
    <>
      <p className="sx-notice-text">
        {state === 'joined' ? (
          <Trans
            i18nKey="notification_project_invite_accepted_message"
            components={{ b: <b /> }}
            values={{ projectName }}
            shouldUnescape
            tOptions={{ interpolation: { escapeValue: true } }}
          />
        ) : (
          <Trans
            i18nKey="notification_project_invite_message"
            components={{ b: <b /> }}
            values={{ userName, projectName }}
            shouldUnescape
            tOptions={{ interpolation: { escapeValue: true } }}
          />
        )}
      </p>
      <div className="sx-notice-actions">
        {state === 'joined' ? (
          <a className="sx-notice-action" href={`/project/${projectId}`}>
            {t('open_project')}
          </a>
        ) : (
          <button
            type="button"
            className="sx-notice-action"
            disabled={state === 'joining'}
            onClick={join}
          >
            {state === 'joining' ? `${t('join_project')}…` : t('join_project')}
          </button>
        )}
        {state === 'failed' && (
          <span className="sx-notice-error">Couldn't join. Try again.</span>
        )}
      </div>
    </>
  )
}

export default function NotificationsBell({
  placement = 'left',
}: {
  placement?: 'left' | 'bottom'
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => {
    getJSON<Notification[]>('/notifications')
      .then(list => setNotifications(Array.isArray(list) ? list : []))
      .catch(debugConsole.error)
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  // Close on Esc or a click outside, like a menu
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const dismiss = (id: Notification['_id']) => {
    setNotifications(list => list.filter(n => n._id !== id))
    if (id !== undefined) {
      deleteJSON(`/notifications/${id}`).catch(debugConsole.error)
    }
  }

  const count = notifications.length
  const label = count > 0 ? `Notifications (${count})` : 'Notifications'

  return (
    <div className="sx-notifications" ref={ref}>
      <OLTooltip
        id="sx-notifications-tooltip"
        description={label}
        overlayProps={{ delay: 0, placement }}
        hidden={open}
      >
        <button
          type="button"
          className={classNames('sx-right-strip-button', {
            'sx-right-strip-button-active': open,
          })}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(value => !value)}
        >
          <MaterialIcon type="notifications" />
          {count > 0 && (
            <span className="sx-notifications-badge" aria-hidden="true">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </OLTooltip>
      {open && (
        <div className="sx-notifications-list" role="dialog" aria-label="Notifications">
          <div className="sx-notifications-head">Notifications</div>
          {count === 0 ? (
            <p className="sx-notifications-empty">You're all caught up.</p>
          ) : (
            <ul>
              {notifications.map((notification, index) => (
                <li key={notification._id ?? index} className="sx-notice">
                  <div className="sx-notice-body">
                    {isInvite(notification) ? (
                      <Invite notification={notification} />
                    ) : (
                      <>
                        <p className="sx-notice-text">
                          {describe(notification)}
                        </p>
                        <div className="sx-notice-actions">
                          <a className="sx-notice-action" href="/project">
                            Open the Projects page
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="sx-notice-dismiss"
                    aria-label="Dismiss"
                    onClick={() => dismiss(notification._id)}
                  >
                    <MaterialIcon type="close" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
