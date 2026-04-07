import { TypeBadge } from '../smartCampusShared'

export function DashboardPage({ assets, overdueAssets, notifications }) {
  const availableNow = assets.filter((asset) => asset.status === 'ACTIVE' && !asset.borrowed).length
  const borrowed = assets.filter((asset) => asset.borrowed).length
  const openIssues = assets.reduce((sum, asset) => sum + asset.issues.filter((issue) => issue.status !== 'RESOLVED').length, 0)
  const topAssets = [...assets].sort((left, right) => right.totalBookings - left.totalBookings).slice(0, 4)

  return (
    <section className="page">
      <div className="hero-panel card">
        <div>
          <p className="eyebrow">Operational overview</p>
          <h2>Real-time asset command center</h2>
          <p className="hero-panel__text">Live status, maintenance risk, issue load, and utilization metrics now come from the main backend.</p>
        </div>
        <div className="hero-panel__orbit" />
      </div>

      <div className="stats-grid">
        <StatCard label="Tracked assets" value={assets.length} accent="blue" />
        <StatCard label="Available now" value={availableNow} accent="green" />
        <StatCard label="Borrowed" value={borrowed} accent="amber" />
        <StatCard label="Open issues" value={openIssues} accent="rose" />
      </div>

      <div className="split-grid">
        <div className="card panel">
          <div className="panel__header">
            <h3>Attention queue</h3>
            <span>{overdueAssets.length + openIssues}</span>
          </div>
          <div className="stack">
            {overdueAssets.slice(0, 4).map((asset) => (
              <AlertRow key={asset.id} title={`${asset.name} is overdue for service`} text={`Next service was ${asset.nextServiceDate || 'not scheduled'}.`} />
            ))}
            {notifications.slice(0, 3).map((notification) => (
              <AlertRow key={notification.id} title={notification.title} text={notification.text} />
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="panel__header">
            <h3>Top performers</h3>
            <span>By bookings</span>
          </div>
          <div className="stack">
            {topAssets.map((asset) => (
              <div key={asset.id} className="rank-row">
                <TypeBadge type={asset.resourceType} />
                <div className="rank-row__meta">
                  <p>{asset.name}</p>
                  <span>{asset.totalBookings} bookings</span>
                </div>
                <strong>{asset.rating.toFixed(1)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`card stat stat--${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function AlertRow({ title, text }) {
  return (
    <div className="alert-row">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}
