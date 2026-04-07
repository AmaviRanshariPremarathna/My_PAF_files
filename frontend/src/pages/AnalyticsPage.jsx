import { TypeBadge } from '../smartCampusShared'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TYPES = ['LECTURE_HALL', 'MEETING_ROOM', 'ROOM', 'LAB', 'EQUIPMENT']

export function AnalyticsPage({ assets }) {
  const totals = MONTHS.map((month, index) => ({
    month,
    value: assets.reduce((sum, asset) => sum + (asset.monthlyBookings[index] || 0), 0),
  }))
  const maxMonthly = Math.max(...totals.map((entry) => entry.value), 1)

  return (
    <section className="page">
      <div className="split-grid">
        <div className="card panel">
          <div className="panel__header">
            <h3>Monthly usage trend</h3>
            <span>12-month view</span>
          </div>
          <div className="chart">
            {totals.map((entry) => (
              <div key={entry.month} className="chart__column">
                <div className="chart__bar" style={{ height: `${(entry.value / maxMonthly) * 100}%` }} />
                <span>{entry.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="panel__header">
            <h3>Inventory mix</h3>
            <span>By resource type</span>
          </div>
          <div className="stack">
            {TYPES.map((type) => {
              const count = assets.filter((asset) => asset.resourceType === type).length
              return (
                <div key={type} className="mix-row">
                  <TypeBadge type={type} />
                  <div className="mix-row__fill"><div style={{ width: `${assets.length ? (count / assets.length) * 100 : 0}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
