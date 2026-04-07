import { useState, useEffect, useMemo } from "react";
import { QrPage } from "./pages/QrPage.jsx";
import './App.css'

const TYPE_META = {
  LECTURE_HALL: { icon: 'Hall', tone: 'tone-blue', label: 'Lecture Hall' },
  MEETING_ROOM: { icon: 'Meet', tone: 'tone-violet', label: 'Meeting Room' },
  ROOM: { icon: 'Room', tone: 'tone-blue', label: 'Room' },
  LAB: { icon: 'Lab', tone: 'tone-green', label: 'Lab' },
  EQUIPMENT: { icon: 'Gear', tone: 'tone-amber', label: 'Equipment' },
}

const DEFAULT_MONTHLY = Array.from({ length: 12 }, () => 0)

const emptyForm = {
  resourceCode: '',
  name: '',
  description: '',
  resourceType: 'LAB',
  category: '',
  capacity: '',
  building: '',
  floorNumber: '',
  roomNumber: '',
  locationText: '',
  availableFrom: '08:00',
  availableTo: '17:00',
  status: 'ACTIVE',
  condition: 'GOOD',
  borrowed: false,
  rating: '',
  lastServiceDate: '',
  nextServiceDate: '',
  totalBookings: '',
  bookingsToday: '',
  amenities: '',
  monthlyBookings: '',
  issues: [],
  imageUrl: '',
  requiresApproval: false,
  isActive: true,
}

function normalizeAsset(asset) {
  return {
    id: asset.id,
    resourceCode: asset.resourceCode || '',
    name: asset.name || '',
    description: asset.description || '',
    resourceType: asset.resourceType || 'LAB',
    category: asset.category || '',
    capacity: toNumber(asset.capacity),
    building: asset.building || '',
    floorNumber: asset.floorNumber ?? '',
    roomNumber: asset.roomNumber || '',
    locationText: asset.locationText || buildLocation(asset),
    availableFrom: normalizeTime(asset.availableFrom) || '08:00',
    availableTo: normalizeTime(asset.availableTo) || '17:00',
    status: asset.status || 'ACTIVE',
    condition: asset.condition || 'GOOD',
    borrowed: Boolean(asset.borrowed),
    rating: typeof asset.rating === 'number' ? asset.rating : Number(asset.rating || 0),
    lastServiceDate: normalizeDate(asset.lastServiceDate),
    nextServiceDate: normalizeDate(asset.nextServiceDate),
    totalBookings: toNumber(asset.totalBookings),
    bookingsToday: toNumber(asset.bookingsToday),
    amenities: Array.isArray(asset.amenities) ? asset.amenities.filter(Boolean) : [],
    monthlyBookings: normalizeMonthlyBookings(asset.monthlyBookings),
    issues: normalizeIssues(asset.issues),
    imageUrl: asset.imageUrl || '',
    requiresApproval: Boolean(asset.requiresApproval),
    isActive: asset.isActive ?? asset.status !== 'INACTIVE',
  }
}

function assetToForm(asset) {
  return {
    resourceCode: asset.resourceCode,
    name: asset.name,
    description: asset.description,
    resourceType: asset.resourceType,
    category: asset.category,
    capacity: stringifyNumber(asset.capacity),
    building: asset.building,
    floorNumber: asset.floorNumber === '' ? '' : stringifyNumber(asset.floorNumber),
    roomNumber: asset.roomNumber,
    locationText: asset.locationText,
    availableFrom: asset.availableFrom,
    availableTo: asset.availableTo,
    status: asset.status,
    condition: asset.condition,
    borrowed: Boolean(asset.borrowed),
    rating: asset.rating === 0 ? '' : String(asset.rating),
    lastServiceDate: asset.lastServiceDate || '',
    nextServiceDate: asset.nextServiceDate || '',
    totalBookings: stringifyNumber(asset.totalBookings),
    bookingsToday: stringifyNumber(asset.bookingsToday),
    amenities: asset.amenities.join(', '),
    monthlyBookings: asset.monthlyBookings.join(', '),
    issues: normalizeIssues(asset.issues),
    imageUrl: asset.imageUrl || '',
    requiresApproval: Boolean(asset.requiresApproval),
    isActive: asset.isActive ?? asset.status !== 'INACTIVE',
  }
}

function assetToPayload(asset) {
  return {
    resourceCode: asset.resourceCode,
    name: asset.name,
    description: asset.description,
    resourceType: asset.resourceType,
    category: asset.category,
    capacity: toNumber(asset.capacity),
    building: asset.building || null,
    floorNumber: toOptionalNumber(asset.floorNumber),
    roomNumber: asset.roomNumber || null,
    locationText: asset.locationText || null,
    availableFrom: asset.availableFrom || null,
    availableTo: asset.availableTo || null,
    status: asset.status,
    condition: asset.condition,
    borrowed: Boolean(asset.borrowed),
    rating: toOptionalNumber(asset.rating),
    lastServiceDate: asset.lastServiceDate || null,
    nextServiceDate: asset.nextServiceDate || null,
    totalBookings: toNumber(asset.totalBookings),
    bookingsToday: toNumber(asset.bookingsToday),
    amenities: Array.isArray(asset.amenities) ? asset.amenities : [],
    monthlyBookings: normalizeMonthlyBookings(asset.monthlyBookings),
    issues: normalizeIssues(asset.issues),
    imageUrl: asset.imageUrl || null,
    requiresApproval: Boolean(asset.requiresApproval),
    isActive: asset.isActive ?? asset.status !== 'INACTIVE',
  }
}

function formToPayload(form, original) {
  const normalized = normalizeAsset({
    ...original,
    ...form,
    capacity: toNumber(form.capacity),
    floorNumber: toOptionalNumber(form.floorNumber),
    rating: toOptionalNumber(form.rating) ?? 0,
    totalBookings: toNumber(form.totalBookings),
    bookingsToday: toNumber(form.bookingsToday),
    amenities: splitCsv(form.amenities),
    monthlyBookings: normalizeMonthlyBookings(splitCsv(form.monthlyBookings).map((value) => toNumber(value))),
    issues: normalizeIssues(form.issues || original?.issues),
  })
  return assetToPayload(normalized)
}

function buildNotifications(assets) {
  const notifications = []
  assets.forEach((asset) => {
    if (asset.nextServiceDate) {
      const daysUntil = diffInDays(asset.nextServiceDate)
      if (daysUntil < 0) {
        notifications.push({
          id: `maintenance-overdue-${asset.id}`,
          category: 'Maintenance',
          title: `${asset.name} is overdue for service`,
          text: `Service due on ${asset.nextServiceDate}.`,
        })
      } else if (daysUntil <= 30) {
        notifications.push({
          id: `maintenance-upcoming-${asset.id}`,
          category: 'Maintenance',
          title: `${asset.name} needs service soon`,
          text: `Next service is scheduled for ${asset.nextServiceDate}.`,
        })
      }
    }
    asset.issues
      .filter((issue) => issue.status !== 'RESOLVED')
      .forEach((issue) => {
        notifications.push({
          id: `issue-${asset.id}-${issue.id}`,
          category: 'Issue',
          title: `${asset.name} has an open ${issue.severity.toLowerCase()} issue`,
          text: issue.text,
        })
      })
  })
  return notifications
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.ROOM
  return (
    <span className="type-badge">
      <strong className={meta.tone}>{meta.icon}</strong>
      <span>{meta.label}</span>
    </span>
  )
}

