export function IssuesPage({ issueRows, onResolve }) {
  return (
    <section className="page">
      <div className="card panel">
        <div className="panel__header">
          <h3>Issue triage board</h3>
          <span>{issueRows.length} total</span>
        </div>
        <div className="stack">
          {issueRows.length === 0 ? <p className="muted">No issues recorded yet.</p> : null}
          {issueRows.map((issue) => (
            <div key={issue.id} className="issue-row">
              <div className="issue-row__main">
                <div className="tag-row">
                  <span className={`pill ${issue.status === 'RESOLVED' ? 'pill--green' : 'pill--amber'}`}>{issue.status}</span>
                  <span className="tag">{issue.severity}</span>
                  <span className="tag">{issue.assetCode}</span>
                </div>
                <h3>{issue.assetName}</h3>
                <p>{issue.text}</p>
                <span className="muted">{issue.locationText} · {issue.date}</span>
              </div>
              {issue.status !== 'RESOLVED' ? <button type="button" className="button button--ghost" onClick={() => onResolve(issue)}>Resolve</button> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
