export function MaintenancePage({ overdueAssets, upcomingAssets, healthyAssets, onServiced }) {
  return (
    <section className="page">
      <div className="stats-grid">
        <StatCard label="Overdue" value={overdueAssets.length} accent="rose" />
        <StatCard label="Due in 30 days" value={upcomingAssets.length} accent="amber" />
        <StatCard label="Healthy" value={healthyAssets.length} accent="green" />
        <StatCard label="Tracked schedules" value={overdueAssets.length + upcomingAssets.length + healthyAssets.length} accent="blue" />
      </div>

      <div className="card panel">
        <div className="panel__header">
          <h3>Maintenance schedule</h3>
          <span>Service actions</span>
        </div>
        <div className="stack">
          {[...overdueAssets, ...upcomingAssets].map((asset) => (
            <div key={asset.id} className="maintenance-row">
              <div>
                <h3>{asset.name}</h3>
                <p>{asset.locationText}</p>
                <span className="muted">Last service {asset.lastServiceDate || 'unknown'} · Next service {asset.nextServiceDate || 'unscheduled'}</span>
              </div>
              <button type="button" className="button button--ghost" onClick={() => onServiced(asset)}>Mark serviced</button>
            </div>
          ))}
          {overdueAssets.length === 0 && upcomingAssets.length === 0 ? <p className="muted">Everything is comfortably within its service window.</p> : null}
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
