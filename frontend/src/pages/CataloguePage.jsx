import { TypeBadge } from '../smartCampusShared'

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

export function CataloguePage({
  assets,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <section className="page">
      <div className="filters card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, name, category, location" />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All types</option>
          <option value="LECTURE_HALL">Lecture Hall</option>
          <option value="MEETING_ROOM">Meeting Room</option>
          <option value="ROOM">Room</option>
          <option value="LAB">Lab</option>
          <option value="EQUIPMENT">Equipment</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          {Object.keys(STATUS_META).map((status) => <option key={status} value={status}>{STATUS_META[status]}</option>)}
        </select>
      </div>

      <div className="asset-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="card asset-card">
            <div className="asset-card__head">
              <TypeBadge type={asset.resourceType} />
              <span className={`pill ${asset.condition === 'GOOD' ? 'pill--green' : 'pill--rose'}`}>{CONDITION_META[asset.condition]}</span>
            </div>
            <h3>{asset.name}</h3>
            <p className="asset-card__code">{asset.resourceCode}</p>
            <p className="asset-card__desc">{asset.description || 'No description provided yet.'}</p>
            <div className="asset-card__facts">
              <span>{STATUS_META[asset.status]}</span>
              <span>{asset.capacity} capacity</span>
              <span>{asset.locationText || 'Location pending'}</span>
            </div>
            <div className="tag-row">
              {asset.amenities.slice(0, 4).map((amenity) => <span key={amenity} className="tag">{amenity}</span>)}
            </div>
            <div className="asset-card__actions">
              <button type="button" className="button button--ghost" onClick={() => onView(asset)}>Details</button>
              <button type="button" className="button button--ghost" onClick={() => onEdit(asset)}>Edit</button>
              <button type="button" className="button button--danger" onClick={() => onDelete(asset)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
