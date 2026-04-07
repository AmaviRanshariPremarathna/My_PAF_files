export function NotificationsPage({ notifications, readNotifications, onMarkRead, onMarkAll }) {
  return (
    <section className="page">
      <div className="page-actions">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h2>Operational notifications</h2>
        </div>
        <button type="button" className="button button--ghost" onClick={onMarkAll}>Mark all read</button>
      </div>

      <div className="stack">
        {notifications.map((notification) => {
          const unread = !readNotifications.includes(notification.id)
          return (
            <div key={notification.id} className={`card notification ${unread ? 'notification--unread' : ''}`}>
              <div>
                <p className="eyebrow">{notification.category}</p>
                <h3>{notification.title}</h3>
                <p>{notification.text}</p>
              </div>
              {unread ? <button type="button" className="button button--ghost" onClick={() => onMarkRead(notification.id)}>Mark read</button> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