function Field({ label, full = false, children }) {
  return (
    <label className={`field ${full ? 'field--full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="modal">
      <button type="button" className="modal__backdrop" aria-label="Close modal" onClick={onClose} />
      <div className="modal__content card">
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PseudoQr({ value }) {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const code = value.charCodeAt(index % Math.max(value.length, 1)) || 0
    return ((code + index * 7) % 11) > 4
  })
  return (
    <div className="pseudo-qr" aria-label={`QR preview for ${value}`}>
      {cells.map((filled, index) => (
        <span key={`${value}-${index}`} className={`pseudo-qr__cell ${filled ? 'pseudo-qr__cell--filled' : ''}`} />
      ))}
    </div>
  )
}

function QRScanner({ onScan }) {
  useEffect(() => {
    const scanner = new Html5Qrcode('reader')
    let active = true
    Html5Qrcode.getCameras().then((devices) => {
      if (active && devices && devices.length) {
        scanner.start(
          devices[0].id,
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText)
            void scanner.stop().catch(() => {})
          },
          () => {}
        )
      }
    }).catch(() => {})
    return () => {
      active = false
      void scanner.stop().catch(() => {})
      void scanner.clear().catch(() => {})
    }
  }, [onScan])
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#0f172a",
          padding: 20,
          borderRadius: 16,
          width: 360,
          maxWidth: '95vw',
        }}
      >
        <h3 style={{ color: 'white', marginBottom: 12 }}>Scan QR Code</h3>
        <div id="reader" style={{ width: '100%' }}></div>
      </div>
    </div>
  )
}

function splitCsv(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeIssues(issues) {
  return Array.isArray(issues)
    ? issues.map((issue) => ({
        id: issue.id || `ISS-${Date.now()}`,
        text: issue.text || '',
        severity: issue.severity || 'MEDIUM',
        status: issue.status || 'OPEN',
        date: normalizeDate(issue.date) || new Date().toISOString().slice(0, 10),
      }))
    : []
}

function normalizeMonthlyBookings(value) {
  const bookings = Array.isArray(value) ? value.map((item) => toNumber(item)) : []
  return [...bookings, ...DEFAULT_MONTHLY].slice(0, 12)
}

function buildLocation(asset) {
  return [asset.building, asset.floorNumber != null && asset.floorNumber !== '' ? `Floor ${asset.floorNumber}` : null, asset.roomNumber]
    .filter(Boolean)
    .join(' · ')
}

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function normalizeTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function diffInDays(dateValue) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateValue)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toOptionalNumber(value) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stringifyNumber(value) {
  return value === '' || value == null ? '' : String(value)
}



/* ── QR LIB ─────────────────────────────────────────────────────────── */
function useQRScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    if (document.querySelector(`script[src="${src}"]`)) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

/* ── IMAGE URLS (Unsplash, no auth needed) ──────────────────────────── */
const IMGS = {
  lab_general:  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80",
  lab_project:  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80",
  lab_camera:   "https://images.unsplash.com/photo-1606986628253-b9c72d11d0c8?w=600&q=80",
  lab_robotics: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80",
  hall_std:     "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80",
  hall_cam:     "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80",
  meeting:      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80",
  projector:    "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600&q=80",
  cam_sony:     "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
  cam_canon:    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
  drone:        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&q=80",
  laptop:       "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
};

/* ── HELPERS ────────────────────────────────────────────────────────── */
const dAgo  = n => new Date(Date.now() - n*864e5).toISOString().slice(0,10);
const dFwd  = n => new Date(Date.now() + n*864e5).toISOString().slice(0,10);
const TODAY = new Date().toISOString().slice(0,10);
const NOW   = new Date();
const MOS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const rnd   = (lo,hi) => Math.floor(Math.random()*(hi-lo+1))+lo;
const mb    = () => Array.from({length:12}, () => rnd(4,30));

/* ── TYPE CONFIG ────────────────────────────────────────────────────── */
const TC = {
  LAB:          { label:"Lab",          icon:"🔬", color:"#34d399", bg:"rgba(52,211,153,.12)"  },
  LECTURE_HALL: { label:"Lecture Hall", icon:"🏛",  color:"#60a5fa", bg:"rgba(96,165,250,.12)"  },
  MEETING_ROOM: { label:"Meeting Room", icon:"💬", color:"#c084fc", bg:"rgba(192,132,252,.12)" },
  EQUIPMENT:    { label:"Equipment",    icon:"📦", color:"#fbbf24", bg:"rgba(251,191,36,.12)"  },
};

const FB = {
  PROJECT_AVAILABLE: { label:"Projects", color:"#34d399", bg:"rgba(52,211,153,.2)"  },
  CAMERA_AVAILABLE:  { label:"Camera",   color:"#fbbf24", bg:"rgba(251,191,36,.2)"  },
};

const SEV = {
  CRITICAL: { c:"#e879f9", dk:"#1a0820" },
  HIGH:     { c:"#f87171", dk:"#1a0808" },
  MEDIUM:   { c:"#fbbf24", dk:"#1c1200" },
  LOW:      { c:"#60a5fa", dk:"#08122a" },
};

/* ── ASSET FACTORY ──────────────────────────────────────────────────── */
function asset(id, name, type, cat, cap, avail, loc, img, desc, amen, feats, ls, ns, tb, rat, iss=[]) {
  return { id, name, type, category:cat, capacity:cap, available:avail,
    location:loc, img, description:desc, amenities:amen, features:feats,
    status:"ACTIVE", condition:"GOOD", availFrom:"08:00", availTo:"20:00",
    lastService:ls, nextService:ns, totalBookings:tb, rating:rat,
    borrowed:cap-avail, issues:iss, monthlyBookings:mb() };
}

/* ── ALL ASSETS ─────────────────────────────────────────────────────── */
const SEED = [
  /* ── Labs ── */
  asset("LAB-4A","Computer Lab 4A","LAB","Project Lab",40,40,"Block 4 · Floor A",IMGS.lab_project,
    "Project development lab with high-spec workstations, Git terminals and collaborative tools.",
    ["40 PCs","AC","WiFi","Projector","Git Terminals","VS Code","Docker"],["PROJECT_AVAILABLE"],dAgo(10),dFwd(80),187,4.6),

  asset("LAB-3A","Computer Lab 3A","LAB","Project Lab",40,40,"Block 3 · Floor A",IMGS.lab_project,
    "Second project lab — ideal for final-year group projects and software engineering teams.",
    ["40 PCs","AC","WiFi","Dual Monitors","Node.js","Figma Stations"],["PROJECT_AVAILABLE"],dAgo(15),dFwd(75),162,4.5),

  asset("LAB-2A","Computer Lab 2A","LAB","Project Lab",35,35,"Block 2 · Floor A",IMGS.lab_project,
    "Project lab for UI/UX design and agile software development sprints.",
    ["35 PCs","AC","WiFi","Projector","Design Tools","Project Suite"],["PROJECT_AVAILABLE"],dAgo(20),dFwd(70),143,4.4),

  asset("LAB-2B","Computer Lab 2B","LAB","Computer Lab",35,35,"Block 2 · Floor B",IMGS.lab_general,
    "General-purpose computer lab for coursework, tutorials, and self-study.",
    ["35 PCs","AC","WiFi","Printer","Scanner","Whiteboard"],[],dAgo(25),dFwd(65),128,4.3),

  asset("LAB-4B","Computer Lab 4B","LAB","Camera Lab",20,20,"Block 4 · Floor B",IMGS.lab_camera,
    "Camera and media editing lab with DSLR kits, studio lights, and professional editing suites.",
    ["20 PCs","DSLR Cameras","Studio Lights","AC","WiFi","Premiere Pro","After Effects"],
    ["CAMERA_AVAILABLE"],dAgo(8),dFwd(82),89,4.7),

  asset("LAB-1A","Computer Lab 1A","LAB","Camera Lab",24,24,"Block 1 · Floor A",IMGS.lab_camera,
    "Photography and videography lab with studio lighting rigs and camera accessories.",
    ["24 PCs","Cameras","Studio Lighting","AC","WiFi","Lightroom","Capture One"],
    ["CAMERA_AVAILABLE"],dAgo(5),dFwd(85),76,4.8),

  asset("LAB-1B","Computer Lab 1B","LAB","Computer Lab",30,27,"Block 1 · Floor B",IMGS.lab_general,
    "General computer lab. 3 workstations currently under maintenance.",
    ["30 PCs","AC","WiFi","Whiteboard","Printer"],[],dAgo(60),dAgo(10),112,4.0,
    [{id:"ISS-LB1",text:"3 workstations have faulty keyboards",severity:"MEDIUM",date:dAgo(4),status:"OPEN"}]),

  asset("LAB-3B","Computer Lab 3B","LAB","Computer Lab",40,40,"Block 3 · Floor B",IMGS.lab_general,
    "Large general lab with 40 workstations, print/scan facilities, and ample seating.",
    ["40 PCs","AC","WiFi","Printer","Scanner","Whiteboard"],[],dAgo(12),dFwd(78),189,4.5),

  /* ── Lecture Halls ── */
  asset("LH-A101","Lecture Hall A101","LECTURE_HALL","Lecture Hall",120,120,"Block A · Hall 101",IMGS.hall_std,
    "Large lecture hall with 4K laser projection, wireless mic system, and project demo screen.",
    ["4K Projector","Wireless Mic","AC","WiFi","Tiered Seating","HDMI","Document Camera"],
    ["PROJECT_AVAILABLE"],dAgo(30),dFwd(60),312,4.7),

  asset("LH-A102","Lecture Hall A102","LECTURE_HALL","Lecture Hall",100,100,"Block A · Hall 102",IMGS.hall_std,
    "Medium lecture hall with dual projection screens and full project presentation support.",
    ["Dual Projectors","Wireless Mic","AC","WiFi","Tiered Seating","Podium"],
    ["PROJECT_AVAILABLE"],dAgo(28),dFwd(62),276,4.6),

  asset("LH-B101","Lecture Hall B101","LECTURE_HALL","Camera Hall",80,80,"Block B · Hall 101",IMGS.hall_cam,
    "Smart lecture hall with fixed recording cameras and live-streaming equipment.",
    ["Recording Cameras","Dual Screens","AC","WiFi","Streaming Deck","Wireless Mic"],
    ["CAMERA_AVAILABLE"],dAgo(22),dFwd(68),241,4.5),

  asset("LH-B102","Lecture Hall B102","LECTURE_HALL","Camera Hall",80,80,"Block B · Hall 102",IMGS.hall_cam,
    "Live-stream ready hall with auto-tracking cameras and professional recording studio.",
    ["Auto-Tracking Camera","Dual Screens","AC","WiFi","Recording Studio","Live Stream"],
    ["CAMERA_AVAILABLE"],dAgo(18),dFwd(72),228,4.6),

  /* ── Meeting Rooms ── */
  asset("MR-M1","Meeting Room M1","MEETING_ROOM","Meeting Room",12,12,"Block C · Floor 1",IMGS.meeting,
    "Compact meeting room with smart board, Zoom conferencing, and whiteboard.",
    ["Smart Board","Zoom Setup","AC","WiFi","Whiteboard","HDMI"],[],dAgo(14),dFwd(76),321,4.7),

  asset("MR-M2","Meeting Room M2","MEETING_ROOM","Meeting Room",12,12,"Block C · Floor 2",IMGS.meeting,
    "Premium meeting room with smart board, full video conferencing, and large TV display.",
    ["Smart Board","Video Conf","AC","WiFi","Zoom","85\" TV"],[],dAgo(20),dFwd(70),421,4.8),

  asset("MR-M3","Meeting Room M3","MEETING_ROOM","Meeting Room",20,20,"Block C · Floor 3",IMGS.meeting,
    "Large meeting room — ideal for department meetings, workshops, and seminars.",
    ["Projector","Video Conf","AC","WiFi","Whiteboard","Flexible Seating"],[],dAgo(10),dFwd(80),198,4.6),

  /* ── Robotics Labs ── */
  asset("ROB-A1","Robotics Lab A1","LAB","Robotics Lab",20,20,"Block A · Robotics Wing",IMGS.lab_robotics,
    "Industrial robotics lab with 6-axis robotic arms, 3D printers, and full IoT development kits.",
    ["6-Axis Robot Arms","3D Printer","IoT Kits","WiFi","Soldering Station","Oscilloscope"],
    [],dAgo(7),dFwd(83),98,4.8),

  asset("ROB-B1","Robotics Lab B1","LAB","Robotics Lab",20,20,"Block B · Robotics Wing",IMGS.lab_robotics,
    "Advanced robotics lab with drone testing bay and embedded systems development setup.",
    ["Robotic Arms","Drone Test Bay","Embedded Boards","WiFi","3D Printer","IoT Kits"],
    [],dAgo(9),dFwd(81),84,4.7),

  /* ── Equipment ── */
  { id:"EQ-PROJ1", name:"Epson 4K Projector", type:"EQUIPMENT", category:"Projector",
    capacity:5, available:4, location:"Equipment Store · Block A", img:IMGS.projector,
    description:"High-brightness 4K laser projector. 5 units in stock with carry cases.",
    amenities:["4K Laser","HDMI","Remote","Carry Case","VGA Adapter"],
    features:[], status:"ACTIVE", condition:"GOOD",
    availFrom:"08:00", availTo:"20:00", lastService:dAgo(14), nextService:dFwd(76),
    totalBookings:143, rating:4.3, borrowed:1, issues:[], monthlyBookings:mb() },

  { id:"EQ-CAM1", name:"Sony FX3 Camera Kit", type:"EQUIPMENT", category:"Camera",
    capacity:3, available:2, location:"Media Store · Block D", img:IMGS.cam_sony,
    description:"Full-frame cinema camera kit. 3 units — perfect for film and media projects.",
    amenities:["50mm Lens","24-70mm Lens","Tripod","Hard Case","ND Filters","Batteries"],
    features:[], status:"ACTIVE", condition:"GOOD",
    availFrom:"09:00", availTo:"17:00", lastService:dAgo(7), nextService:dFwd(83),
    totalBookings:76, rating:4.9, borrowed:1, issues:[], monthlyBookings:mb() },

  { id:"EQ-CAM2", name:"Canon EOS R5", type:"EQUIPMENT", category:"Camera",
    capacity:4, available:4, location:"Media Store · Block D", img:IMGS.cam_canon,
    description:"45MP mirrorless camera. 4 units available for professional photography.",
    amenities:["50mm Lens","70-200mm Lens","Tripod","Flash","Memory Cards"],
    features:[], status:"ACTIVE", condition:"GOOD",
    availFrom:"09:00", availTo:"17:00", lastService:dAgo(3), nextService:dFwd(87),
    totalBookings:52, rating:4.8, borrowed:0, issues:[], monthlyBookings:mb() },

  { id:"EQ-DRONE", name:"DJI Mavic 3 Drone", type:"EQUIPMENT", category:"Drone",
    capacity:2, available:2, location:"Media Store · Block D", img:IMGS.drone,
    description:"Aerial photography drone. 2 units. Requires operator certification check.",
    amenities:["3 Batteries","ND Filter Set","Controller","Hard Case","Prop Guards"],
    features:[], status:"ACTIVE", condition:"GOOD",
    availFrom:"09:00", availTo:"17:00", lastService:dAgo(5), nextService:dFwd(85),
    totalBookings:34, rating:5.0, borrowed:0, issues:[], monthlyBookings:mb() },

  { id:"EQ-LAPTOP", name:"Dell Laptop Set ×5", type:"EQUIPMENT", category:"Laptop",
    capacity:5, available:3, location:"Equipment Store · Block B", img:IMGS.laptop,
    description:"Dell laptops for presentations and fieldwork. 2 units currently under repair.",
    amenities:["Chargers","Laptop Bags","Mouse","HDMI Adapters"],
    features:[], status:"OUT_OF_SERVICE", condition:"REPAIR_NEEDED",
    availFrom:"09:00", availTo:"17:00", lastService:dAgo(90), nextService:dAgo(10),
    totalBookings:67, rating:3.8, borrowed:2,
    issues:[{id:"ISS-LP1",text:"Battery drain issues on 2 units",severity:"HIGH",date:dAgo(5),status:"IN_PROGRESS"}],
    monthlyBookings:mb() },
];

const INIT_BK = [
  { id:"BK-001", assetId:"MR-M2",   assetName:"Meeting Room M2",    role:"student", date:"2026-04-10", from:"10:00", to:"12:00", purpose:"Team Sync",       qty:1, status:"APPROVED", at:dAgo(3) },
  { id:"BK-002", assetId:"LH-A101", assetName:"Lecture Hall A101",  role:"student", date:"2026-04-12", from:"14:00", to:"16:00", purpose:"Project Demo",     qty:1, status:"PENDING",  at:dAgo(1) },
  { id:"BK-003", assetId:"EQ-CAM1", assetName:"Sony FX3 Camera Kit",role:"student", date:"2026-04-08", from:"09:00", to:"17:00", purpose:"Film Assignment",  qty:1, status:"APPROVED", at:dAgo(5) },
];

const INIT_NT = [
  { id:1, type:"SUCCESS", title:"Booking Approved",    body:"Meeting Room M2 on Apr 10 approved.",        time:"2m ago",  read:false, for:"student" },
  { id:2, type:"WARN",    title:"Return Reminder",     body:"Sony FX3 Camera Kit due back by 5 PM today.",time:"1h ago",  read:false, for:"student" },
  { id:3, type:"DANGER",  title:"Maintenance Alert",  body:"Dell Laptop Set overdue for service 10 days.",time:"3h ago",  read:false, for:"admin"   },
  { id:4, type:"INFO",    title:"Issue Reported",      body:"Computer Lab 1B has 3 faulty keyboards.",    time:"1d ago",  read:true,  for:"admin"   },
];

let BK_CTR = 4;

/* ══════════════════════════════════════════════════════════════════════ */
/*  ROOT                                                                  */
/* ══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [user,    setUser]    = useState(null);
  const [assets,  setAssets]  = useState(SEED);
  const [bks,     setBks]     = useState(INIT_BK);
  const [ntfs,    setNtfs]    = useState(INIT_NT);
  const [toast,   setToast]   = useState(null);

  const addToast = (msg, kind="ok") => {
    setToast({msg,kind}); setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    fetch('/api/resources?size=200&sortBy=name&sortDir=asc')
      .then(r => r.json())
      .then(d => setAssets(d.content.map(normalizeAsset)))
      .catch(e => console.error('Failed to load assets', e));
  }, []);

  /* mutations */
  const placeBooking = bk => {
    const id = `BK-${String(BK_CTR++).padStart(3,"0")}`;
    setBks(p => [{ ...bk, id, role:"student", status:"PENDING", at:TODAY }, ...p]);
    setAssets(p => p.map(a => a.id===bk.assetId
      ? { ...a, available:Math.max(0,a.available-bk.qty), borrowed:(a.borrowed||0)+bk.qty } : a));
    addToast("Booking submitted — pending approval ✓");
  };

  const approveBooking = id => {
    const bk = bks.find(b=>b.id===id);
    setBks(p => p.map(b => b.id===id ? {...b,status:"APPROVED"} : b));
    setNtfs(p => [{id:Date.now(),type:"SUCCESS",title:"Booking Approved",body:`${bk?.assetName} booking approved.`,time:"Just now",read:false,for:"student"},...p]);
    addToast("Booking approved ✓");
  };

  const rejectBooking = id => {
    const bk = bks.find(b=>b.id===id);
    setBks(p => p.map(b => b.id===id ? {...b,status:"REJECTED"} : b));
    if (bk) setAssets(p => p.map(a => a.id===bk.assetId
      ? {...a, available:Math.min(a.capacity,a.available+bk.qty), borrowed:Math.max(0,(a.borrowed||0)-bk.qty)} : a));
    addToast("Booking rejected","warn");
  };

  const cancelBooking = id => {
    const bk = bks.find(b=>b.id===id);
    setBks(p => p.map(b => b.id===id ? {...b,status:"CANCELLED"} : b));
    if (bk && bk.status!=="REJECTED") setAssets(p => p.map(a => a.id===bk.assetId
      ? {...a, available:Math.min(a.capacity,a.available+bk.qty), borrowed:Math.max(0,(a.borrowed||0)-bk.qty)} : a));
    addToast("Booking cancelled");
  };


  const resolveIssue = (aId,iId) => setAssets(p => p.map(a => a.id===aId ? {...a,issues:a.issues.map(i=>i.id===iId?{...i,status:"RESOLVED"}:i)} : a));
  const markServiced = id => setAssets(p => p.map(a => a.id===id ? {...a,lastService:TODAY,nextService:dFwd(90),condition:"GOOD"} : a));
  const markAllRead  = role => setNtfs(p => p.map(n => n.for===role ? {...n,read:true} : n));
  const reportIssue = ({ assetId, severity, text }) => {
    const details = String(text || '').trim();
    if (!assetId || !details) {
      addToast("Please choose an asset and enter issue details.", "warn");
      return false;
    }

    const asset = assets.find((item) => item.id === assetId);
    const issue = {
      id: `ISS-${Date.now()}`,
      text: details,
      severity: severity || "MEDIUM",
      status: "OPEN",
      date: TODAY,
    };

    setAssets((previous) =>
      previous.map((item) =>
        item.id === assetId
          ? { ...item, issues: [issue, ...(item.issues || [])] }
          : item
      )
    );

    setNtfs((previous) => [
      {
        id: Date.now() + 1,
        type: "INFO",
        title: "Issue Reported",
        body: `${asset?.name || assetId}: ${details}`,
        time: "Just now",
        read: false,
        for: "admin",
      },
      ...previous,
    ]);

    addToast("Issue submitted from QR tracking.");
    return true;
  };

  const saveAsset = async (asset) => {
    const url = asset.id ? `/api/resources/${asset.id}` : '/api/resources';
    const method = asset.id ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(asset)),
      });
      if (!response.ok) throw new Error('Failed to save');
      const saved = await response.json();
      setAssets(p => asset.id ? p.map(a => a.id === asset.id ? normalizeAsset(saved) : a) : [...p, normalizeAsset(saved)]);
      addToast("Asset saved ✓");
    } catch (e) {
      addToast("Error saving asset", "warn");
    }
  };

  const deleteAsset = async (id) => {
    try {
      const response = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setAssets(p => p.filter(a => a.id !== id));
      addToast("Asset deleted","warn");
    } catch (e) {
      addToast("Error deleting asset", "warn");
    }
  };
  const markOneRead  = id   => setNtfs(p => p.map(n => n.id===id  ? {...n,read:true} : n));

  if (!user) return <Login onLogin={setUser}/>;

  const myNtfs = ntfs.filter(n => n.for===user.role);
  const myBks  = user.role==="admin" ? bks : bks.filter(b => b.role==="student");
  const unread = myNtfs.filter(n => !n.read).length;

  return (
    <Shell toast={toast}>
      <TopBar user={user} onLogout={() => setUser(null)} unread={unread}/>
      {user.role==="admin"
        ? <AdminPortal
            assets={assets} bks={bks} ntfs={myNtfs}
            onSave={saveAsset} onAdd={saveAsset} onDelete={deleteAsset}
            onApprove={approveBooking} onReject={rejectBooking}
            onResolve={resolveIssue} onService={markServiced}
            onReportIssue={reportIssue}
            onMarkAll={() => markAllRead("admin")} onMarkOne={markOneRead}
            toast={addToast}/>
        : <UserPortal
            assets={assets} bks={myBks} ntfs={myNtfs}
            onBook={placeBooking} onCancel={cancelBooking}
            onMarkAll={() => markAllRead("student")} onMarkOne={markOneRead}
            user={user} toast={addToast}/>
      }
    </Shell>
  );
}

/* ─── SHELL & GLOBAL CSS ─────────────────────────────────────────────── */
function Shell({ children, toast }) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:"#090d18",color:"#e2e8f0",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        button,input,select,textarea{font-family:inherit}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
        input,select{background:#0b0f1c;border:1px solid #1e293b;border-radius:9px;color:#e2e8f0;padding:0 12px;height:40px;font-size:13px;outline:none;width:100%;transition:border-color .15s}
        textarea{background:#0b0f1c;border:1px solid #1e293b;border-radius:9px;color:#e2e8f0;padding:10px 12px;font-size:13px;outline:none;width:100%;resize:vertical}
        input:focus,select:focus,textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
        select option{background:#121929}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fadeUp{animation:fadeUp .22s ease}
      `}</style>
      {children}
      {toast && (
        <div className="fadeUp" style={{position:"fixed",bottom:24,right:24,zIndex:9999,padding:"13px 22px",borderRadius:12,fontSize:13,fontWeight:700,maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,.6)",
          background:toast.kind==="warn"?"#1a0808":"#071a0f",
          color:toast.kind==="warn"?"#f87171":"#34d399",
          border:`1px solid ${toast.kind==="warn"?"#7f1d1d":"#14532d"}`}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────────────── */
function Login({ onLogin }) {
  const [role, setRole] = useState("student");
  const DEMO = {
    admin:   { email:"admin@sliit.lk",   pass:"admin123",   name:"Administrator",   id:"ADM-001"    },
    student: { email:"student@sliit.lk", pass:"student123", name:"Kavindra Perera", id:"IT22230044" },
  };
  const [form, setForm] = useState({ email:DEMO.student.email, pass:DEMO.student.pass });
  const [err,  setErr]  = useState("");

  const sw = r => { setRole(r); setErr(""); setForm({email:DEMO[r].email,pass:DEMO[r].pass}); };

  const go = () => {
    const d = DEMO[role];
    if (form.email===d.email && form.pass===d.pass) onLogin({role,...d});
    else setErr(`Try: ${d.email} / ${d.pass}`);
  };

  return (
    <div style={{minHeight:"100vh",background:"#090d18",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input{background:#0b0f1c;border:1px solid #1e293b;border-radius:9px;color:#e2e8f0;padding:0 14px;height:42px;font-size:14px;width:100%;font-family:inherit;outline:none}input:focus{border-color:#3b82f6}`}</style>
      <div style={{width:"100%",maxWidth:420,background:"#111827",border:"1px solid #1e293b",borderRadius:20,padding:32,boxShadow:"0 24px 60px rgba(0,0,0,.7)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:58,height:58,borderRadius:16,background:"linear-gradient(135deg,#3b82f6,#7c3aed)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff",marginBottom:14}}>SC</div>
          <h1 style={{fontSize:24,fontWeight:700,color:"#f1f5f9",letterSpacing:"-0.02em"}}>SmartCampus Hub</h1>
          <p style={{fontSize:13,color:"#475569",marginTop:4}}>Facilities & Asset Management · SLIIT</p>
        </div>

        <div style={{display:"flex",background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:12,padding:4,marginBottom:22}}>
          {["student","admin"].map(r => (
            <button key={r} onClick={() => sw(r)} style={{flex:1,padding:"10px",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:role===r?700:400,background:role===r?"#3b82f6":"transparent",color:role===r?"#fff":"#475569",transition:"all .2s"}}>
              {r==="student"?"👤 Student":"🔑 Admin"}
            </button>
          ))}
        </div>

        {err && <div style={{background:"#1a0808",border:"1px solid #7f1d1d",borderRadius:9,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:14}}>{err}</div>}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={{fontSize:10,fontWeight:700,color:"#334155",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.07em"}}>Email</label>
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Email"/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:"#334155",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.07em"}}>Password</label>
            <input type="password" value={form.pass} onChange={e=>setForm(f=>({...f,pass:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password"/></div>
          <button onClick={go} style={{height:44,border:"none",borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#7c3aed)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:4}} onMouseEnter={e=>e.target.style.opacity=".85"} onMouseLeave={e=>e.target.style.opacity="1"}>
            Sign In →
          </button>
        </div>

        <div style={{marginTop:16,padding:"12px 14px",background:"#0b0f1c",borderRadius:9,border:"1px solid #1e293b"}}>
          <p style={{fontSize:10,fontWeight:700,color:"#334155",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>Demo Credentials</p>
          <p style={{fontSize:12,color:"#475569"}}>Student: student@sliit.lk / student123</p>
          <p style={{fontSize:12,color:"#475569"}}>Admin: admin@sliit.lk / admin123</p>
        </div>
      </div>
    </div>
  );
}

/* ─── TOP BAR ────────────────────────────────────────────────────────── */
function TopBar({ user, onLogout, unread }) {
  return (
    <div style={{background:"#111827",borderBottom:"1px solid #1e293b",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3b82f6,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>SC</div>
        <span style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>SmartCampus</span>
        <span style={{fontSize:11,color:"#334155"}}>Facilities & Asset Hub</span>
        <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:"0.06em",
          background:user.role==="admin"?"rgba(192,132,252,.15)":"rgba(96,165,250,.15)",
          color:user.role==="admin"?"#c084fc":"#60a5fa",
          border:`1px solid ${user.role==="admin"?"rgba(192,132,252,.3)":"rgba(96,165,250,.3)"}`}}>
          {user.role.toUpperCase()}
        </span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {unread>0 && <span style={{fontSize:13,color:"#60a5fa",fontWeight:600}}>🔔 {unread}</span>}
        <span style={{fontSize:13,color:"#64748b"}}>{user.name}</span>
        <button onClick={onLogout} style={{height:30,padding:"0 14px",border:"1px solid #1e293b",borderRadius:8,background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}} onMouseEnter={e=>e.target.style.color="#f87171"} onMouseLeave={e=>e.target.style.color="#64748b"}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  ADMIN PORTAL                                                          */
/* ══════════════════════════════════════════════════════════════════════ */
function AdminPortal({ assets, bks, ntfs, onSave, onAdd, onDelete, onApprove, onReject, onResolve, onService, onReportIssue, onMarkAll, onMarkOne, toast }) {
  const [pg, setPg] = useState("dashboard");
  const [issueDraft, setIssueDraft] = useState({
    assetId: assets[0]?.id || "",
    severity: "MEDIUM",
    text: "",
  });
  const od = assets.filter(a => new Date(a.nextService)<NOW).length;
  const ic = assets.reduce((s,a)=>s+a.issues.filter(i=>i.status!=="RESOLVED").length,0);
  const pc = bks.filter(b=>b.status==="PENDING").length;
  const uc = ntfs.filter(n=>!n.read).length;

  useEffect(() => {
    if (!assets.length) {
      setIssueDraft((current) => ({ ...current, assetId: "" }));
      return;
    }

    setIssueDraft((current) => {
      if (current.assetId && assets.some((asset) => asset.id === current.assetId)) {
        return current;
      }

      return { ...current, assetId: assets[0].id };
    });
  }, [assets]);

  const handleReportIssue = () => {
    const submitted = onReportIssue?.(issueDraft);
    if (submitted) {
      setIssueDraft((current) => ({ ...current, severity: "MEDIUM", text: "" }));
    }
  };

  const NAV = [
    {id:"dashboard",icon:"▦", label:"Dashboard"},
    {id:"catalogue",icon:"◈", label:"Catalogue"},
    {id:"qr",       icon:"QR",label:"QR Tracking"},
    {id:"bookings", icon:"📋",label:"Bookings",   badge:pc},
    {id:"issues",   icon:"🚨",label:"Issues",     badge:ic},
    {id:"analytics",icon:"📈",label:"Analytics"},
    {id:"maint",    icon:"🔧",label:"Maintenance",badge:od},
    {id:"notifs",   icon:"🔔",label:"Notifications",badge:uc},
  ];

  return (
    <div style={{display:"flex",flex:1}}>
      <SideNav nav={NAV} active={pg} onNav={setPg} foot={
        <><Dot/><span style={{fontSize:11,color:"#334155"}}>{assets.filter(a=>a.status==="ACTIVE").length} assets live</span></>
      }/>
      <main style={{flex:1,overflowY:"auto",maxHeight:"calc(100vh - 56px)"}}>
        {pg==="dashboard"  && <AdminDash   assets={assets} bks={bks}/>}
        {pg==="catalogue"  && <AdminCat    assets={assets} onSave={onSave} onAdd={onAdd} onDelete={onDelete} toast={toast}/>}
        {pg==="qr"         && <QrPage assets={assets} issueDraft={issueDraft} setIssueDraft={setIssueDraft} onReportIssue={handleReportIssue} onToast={toast} />}
        {pg==="bookings"   && <AdminBooks  bks={bks} assets={assets} onApprove={onApprove} onReject={onReject}/>}
        {pg==="issues"     && <IssuesPage  assets={assets} onResolve={onResolve}/>}
        {pg==="analytics"  && <Analytics   assets={assets}/>}
        {pg==="maint"      && <Maintenance assets={assets} onService={onService}/>}
        {pg==="notifs"     && <NotifsPage  ntfs={ntfs} onOne={onMarkOne} onAll={onMarkAll}/>}
      </main>
    </div>
  );
}

/* ─── ADMIN DASHBOARD ─────────────────────────────────────────────────── */
function AdminDash({ assets, bks }) {
  const total  = assets.length;
  const active = assets.filter(a=>a.status==="ACTIVE").length;
  const borrow = assets.reduce((s,a)=>s+(a.borrowed||0),0);
  const oos    = assets.filter(a=>a.status==="OUT_OF_SERVICE").length;
  const repair = assets.filter(a=>a.condition==="REPAIR_NEEDED").length;
  const od     = assets.filter(a=>new Date(a.nextService)<NOW).length;
  const pend   = bks.filter(b=>b.status==="PENDING").length;
  const iss    = assets.reduce((s,a)=>s+a.issues.filter(i=>i.status!=="RESOLVED").length,0);

  return (
    <Page title="Admin Dashboard" sub="Live overview of all campus assets">
      <Grid4>
        {[["Total Assets",total,"#60a5fa"],["Active",active,"#34d399"],["Borrowed",borrow,"#fbbf24"],
          ["Out of Service",oos,"#f87171"],["Pending Bookings",pend,"#c084fc"],["Open Issues",iss,"#fb923c"],
          ["Need Repair",repair,"#f43f5e"],["Overdue Maint.",od,"#e879f9"]].map(([l,v,c])=>(
          <Card key={l} p="14px 18px">
            <p style={{fontSize:10,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{l}</p>
            <p style={{fontSize:30,fontWeight:700,color:c,letterSpacing:"-0.04em"}}>{v}</p>
          </Card>
        ))}
      </Grid4>
      <Card p="16px 20px" mb={14}>
        <p style={SL}>Asset Distribution</p>
        <div style={{display:"flex",height:10,borderRadius:8,overflow:"hidden",gap:2,marginBottom:8}}>
          <div style={{flex:Math.max(active-borrow,0),background:"#34d399",borderRadius:"8px 0 0 8px",minWidth:2}}/>
          <div style={{flex:borrow,background:"#fbbf24",minWidth:2}}/>
          <div style={{flex:oos,background:"#f87171",minWidth:2}}/>
          <div style={{flex:Math.max(repair-oos,0),background:"#fb923c",borderRadius:"0 8px 8px 0",minWidth:2}}/>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["#34d399","Available"],["#fbbf24","Borrowed"],["#f87171","OOS"],["#fb923c","Repair"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
              <span style={{fontSize:12,color:"#475569"}}>{l}</span>
            </div>
          ))}
        </div>
      </Card>
      <Grid2>
        <Card p="16px 18px">
          <p style={SL}>Live Alerts</p>
          {assets.filter(a=>new Date(a.nextService)<NOW).slice(0,4).map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"#0b0f1c",border:"1px solid #fb923c22",marginBottom:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#fb923c",animation:"pulse 2s infinite",flexShrink:0}}/>
              <p style={{fontSize:12,color:"#fb923c",lineHeight:1.4}}>{a.name} — maintenance overdue</p>
            </div>
          ))}
        </Card>
        <Card p="16px 18px">
          <p style={SL}>Recent Bookings</p>
          {bks.slice(0,5).map(b=>{
            const c={APPROVED:"#34d399",PENDING:"#fbbf24",REJECTED:"#f87171",CANCELLED:"#64748b"}[b.status]||"#64748b";
            return (
              <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e293b"}}>
                <div><p style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>{b.assetName}</p><p style={{fontSize:11,color:"#475569"}}>{b.date}</p></div>
                <Pill c={c}>{b.status}</Pill>
              </div>
            );
          })}
        </Card>
      </Grid2>
    </Page>
  );
}

/* ─── ADMIN CATALOGUE ─────────────────────────────────────────────────── */
function AdminCat({ assets, onSave, onAdd, onDelete, toast }) {
  const [search, setSearch] = useState("");
  const [fType,  setFType]  = useState("ALL");
  const [fStat,  setFStat]  = useState("ALL");
  const [fFeat,  setFFeat]  = useState("ALL");
  const [modal,  setModal]  = useState(null);
  const [sel,    setSel]    = useState(null);
  const [form,   setForm]   = useState({});
  const [ferr,   setFerr]   = useState("");

  const filtered = useMemo(() => assets.filter(a => {
    if (fType!=="ALL" && a.type!==fType) return false;
    if (fStat!=="ALL" && a.status!==fStat) return false;
    if (fFeat==="PROJECT" && !a.features?.includes("PROJECT_AVAILABLE")) return false;
    if (fFeat==="CAMERA"  && !a.features?.includes("CAMERA_AVAILABLE"))  return false;
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
  }), [assets,search,fType,fStat,fFeat]);

  const openEdit = a => { setSel(a); setForm({...a,amenities:[...(a.amenities||[])],features:[...(a.features||[])]}); setFerr(""); setModal("form"); };
  const openAdd  = () => { setSel(null); setForm({id:`ASSET-${assets.length+1}`,name:"",type:"LAB",category:"",capacity:30,available:30,location:"",status:"ACTIVE",condition:"GOOD",availFrom:"08:00",availTo:"18:00",description:"",amenities:[],features:[],img:IMGS.lab_general,totalBookings:0,rating:4.5,borrowed:0,issues:[],monthlyBookings:mb(),lastService:TODAY,nextService:dFwd(90)}); setFerr(""); setModal("form"); };
  const chg = (k,v) => setForm(f=>({...f,[k]:v}));
  const togFeat = f => { const cur=form.features||[]; chg("features",cur.includes(f)?cur.filter(x=>x!==f):[...cur,f]); };

  const doSave = () => {
    if (!form.name?.trim()) { setFerr("Name required"); return; }
    if (!form.location?.trim()) { setFerr("Location required"); return; }
    sel ? onSave({...form,capacity:+form.capacity,available:+form.available}) : onAdd({...form,capacity:+form.capacity,available:+form.available});
    setModal(null);
  };

  return (
    <Page title="Asset Catalogue" sub={`${filtered.length} of ${assets.length} assets`} action={<BBtn onClick={openAdd}>+ Add Asset</BBtn>}>
      <Card p="12px 14px" mb={14} style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <SearchBox v={search} onChange={setSearch} ph="Search name, ID, location…"/>
        <Sel v={fType} onChange={setFType}><option value="ALL">All Types</option>{Object.keys(TC).map(t=><option key={t} value={t}>{TC[t].label}</option>)}</Sel>
        <Sel v={fStat} onChange={setFStat}><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="OUT_OF_SERVICE">OOS</option></Sel>
        <Sel v={fFeat} onChange={setFFeat}><option value="ALL">All Features</option><option value="PROJECT">Project Equipped</option><option value="CAMERA">Camera Equipped</option></Sel>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
        {filtered.map(a => (
          <AssetCard key={a.id} a={a} admin
            onDetail={() => { setSel(a); setModal("detail"); }}
            onEdit={() => openEdit(a)}
            onDelete={() => { onDelete(a.id); toast("Removed","warn"); }}/>
        ))}
        {!filtered.length && <NoRes/>}
      </div>

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          {modal==="detail" && sel && <DetailSheet a={sel} admin onClose={()=>setModal(null)} onEdit={()=>{setModal(null);openEdit(sel);}} onDelete={()=>{onDelete(sel.id);setModal(null);toast("Removed","warn");}}/>}
          {modal==="form" && (
            <div style={{padding:"1.75rem",maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
              <SHdr title={sel?"Edit Asset":"New Asset"} onClose={()=>setModal(null)}/>
              {ferr && <ErrBx msg={ferr}/>}
              <div style={{display:"flex",flexDirection:"column",gap:13}}>
                <Grid2><FL l="Asset ID"><input value={form.id||""} onChange={e=>chg("id",e.target.value)}/></FL><FL l="Name"><input value={form.name||""} onChange={e=>chg("name",e.target.value)}/></FL></Grid2>
                <Grid2><FL l="Type"><Sel v={form.type||"LAB"} onChange={v=>chg("type",v)}>{Object.keys(TC).map(t=><option key={t} value={t}>{TC[t].label}</option>)}</Sel></FL><FL l="Category"><input value={form.category||""} onChange={e=>chg("category",e.target.value)}/></FL></Grid2>
                <FL l="Location"><input value={form.location||""} onChange={e=>chg("location",e.target.value)}/></FL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <FL l="Capacity"><input type="number" value={form.capacity||""} onChange={e=>chg("capacity",e.target.value)}/></FL>
                  <FL l="Status"><Sel v={form.status||"ACTIVE"} onChange={v=>chg("status",v)}><option value="ACTIVE">Active</option><option value="OUT_OF_SERVICE">Out of Service</option></Sel></FL>
                  <FL l="Condition"><Sel v={form.condition||"GOOD"} onChange={v=>chg("condition",v)}><option value="GOOD">Good</option><option value="REPAIR_NEEDED">Repair Needed</option></Sel></FL>
                </div>
                <Grid2><FL l="Opens"><input type="time" value={form.availFrom||"08:00"} onChange={e=>chg("availFrom",e.target.value)}/></FL><FL l="Closes"><input type="time" value={form.availTo||"18:00"} onChange={e=>chg("availTo",e.target.value)}/></FL></Grid2>
                <FL l="Description"><textarea value={form.description||""} onChange={e=>chg("description",e.target.value)} rows={2}/></FL>
                <FL l="Image URL"><input value={form.img||""} onChange={e=>chg("img",e.target.value)} placeholder="https://…"/></FL>
                <FL l="Features">
                  <div style={{display:"flex",gap:14}}>
                    {[["PROJECT_AVAILABLE","Projects"],["CAMERA_AVAILABLE","Camera"]].map(([f,l])=>(
                      <label key={f} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:"#94a3b8"}}>
                        <input type="checkbox" checked={(form.features||[]).includes(f)} onChange={()=>togFeat(f)} style={{width:"auto",height:"auto",accentColor:"#3b82f6"}}/>{l}
                      </label>
                    ))}
                  </div>
                </FL>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <GBtn onClick={()=>setModal(null)}>Cancel</GBtn>
                  <BBtn onClick={doSave} style={{flex:2}}>{sel?"Save Changes":"Add Asset"}</BBtn>
                </div>
              </div>
            </div>
          )}
        </Overlay>
      )}
    </Page>
  );
}

/* ─── ADMIN BOOKINGS ──────────────────────────────────────────────────── */
function AdminBooks({ bks, assets, onApprove, onReject }) {
  const [filter, setFilter] = useState("ALL");
  const list = useMemo(() => bks.filter(b => filter==="ALL"||b.status===filter), [bks,filter]);
  const SC = {APPROVED:"#34d399",PENDING:"#fbbf24",REJECTED:"#f87171",CANCELLED:"#64748b"};

  return (
    <Page title="Booking Requests" sub={`${bks.filter(b=>b.status==="PENDING").length} pending`}
      action={<Sel v={filter} onChange={setFilter}><option value="ALL">All Status</option>{["PENDING","APPROVED","REJECTED","CANCELLED"].map(s=><option key={s} value={s}>{s}</option>)}</Sel>}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {list.map(b => {
          const a = assets.find(x=>x.id===b.assetId);
          const c = SC[b.status]||"#64748b";
          return (
            <Card key={b.id} p="14px 18px" style={{display:"flex",gap:14,alignItems:"center"}}>
              {a?.img && <img src={a.img} alt="" style={{width:60,height:60,borderRadius:10,objectFit:"cover",flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#60a5fa"}}>{b.id}</span>
                  <Pill c={c}>{b.status}</Pill>
                  <span style={{fontSize:11,color:"#334155",marginLeft:"auto"}}>{b.at}</span>
                </div>
                <p style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:3}}>{b.assetName}</p>
                <p style={{fontSize:12,color:"#475569"}}>📅 {b.date} · {b.from}–{b.to} · Qty: {b.qty} · {b.purpose}</p>
              </div>
              {b.status==="PENDING" && (
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>onApprove(b.id)} style={{height:34,padding:"0 16px",border:"1px solid #14532d",borderRadius:8,background:"#071a0f",color:"#34d399",fontSize:12,fontWeight:700,cursor:"pointer"}}>Approve</button>
                  <button onClick={()=>onReject(b.id)}  style={{height:34,padding:"0 16px",border:"1px solid #7f1d1d",borderRadius:8,background:"#1a0808",color:"#f87171",fontSize:12,fontWeight:700,cursor:"pointer"}}>Reject</button>
                </div>
              )}
            </Card>
          );
        })}
        {!list.length && <Empty icon="📋" msg="No bookings match"/>}
      </div>
    </Page>
  );
}

/* ─── ISSUES ──────────────────────────────────────────────────────────── */
function IssuesPage({ assets, onResolve }) {
  const [fSev, setFSev] = useState("ALL");
  const all = useMemo(() => {
    const out = [];
    assets.forEach(a => a.issues.forEach(i => {
      if (fSev!=="ALL" && i.severity!==fSev) return;
      out.push({...i, assetId:a.id, assetName:a.name, assetImg:a.img, assetLoc:a.location});
    }));
    return out.sort((a,b) => ({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[a.severity]??4)-({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[b.severity]??4));
  }, [assets,fSev]);

  return (
    <Page title="Issue Tracker" sub={`${all.filter(i=>i.status!=="RESOLVED").length} open`}
      action={<Sel v={fSev} onChange={setFSev}><option value="ALL">All Severity</option>{["CRITICAL","HIGH","MEDIUM","LOW"].map(s=><option key={s} value={s}>{s}</option>)}</Sel>}>
      <Grid4 style={{marginBottom:14}}>
        {["CRITICAL","HIGH","MEDIUM","LOW"].map(s => {
          const m=SEV[s]; const cnt=assets.reduce((acc,a)=>acc+a.issues.filter(i=>i.severity===s&&i.status!=="RESOLVED").length,0);
          return <Card key={s} p="12px 16px" style={{borderColor:m.c+"44",background:m.dk}}><p style={{fontSize:10,fontWeight:700,color:m.c,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>{s}</p><p style={{fontSize:28,fontWeight:700,color:m.c}}>{cnt}</p></Card>;
        })}
      </Grid4>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {all.map(iss => {
          const m=SEV[iss.severity]||SEV.LOW;
          return (
            <Card key={iss.id} p="14px 18px" style={{display:"flex",gap:12,alignItems:"center",borderColor:m.c+"33"}}>
              <img src={iss.assetImg} alt="" style={{width:50,height:50,borderRadius:9,objectFit:"cover",flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                  <Pill c={m.c}>{iss.severity}</Pill>
                  <span style={{fontSize:11,color:"#60a5fa",fontWeight:600}}>{iss.id}</span>
                  <span style={{fontSize:11,color:"#334155"}}>{iss.date}</span>
                  <Pill c={iss.status==="RESOLVED"?"#34d399":iss.status==="IN_PROGRESS"?"#fbbf24":"#f87171"} style={{marginLeft:"auto"}}>{iss.status}</Pill>
                </div>
                <p style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{iss.text}</p>
                <p style={{fontSize:12,color:"#475569"}}>{iss.assetName} · {iss.assetLoc}</p>
              </div>
              {iss.status!=="RESOLVED" && <button onClick={()=>onResolve(iss.assetId,iss.id)} style={{flexShrink:0,height:32,padding:"0 14px",border:"1px solid #14532d",borderRadius:8,background:"#071a0f",color:"#34d399",fontSize:12,fontWeight:700,cursor:"pointer"}}>Resolve</button>}
            </Card>
          );
        })}
        {!all.length && <Empty icon="✓" msg="No issues found"/>}
      </div>
    </Page>
  );
}

/* ─── ANALYTICS ───────────────────────────────────────────────────────── */
function Analytics({ assets }) {
  const totalB = assets.reduce((s,a)=>s+a.totalBookings,0);
  const avgR   = (assets.reduce((s,a)=>s+(a.rating||0),0)/assets.length).toFixed(1);
  const top5   = [...assets].sort((a,b)=>b.totalBookings-a.totalBookings).slice(0,5);
  const byType = Object.keys(TC).map(t=>({t,cnt:assets.filter(a=>a.type===t).length}));
  const peak   = [12,28,46,58,32,22,52,64,44,26,15,8];
  const maxP   = Math.max(...peak);
  const mon2   = MOS.map((m,i)=>({m,v:assets.reduce((s,a)=>s+(a.monthlyBookings?.[i]||0),0)}));
  const maxM   = Math.max(...mon2.map(x=>x.v),1);

  return (
    <Page title="Analytics" sub="Usage statistics, trends and insights">
      <Grid4>
        {[["Total Bookings",totalB.toLocaleString(),"#60a5fa"],["Assets",assets.length,"#34d399"],["Avg Rating",`★${avgR}`,"#fbbf24"],["Borrowed",assets.reduce((s,a)=>s+(a.borrowed||0),0),"#c084fc"]].map(([l,v,c])=>(
          <Card key={l} p="14px 18px"><p style={KL}>{l}</p><p style={{fontSize:28,fontWeight:700,color:c,letterSpacing:"-0.03em"}}>{v}</p></Card>
        ))}
      </Grid4>
      <Grid2 mb={12}>
        <Card p="18px"><p style={SL}>⏰ Popular Time Slots</p>
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:100,marginBottom:8}}>
            {peak.map((v,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:"100%",borderRadius:"3px 3px 0 0",height:`${(v/maxP)*100}%`,background:v===maxP?"#3b82f6":v>maxP*.7?"#2563eb":"#1e3a5f",minHeight:3}}/><span style={{fontSize:8,color:"#334155"}}>{8+i}h</span></div>)}
          </div><p style={{fontSize:12,color:"#475569"}}>Peak: <strong style={{color:"#60a5fa"}}>15:00</strong></p>
        </Card>
        <Card p="18px"><p style={SL}>📅 Monthly Trend</p>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100,marginBottom:8}}>
            {mon2.map((m,i)=><div key={m.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:"100%",borderRadius:"3px 3px 0 0",height:`${(m.v/maxM)*100}%`,background:i===NOW.getMonth()?"#34d399":"#14532d",minHeight:3}}/><span style={{fontSize:8,color:"#334155"}}>{m.m[0]}</span></div>)}
          </div><p style={{fontSize:12,color:"#475569"}}>This month: <strong style={{color:"#34d399"}}>{mon2[NOW.getMonth()].v}</strong></p>
        </Card>
      </Grid2>
      <Grid2 mb={12}>
        <Card p="18px"><p style={SL}>◈ By Type</p>
          {byType.map(({t,cnt})=>{const m=TC[t];const pct=Math.round((cnt/assets.length)*100);return(<div key={t} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#94a3b8"}}>{m.icon} {m.label}</span><span style={{fontSize:12,color:"#475569"}}>{cnt}·{pct}%</span></div><div style={{height:5,borderRadius:3,background:"#1e293b",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:m.color,borderRadius:3}}/></div></div>);})}
        </Card>
        <Card p="18px"><p style={SL}>🌡 Utilization Heatmap</p>
          <div style={{display:"grid",gridTemplateColumns:"44px repeat(5,1fr)",gap:3}}>
            {["","Mon","Tue","Wed","Thu","Fri"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,fontWeight:600,color:"#334155",paddingBottom:3}}>{d}</div>)}
            {["08–10","10–12","12–14","14–16","16–18"].map(sl=>(
              <>{<div style={{fontSize:9,color:"#334155",paddingTop:5,textAlign:"right",paddingRight:4}}>{sl}</div>}
              {[0,1,2,3,4].map(di=>{const v=Math.random();const bg=v>.8?"#1d4ed8":v>.6?"#2563eb":v>.4?"#3b82f6":v>.2?"#60a5fa":"#0f172a";return<div key={di} style={{height:22,borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"rgba(255,255,255,.5)",fontWeight:600}}>{Math.round(v*100)}%</div>;})}
              </>
            ))}
          </div>
        </Card>
      </Grid2>
      <Card p="18px"><p style={SL}>🏆 Top 5 Most Booked</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {top5.map((a,i)=>{const m=TC[a.type]||TC.EQUIPMENT;return(
            <div key={a.id} style={{background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden"}}>
              <img src={a.img} alt="" style={{width:"100%",height:70,objectFit:"cover"}}/>
              <div style={{padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:18}}>{m.icon}</span><span style={{fontSize:11,fontWeight:700,color:"#60a5fa"}}>#{i+1}</span></div><p style={{fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:5,lineHeight:1.3}}>{a.name}</p><p style={{fontSize:22,fontWeight:700,color:"#f1f5f9"}}>{a.totalBookings}</p></div>
            </div>
          );})}
        </div>
      </Card>
    </Page>
  );
}

/* ─── MAINTENANCE ─────────────────────────────────────────────────────── */
function Maintenance({ assets, onService }) {
  const diff = d => Math.round((new Date(d)-NOW)/864e5);
  const od = assets.filter(a=>new Date(a.nextService)<NOW);
  const up = assets.filter(a=>{const d=new Date(a.nextService);return d>=NOW&&d<new Date(Date.now()+30*864e5);});
  const ok = assets.filter(a=>new Date(a.nextService)>=new Date(Date.now()+30*864e5));

  return (
    <Page title="Maintenance" sub="Automated tracking · reminders · condition alerts" badge={<IBadge color="#fb923c">🔧 ASSET HEALTH</IBadge>}>
      <Grid3 mb={14}>
        {[[od.length,"Overdue","#f87171","#1a0808","Immediate"],[up.length,"Due Soon","#fbbf24","#1c1200","30 days"],[ok.length,"Healthy","#34d399","#071a0f","OK"]].map(([v,l,c,bg,sub])=>(
          <Card key={l} p="14px 18px" style={{background:bg,borderColor:c+"33"}}><p style={{fontSize:10,fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{l}</p><p style={{fontSize:30,fontWeight:700,color:c,marginBottom:4}}>{v}</p><p style={{fontSize:12,color:c,opacity:.7}}>{sub}</p></Card>
        ))}
      </Grid3>
      {od.length>0 && <Card p="16px 18px" mb={12} style={{borderColor:"#f87171"+"33"}}><p style={{fontSize:13,fontWeight:700,color:"#f87171",marginBottom:10}}>🔴 Overdue</p>{od.map(a=><MRow key={a.id} a={a} days={Math.abs(diff(a.nextService))} overdue onSvc={()=>onService(a.id)}/>)}</Card>}
      {up.length>0 && <Card p="16px 18px" mb={12} style={{borderColor:"#fbbf24"+"33"}}><p style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:10}}>🟡 Due Soon</p>{up.map(a=><MRow key={a.id} a={a} days={diff(a.nextService)} onSvc={()=>onService(a.id)}/>)}</Card>}
      <Card p="16px 18px"><p style={{fontSize:13,fontWeight:700,color:"#34d399",marginBottom:10}}>🟢 Healthy</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
          {ok.map(a=>(
            <div key={a.id} style={{background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:9,padding:"10px 12px",display:"flex",gap:8,alignItems:"center"}}>
              <img src={a.img} alt="" style={{width:36,height:36,borderRadius:7,objectFit:"cover",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}><p style={{fontSize:12,fontWeight:600,color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</p><p style={{fontSize:10,color:"#334155"}}>Next in {diff(a.nextService)}d</p></div>
              <Pill c="#34d399">OK</Pill>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
function MRow({ a, days, overdue, onSvc }) {
  return (
    <div style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1e293b"}}>
      <img src={a.img} alt="" style={{width:44,height:44,borderRadius:9,objectFit:"cover",flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{a.name}</p>
        <p style={{fontSize:11,color:"#475569"}}>{a.location} · Last: {a.lastService}</p>
        <div style={{display:"flex",gap:5,marginTop:4}}>
          <Pill c={a.condition==="GOOD"?"#34d399":"#f87171"}>{a.condition==="GOOD"?"Good":"Repair"}</Pill>
          <Pill c={overdue?"#f87171":"#fbbf24"}>{overdue?`${days}d overdue`:`${days}d left`}</Pill>
        </div>
      </div>
      <button onClick={onSvc} style={{flexShrink:0,height:32,padding:"0 14px",border:"1px solid #1e3a5f",borderRadius:8,background:"#06122a",color:"#60a5fa",fontSize:12,fontWeight:700,cursor:"pointer"}}>Mark Serviced</button>
    </div>
  );
}

/* ─── NOTIFICATIONS ───────────────────────────────────────────────────── */
function NotifsPage({ ntfs, onOne, onAll }) {
  const NC = { SUCCESS:{c:"#34d399",bg:"#071a0f",b:"#14532d"}, WARN:{c:"#fbbf24",bg:"#1c1200",b:"#78350f"}, DANGER:{c:"#f87171",bg:"#1a0808",b:"#7f1d1d"}, INFO:{c:"#60a5fa",bg:"#06122a",b:"#1e3a5f"} };
  return (
    <Page title="Notifications" sub={`${ntfs.filter(n=>!n.read).length} unread`} action={<GBtn onClick={onAll}>Mark all read</GBtn>}>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ntfs.map(n=>{const c=NC[n.type]||NC.INFO;return(
          <Card key={n.id} p="14px 18px" style={{display:"flex",gap:12,alignItems:"flex-start",borderColor:n.read?"#1e293b":c.b+"66",background:n.read?"#0b0f1c":c.bg,opacity:n.read?.75:1}}>
            <div style={{width:36,height:36,borderRadius:9,background:c.bg,border:`1px solid ${c.b}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{n.type==="SUCCESS"?"✓":n.type==="WARN"?"⏰":n.type==="DANGER"?"🔧":"📋"}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><p style={{fontSize:13,fontWeight:700,color:n.read?"#475569":"#e2e8f0"}}>{n.title}</p><span style={{fontSize:11,color:"#334155",marginLeft:"auto"}}>{n.time}</span>{!n.read&&<div style={{width:7,height:7,borderRadius:"50%",background:c.c}}/>}</div>
              <p style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{n.body}</p>
            </div>
            {!n.read&&<button onClick={()=>onOne(n.id)} style={{flexShrink:0,height:28,padding:"0 12px",border:`1px solid ${c.b}44`,borderRadius:7,background:"transparent",color:c.c,fontSize:11,fontWeight:700,cursor:"pointer"}}>Read</button>}
          </Card>
        );})}
        {!ntfs.length&&<Empty icon="🔔" msg="No notifications"/>}
      </div>
    </Page>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  USER PORTAL                                                           */
/* ══════════════════════════════════════════════════════════════════════ */
function UserPortal({ assets, bks, ntfs, onBook, onCancel, onMarkAll, onMarkOne, user, toast }) {
  const [pg, setPg] = useState("browse");
  const pend  = bks.filter(b=>b.status==="PENDING").length;
  const unread = ntfs.filter(n=>!n.read).length;
  const NAV = [
    {id:"browse",  icon:"◈", label:"Browse Assets"},
    {id:"mybks",   icon:"📋",label:"My Bookings", badge:pend},
    {id:"notifs",  icon:"🔔",label:"Notifications",badge:unread},
  ];
  return (
    <div style={{display:"flex",flex:1}}>
      <SideNav nav={NAV} active={pg} onNav={setPg} foot={<><p style={{fontSize:11,color:"#334155"}}>ID: {user.id}</p><p style={{fontSize:11,color:"#475569",marginTop:2}}>{bks.filter(b=>b.status==="APPROVED").length} approved</p></>}/>
      <main style={{flex:1,overflowY:"auto",maxHeight:"calc(100vh - 56px)"}}>
        {pg==="browse" && <UserBrowse assets={assets} onBook={onBook} toast={toast}/>}
        {pg==="mybks"  && <UserBks    bks={bks} onCancel={onCancel}/>}
        {pg==="notifs" && <NotifsPage ntfs={ntfs} onOne={onMarkOne} onAll={onMarkAll}/>}
      </main>
    </div>
  );
}

/* ─── USER BROWSE ─────────────────────────────────────────────────────── */
function UserBrowse({ assets, onBook, toast }) {
  const [search, setSrch] = useState("");
  const [fType,  setFType] = useState("ALL");
  const [fFeat,  setFFeat] = useState("ALL");
  const [modal,  setModal] = useState(null);
  const [sel,    setSel]   = useState(null);
  const [bk, setBk] = useState({date:"",from:"09:00",to:"11:00",purpose:"",qty:1});
  const [berr, setBerr] = useState("");

  const list = useMemo(() => assets.filter(a => {
    if (a.status!=="ACTIVE") return false;
    if (fType!=="ALL" && a.type!==fType) return false;
    if (fFeat==="PROJECT" && !a.features?.includes("PROJECT_AVAILABLE")) return false;
    if (fFeat==="CAMERA"  && !a.features?.includes("CAMERA_AVAILABLE"))  return false;
    const q = search.toLowerCase();
    return !q||a.name.toLowerCase().includes(q)||a.id.toLowerCase().includes(q)||a.location.toLowerCase().includes(q)||a.category.toLowerCase().includes(q);
  }), [assets,search,fType,fFeat]);

  const openBook = a => { setSel(a); setBk({date:"",from:"09:00",to:"11:00",purpose:"",qty:1}); setBerr(""); setModal("book"); };
  const openDet  = a => { setSel(a); setModal("detail"); };

  const submit = () => {
    if (!bk.date)           { setBerr("Please select a date"); return; }
    if (!bk.purpose.trim()) { setBerr("Please enter booking purpose"); return; }
    if (bk.qty<1||bk.qty>sel.available) { setBerr(`Quantity must be 1–${sel.available}`); return; }
    onBook({ assetId:sel.id, assetName:sel.name, ...bk, qty:+bk.qty });
    setModal(null);
  };

  const avPct = sel ? Math.round((sel.available/sel.capacity)*100) : 0;
  const avC   = avPct>60?"#34d399":avPct>25?"#fbbf24":"#f87171";

  return (
    <Page title="Browse Assets" sub={`${list.length} resources available`}>
      {/* Quick feature filters */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["ALL","All Resources","#475569"],["PROJECT","🔬 Project Equipped","#34d399"],["CAMERA","📷 Camera Equipped","#fbbf24"]].map(([v,l,c])=>(
          <button key={v} onClick={()=>setFFeat(v)} style={{padding:"8px 16px",borderRadius:30,border:`1px solid ${fFeat===v?c:"#1e293b"}`,background:fFeat===v?c+"22":"transparent",color:fFeat===v?c:"#475569",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{l}</button>
        ))}
      </div>
      <Card p="12px 14px" mb={14} style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <SearchBox v={search} onChange={setSrch} ph="Search labs, halls, equipment…"/>
        <Sel v={fType} onChange={setFType}><option value="ALL">All Types</option>{Object.keys(TC).map(t=><option key={t} value={t}>{TC[t].label}</option>)}</Sel>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
        {list.map(a => <AssetCard key={a.id} a={a} onDetail={()=>openDet(a)} onBook={()=>openBook(a)}/>)}
        {!list.length && <NoRes/>}
      </div>

      {modal && (
        <Overlay onClose={()=>setModal(null)}>
          {modal==="detail" && sel && <DetailSheet a={sel} onClose={()=>setModal(null)} onBook={()=>{setModal(null);openBook(sel);}}/>}
          {modal==="book" && sel && (
            <div style={{padding:"1.75rem",maxWidth:480,width:"100%"}}>
              <SHdr title="Book Asset" onClose={()=>setModal(null)}/>
              {/* asset preview with live availability */}
              <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",background:"#0b0f1c",borderRadius:12,border:"1px solid #1e293b",marginBottom:18}}>
                <img src={sel.img} alt="" style={{width:52,height:52,borderRadius:9,objectFit:"cover",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:2}}>{sel.name}</p>
                  <p style={{fontSize:12,color:"#475569",marginBottom:6}}>📍 {sel.location}</p>
                  <AvBar av={sel.available} cap={sel.capacity}/>
                  <p style={{fontSize:11,fontWeight:700,color:avC,marginTop:4}}>{sel.available} available · {sel.borrowed||0} borrowed · capacity {sel.capacity}</p>
                </div>
              </div>
              {berr && <ErrBx msg={berr}/>}
              <div style={{display:"flex",flexDirection:"column",gap:13}}>
                <FL l="Date"><input type="date" value={bk.date} min={TODAY} onChange={e=>setBk(b=>({...b,date:e.target.value}))}/></FL>
                <Grid2><FL l="From"><input type="time" value={bk.from} onChange={e=>setBk(b=>({...b,from:e.target.value}))}/></FL><FL l="To"><input type="time" value={bk.to}   onChange={e=>setBk(b=>({...b,to:e.target.value}))}/></FL></Grid2>
                <FL l="Purpose"><input value={bk.purpose} onChange={e=>setBk(b=>({...b,purpose:e.target.value}))} placeholder="e.g. Group Project Meeting"/></FL>

                {/* Quantity — all types have this */}
                <FL l={`Quantity (max ${sel.available})`}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <QBtn onClick={()=>setBk(b=>({...b,qty:Math.max(1,b.qty-1)}))}>−</QBtn>
                    <input type="number" value={bk.qty} min={1} max={sel.available} onChange={e=>setBk(b=>({...b,qty:Math.max(1,Math.min(sel.available,+e.target.value))}))} style={{textAlign:"center",fontWeight:700,fontSize:18}}/>
                    <QBtn onClick={()=>setBk(b=>({...b,qty:Math.min(sel.available,b.qty+1)}))}>+</QBtn>
                  </div>
                  {/* live decrement preview */}
                  <div style={{marginTop:10,padding:"10px 14px",background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:9}}>
                    <p style={{fontSize:11,color:"#475569",marginBottom:8}}>After this booking:</p>
                    <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                      <div style={{textAlign:"center"}}><p style={{fontSize:22,fontWeight:700,color:"#34d399"}}>{sel.available-bk.qty}</p><p style={{fontSize:10,color:"#334155"}}>will remain</p></div>
                      <div style={{width:1,height:36,background:"#1e293b"}}/>
                      <div style={{textAlign:"center"}}><p style={{fontSize:22,fontWeight:700,color:"#fbbf24"}}>{(sel.borrowed||0)+bk.qty}</p><p style={{fontSize:10,color:"#334155"}}>total borrowed</p></div>
                      <div style={{flex:1,minWidth:80}}>
                        <AvBar av={sel.available-bk.qty} cap={sel.capacity} thick/>
                        <p style={{fontSize:10,color:"#334155",marginTop:4}}>new availability</p>
                      </div>
                    </div>
                  </div>
                </FL>

                <div style={{display:"flex",gap:8}}>
                  <GBtn onClick={()=>setModal(null)}>Cancel</GBtn>
                  <BBtn onClick={submit} style={{flex:2}} disabled={sel.available<1}>{sel.available>0?"Submit Booking":"Unavailable"}</BBtn>
                </div>
              </div>
            </div>
          )}
        </Overlay>
      )}
    </Page>
  );
}

/* ─── USER BOOKINGS ───────────────────────────────────────────────────── */
function UserBks({ bks, onCancel }) {
  const [filter, setFilter] = useState("ALL");
  const list = useMemo(() => bks.filter(b=>filter==="ALL"||b.status===filter),[bks,filter]);
  const SC={APPROVED:"#34d399",PENDING:"#fbbf24",REJECTED:"#f87171",CANCELLED:"#64748b"};
  return (
    <Page title="My Bookings" sub={`${bks.filter(b=>b.status==="PENDING").length} pending · ${bks.filter(b=>b.status==="APPROVED").length} approved`}
      action={<Sel v={filter} onChange={setFilter}><option value="ALL">All</option>{["PENDING","APPROVED","REJECTED","CANCELLED"].map(s=><option key={s} value={s}>{s}</option>)}</Sel>}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {list.map(b=>{const c=SC[b.status]||"#64748b";return(
          <Card key={b.id} p="14px 18px" style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:"#60a5fa"}}>{b.id}</span>
                <Pill c={c}>{b.status}</Pill>
                <span style={{fontSize:11,color:"#334155",marginLeft:"auto"}}>Qty: {b.qty}</span>
              </div>
              <p style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>{b.assetName}</p>
              <p style={{fontSize:12,color:"#475569"}}>📅 {b.date} · {b.from}–{b.to} · {b.purpose}</p>
            </div>
            {["PENDING","APPROVED"].includes(b.status)&&<button onClick={()=>onCancel(b.id)} style={{flexShrink:0,height:32,padding:"0 14px",border:"1px solid #7f1d1d",borderRadius:8,background:"#1a0808",color:"#f87171",fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>}
          </Card>
        );})}
        {!list.length&&<Empty icon="📋" msg="No bookings yet"/>}
      </div>
    </Page>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  SHARED COMPONENTS                                                     */
/* ══════════════════════════════════════════════════════════════════════ */

/* Asset Card — used in both admin catalogue and user browse */
function AssetCard({ a, admin, onDetail, onEdit, onDelete, onBook }) {
  const m   = TC[a.type]||TC.EQUIPMENT;
  const pct = Math.round((a.available/a.capacity)*100);
  const ac  = pct>60?"#34d399":pct>25?"#fbbf24":"#f87171";
  const feat = (a.features||[]).filter(Boolean);

  return (
    <div onClick={()=>onDetail(a)} className="fadeUp"
      style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,cursor:"pointer",overflow:"hidden",display:"flex",flexDirection:"column",transition:"transform .2s,border-color .2s,box-shadow .2s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="#2d4a7a";e.currentTarget.style.boxShadow="0 8px 30px rgba(59,130,246,.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="#1e293b";e.currentTarget.style.boxShadow="none";}}>

      <div style={{position:"relative",height:155,flexShrink:0}}>
        <img src={a.img} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}
          onError={e=>{e.target.style.background="#1e293b";e.target.style.display="block";}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 35%,rgba(9,13,24,.95))"}}/>
        <div style={{position:"absolute",top:10,right:10}}>
          <Pill c={a.status==="ACTIVE"?"#34d399":"#f87171"}>{a.status==="ACTIVE"?"Active":"OOS"}</Pill>
        </div>
        {feat[0] && <div style={{position:"absolute",top:10,left:10}}><FBadge f={feat[0]}/></div>}
        <p style={{position:"absolute",bottom:8,left:12,fontSize:14,fontWeight:700,color:"#f1f5f9",textShadow:"0 1px 4px rgba(0,0,0,.8)"}}>{a.name}</p>
      </div>

      <div style={{padding:"12px 14px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
        <p style={{fontSize:11,color:"#475569"}}>📍 {a.location}</p>
        <p style={{fontSize:12,color:"#64748b",lineHeight:1.45,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.description}</p>

        {/* Availability */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:"#475569"}}>Availability</span>
            <span style={{fontSize:11,fontWeight:700,color:ac}}>{a.available}/{a.capacity}</span>
          </div>
          <AvBar av={a.available} cap={a.capacity}/>
        </div>

        {/* Amenities */}
        {(a.amenities||[]).length>0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {a.amenities.slice(0,3).map(am=><Chip key={am}>{am}</Chip>)}
            {a.amenities.length>3 && <Chip>+{a.amenities.length-3}</Chip>}
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:6,borderTop:"1px solid #1e293b",marginTop:"auto"}}>
          <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,background:m.bg,color:m.color,border:`1px solid ${m.color}33`}}>{m.icon} {m.label}</span>
          <span style={{marginLeft:"auto",fontSize:12,color:"#475569"}}>★{a.rating}</span>
        </div>

        <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
          {admin
            ? <><GBtn sm onClick={()=>onEdit(a)}>Edit</GBtn><GBtn sm danger onClick={()=>onDelete(a.id)}>Remove</GBtn></>
            : <button onClick={()=>onBook(a)} disabled={a.available<1} style={{width:"100%",height:32,border:"none",borderRadius:8,cursor:a.available>0?"pointer":"not-allowed",background:a.available>0?"#3b82f6":"#1e293b",color:a.available>0?"#fff":"#475569",fontSize:12,fontWeight:700}}>
                {a.available>0?"Book Now":"Unavailable"}
              </button>}
        </div>
      </div>
    </div>
  );
}

/* Detail Sheet */
function DetailSheet({ a, admin, onClose, onEdit, onDelete, onBook }) {
  const m   = TC[a.type]||TC.EQUIPMENT;
  const pct = Math.round((a.available/a.capacity)*100);
  const ac  = pct>60?"#34d399":pct>25?"#fbbf24":"#f87171";
  return (
    <div style={{maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{position:"relative",height:200}}>
        <img src={a.img} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.3),rgba(9,13,24,.97))"}}/>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.15)",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        <div style={{position:"absolute",bottom:14,left:18}}>
          <p style={{fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:6}}>{a.name}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:m.bg,color:m.color}}>{m.icon} {m.label}</span>
            {(a.features||[]).map(f=><FBadge key={f} f={f}/>)}
          </div>
        </div>
      </div>
      <div style={{padding:"18px 20px"}}>
        <p style={{fontSize:13,color:"#64748b",lineHeight:1.65,marginBottom:14}}>{a.description}</p>
        <div style={{background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>Current Availability</span>
            <span style={{fontSize:18,fontWeight:700,color:ac}}>{a.available} / {a.capacity}</span>
          </div>
          <AvBar av={a.available} cap={a.capacity} thick/>
          {a.borrowed>0 && <p style={{fontSize:11,color:"#fbbf24",marginTop:6}}>{a.borrowed} currently borrowed</p>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[["ID",a.id],["Location",a.location],["Rating",`★ ${a.rating}`],["Hours",`${a.availFrom}–${a.availTo}`],["Bookings",a.totalBookings],["Condition",a.condition==="GOOD"?"✓ Good":"⚠ Repair"]].map(([l,v])=>(
            <MiniCard key={l} l={l} v={v}/>
          ))}
        </div>
        {(a.amenities||[]).length>0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700,marginBottom:7}}>Amenities</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{a.amenities.map(am=><Chip key={am}>{am}</Chip>)}</div>
          </div>
        )}
        <div style={{display:"flex",gap:8}}>
          {admin
            ? <><GBtn onClick={onEdit}>Edit</GBtn><GBtn danger onClick={()=>{onDelete?.();onClose();}}>Delete</GBtn></>
            : <BBtn onClick={onBook} disabled={a.available<1} style={{flex:1}}>{a.available>0?"Book This Asset":"Unavailable"}</BBtn>}
        </div>
      </div>
    </div>
  );
}

/* ── Layout atoms ── */
const SL = {fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:12};
const KL = {fontSize:10,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8};

function Page({ title, sub, action, badge, children }) {
  return (
    <div style={{padding:"2rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.4rem"}}>
        <div>
          {badge && <div style={{marginBottom:10}}>{badge}</div>}
          <h1 style={{fontSize:26,fontWeight:700,color:"#f1f5f9",letterSpacing:"-0.02em",marginBottom:4}}>{title}</h1>
          <p style={{fontSize:14,color:"#475569"}}>{sub}</p>
        </div>
        {action && <div style={{flexShrink:0}}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function SideNav({ nav, active, onNav, foot }) {
  return (
    <div style={{width:210,flexShrink:0,background:"#0b0f1c",borderRight:"1px solid #1e293b",display:"flex",flexDirection:"column",position:"sticky",top:56,height:"calc(100vh - 56px)"}}>
      <div style={{padding:"14px 10px",flex:1,overflowY:"auto"}}>
        <p style={{fontSize:10,fontWeight:700,color:"#1e293b",letterSpacing:"0.1em",textTransform:"uppercase",padding:"0 8px",marginBottom:8}}>Menu</p>
        {nav.map(n=>{const a=active===n.id;return(
          <button key={n.id} onClick={()=>onNav(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:2,background:a?"rgba(59,130,246,.14)":"transparent",color:a?"#60a5fa":"#475569",fontWeight:a?700:400,fontSize:13,textAlign:"left",transition:"all .15s"}}>
            <span style={{fontSize:14}}>{n.icon}</span><span style={{flex:1}}>{n.label}</span>
            {n.badge>0&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,background:"#e24b4a",color:"#fff",minWidth:18,textAlign:"center"}}>{n.badge}</span>}
          </button>
        );})}
      </div>
      <div style={{padding:"12px 18px",borderTop:"1px solid #1e293b"}}>{foot}</div>
    </div>
  );
}

const Card    = ({children,p,mb,style:s={}}) => <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:p,marginBottom:mb,...s}}>{children}</div>;
const Grid2   = ({children,mb}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:mb}}>{children}</div>;
const Grid3   = ({children,mb}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:mb}}>{children}</div>;
const Grid4   = ({children,style:s={}}) => <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14,...s}}>{children}</div>;
const Overlay = ({children,onClose}) => <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:18,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.7)"}}>{children}</div></div>;
const SHdr    = ({title,onClose}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h2 style={{fontSize:18,fontWeight:700,color:"#f1f5f9"}}>{title}</h2><button onClick={onClose} style={{background:"transparent",border:"none",color:"#475569",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button></div>;
const FL      = ({l,children}) => <div><label style={{fontSize:10,fontWeight:700,color:"#334155",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.07em"}}>{l}</label>{children}</div>;
const Sel     = ({v,onChange,children,style:s={}}) => <select value={v} onChange={e=>onChange(e.target.value)} style={{height:40,border:"1px solid #1e293b",borderRadius:9,background:"#0b0f1c",color:"#e2e8f0",padding:"0 10px",fontSize:13,outline:"none",...s}}>{children}</select>;
const SearchBox = ({v,onChange,ph}) => <div style={{position:"relative",flex:"1 1 180px"}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:.3,pointerEvents:"none"}}>🔍</span><input value={v} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{paddingLeft:30}}/></div>;
const ErrBx   = ({msg}) => <div style={{background:"#1a0808",border:"1px solid #7f1d1d",borderRadius:9,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:14}}>{msg}</div>;
const Pill    = ({c,children}) => <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c+"22",color:c,border:`1px solid ${c}44`}}>{children}</span>;
const Chip    = ({children}) => <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#1e293b",color:"#64748b"}}>{children}</span>;
const FBadge  = ({f}) => { const b=FB[f]; return b?<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:b.bg,color:b.color,border:`1px solid ${b.color}33`}}>{b.label}</span>:null; };
const Dot     = () => <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:7,height:7,borderRadius:"50%",background:"#34d399",animation:"pulse 2s infinite"}}/></div>;
const IBadge  = ({children,color="#60a5fa"}) => <span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:20,background:color+"18",border:`1px solid ${color}33`,fontSize:11,fontWeight:700,color,letterSpacing:"0.04em"}}>{children}</span>;
const MiniCard= ({l,v}) => <div style={{background:"#0b0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"9px 11px"}}><p style={{fontSize:9,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700,marginBottom:3}}>{l}</p><p style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>{v}</p></div>;
const NoRes   = () => <div style={{gridColumn:"1/-1",textAlign:"center",padding:"4rem",color:"#334155"}}><p style={{fontSize:44,marginBottom:12}}>🔍</p><p>No assets match</p></div>;
const Empty   = ({icon,msg}) => <div style={{textAlign:"center",padding:"4rem",color:"#334155"}}><p style={{fontSize:44,marginBottom:12}}>{icon}</p><p>{msg}</p></div>;
const BBtn    = ({children,onClick,disabled,style:s={}}) => <button onClick={onClick} disabled={disabled} style={{height:38,padding:"0 20px",border:"none",borderRadius:10,cursor:disabled?"not-allowed":"pointer",background:disabled?"#1e293b":"#3b82f6",color:disabled?"#475569":"#fff",fontSize:13,fontWeight:700,transition:"opacity .15s",...s}} onMouseEnter={e=>!disabled&&(e.target.style.opacity=".85")} onMouseLeave={e=>(e.target.style.opacity="1")}>{children}</button>;
const GBtn    = ({children,onClick,danger,sm,style:s={}}) => <button onClick={onClick} style={{height:sm?30:36,padding:`0 ${sm?12:16}px`,border:`1px solid ${danger?"#7f1d1d":"#1e293b"}`,borderRadius:sm?7:9,background:"transparent",cursor:"pointer",color:danger?"#f87171":"#64748b",fontSize:sm?11:13,fontWeight:600,transition:"all .15s",...s}} onMouseEnter={e=>{e.currentTarget.style.background=danger?"#1a0808":"#1e293b";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>{children}</button>;
const QBtn    = ({children,onClick}) => <button onClick={onClick} style={{width:40,height:42,border:"1px solid #1e293b",borderRadius:9,background:"#0b0f1c",color:"#f1f5f9",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>{children}</button>;
const AvBar   = ({av,cap,thick}) => {const p=Math.min(100,Math.round((av/Math.max(cap,1))*100));const c=p>60?"#34d399":p>25?"#fbbf24":"#f87171";return<div style={{height:thick?8:5,borderRadius:thick?4:3,background:"#1e293b",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:c,borderRadius:thick?4:3,transition:"width .5s"}}/></div>;};
