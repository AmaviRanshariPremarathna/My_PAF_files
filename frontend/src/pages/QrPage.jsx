import { useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import QRScanner from '../QRScanner'

const STATUS_META = {
  ACTIVE: 'Available',
  OUT_OF_SERVICE: 'Out of service',
  UNDER_MAINTENANCE: 'Maintenance',
  INACTIVE: 'Inactive',
}

const CONDITION_META = {
  GOOD: 'Good',
  REPAIR_NEEDED: 'Repair Needed',
}

function Field({ label, full = false, children }) {
  return (
    <label className={`field ${full ? 'field--full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function QrPage({ assets, issueDraft, setIssueDraft, onReportIssue, onToast }) {
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const selected = assets.find((asset) => asset.id === issueDraft.assetId) || assets[0] || null

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assets.filter((asset) => {
      if (!query) return true

      return [asset.resourceCode, asset.name, asset.category, asset.locationText, asset.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [assets, search])

  const qrPayload = useMemo(() => {
    if (!selected) return ''
    const assetUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
    assetUrl.searchParams.set('asset', String(selected.id))
    return assetUrl.toString()
  }, [selected])

  useEffect(() => {
    if (!issueDraft.assetId && assets[0]) {
      setIssueDraft((current) => ({ ...current, assetId: assets[0].id }))
    }
  }, [assets, issueDraft.assetId, setIssueDraft])

  function downloadQr() {
    const svg = document.querySelector('#asset-qr-svg svg')
    if (!svg || !selected) return

    const serializer = new XMLSerializer()
    const svgData = serializer.serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${selected.resourceCode || selected.id}-qr.svg`
    a.click()

    URL.revokeObjectURL(url)
    onToast?.('QR downloaded successfully.')
  }

  function handleScan(data) {
    setScanResult(data)
    setShowScanner(false)
    onToast?.('QR scanned successfully.')

    try {
      const parsed = new URL(data)
      const scannedId = parsed.searchParams.get('asset')
      if (!scannedId) return

      const match = assets.find((asset) => String(asset.id) === scannedId)
      if (match) {
        setIssueDraft((current) => ({ ...current, assetId: match.id }))
      }
    } catch {
      // Ignore non-URL scans.
    }
  }

  return (
    <section className="page">
      <div className="qr-workspace">
        <aside className="card panel qr-sidebar">
          <div className="panel__header">
            <h3>Tracked assets</h3>
            <span>{filteredAssets.length} shown</span>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, name, location"
          />
          <div className="qr-sidebar__list">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={`qr-sidebar__item ${selected?.id === asset.id ? 'qr-sidebar__item--active' : ''}`}
                onClick={() => setIssueDraft((current) => ({ ...current, assetId: asset.id }))}
              >
                <strong>{asset.resourceCode || asset.id}</strong>
                <span>{asset.name}</span>
                <small>{asset.locationText || asset.location || 'Location pending'}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="qr-content">
          <div className="card panel qr-hero">
            <div className="panel__header">
              <div>
                <p className="eyebrow">QR tracking</p>
                <h2>{selected?.name || 'Asset QR surface'}</h2>
              </div>
              {selected ? <span>{selected.resourceCode || selected.id}</span> : null}
            </div>

            {selected ? (
              <div className="qr-hero__layout">
                <div className="qr-hero__code">
                  <div className="qr-canvas">
                    <QRCode
                      id="asset-qr-svg"
                      value={qrPayload}
                      size={260}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                  <div className="qr-hero__actions">
                    <button type="button" className="button" onClick={downloadQr}>
                      Download QR
                    </button>
                    <button type="button" className="button button--ghost" onClick={() => setShowScanner(true)}>
                      Scan QR
                    </button>
                  </div>
                </div>

                <div className="qr-hero__details">
                  <p className="muted">{selected.description || 'No description provided yet.'}</p>
                  <div className="details__facts qr-details-grid">
                    <Fact label="Type" value={selected.resourceType || selected.type} />
                    <Fact label="Category" value={selected.category} />
                    <Fact label="Capacity" value={selected.capacity} />
                    <Fact label="Bookings" value={selected.totalBookings} />
                    <Fact label="Status" value={STATUS_META[selected.status] || selected.status} />
                    <Fact label="Condition" value={CONDITION_META[selected.condition] || selected.condition} />
                  </div>
                  <div className="tag-row">
                    <span className="tag">{selected.locationText || selected.location || 'Unknown location'}</span>
                    <span className="tag">{selected.availableFrom || selected.availFrom || 'N/A'} - {selected.availableTo || selected.availTo || 'N/A'}</span>
                    <span className="tag">{selected.borrowed ? 'Borrowed' : 'Ready to use'}</span>
                  </div>
                  <div className="qr-link-box">
                    <span className="eyebrow">Secure asset link</span>
                    <code>{qrPayload}</code>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">No assets available to generate a QR summary.</p>
            )}

            {scanResult ? (
              <div className="qr-scan-result">
                <span className="eyebrow">Scanned result</span>
                <code>{scanResult}</code>
              </div>
            ) : null}
          </div>

          <div className="card panel">
            <div className="panel__header">
              <h3>Report an issue</h3>
              <span>Backend-backed update</span>
            </div>
            <div className="stack">
              <Field label="Asset">
                <select value={issueDraft.assetId} onChange={(event) => setIssueDraft((current) => ({ ...current, assetId: event.target.value }))}>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.resourceCode || asset.id} - {asset.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select value={issueDraft.severity} onChange={(event) => setIssueDraft((current) => ({ ...current, severity: event.target.value }))}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Issue details">
                <textarea rows="5" value={issueDraft.text} onChange={(event) => setIssueDraft((current) => ({ ...current, text: event.target.value }))} placeholder="Describe the problem noticed during usage or scanning." />
              </Field>
              <button type="button" className="button" onClick={onReportIssue}>
                Submit report
              </button>
            </div>
          </div>
        </div>
      </div>

      {showScanner ? <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} /> : null}
    </section>
  )
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}
