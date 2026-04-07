import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const regionId = 'qr-reader-region'
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function startScanner() {
      try {
        const scanner = new Html5Qrcode(regionId)
        scannerRef.current = scanner

        const devices = await Html5Qrcode.getCameras()
        if (!devices || devices.length === 0) {
          setError('No camera found on this device.')
          return
        }

        const preferredCamera =
          devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0]

        await scanner.start(
          preferredCamera.id,
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!mounted) return
            onScan(decodedText)
          },
          () => {
            // Ignore frame-level decode errors while camera is searching.
          }
        )
      } catch (err) {
        console.error(err)
        setError('Could not start camera. Please allow camera permission.')
      }
    }

    startScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>Scan QR Code</h3>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div id={regionId} style={{ width: '100%' }} />

        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
}

const modalStyle = {
  width: 380,
  maxWidth: '100%',
  background: '#0f172a',
  color: '#e2e8f0',
  borderRadius: 16,
  padding: 16,
  border: '1px solid #1e293b',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
}

const closeButtonStyle = {
  border: '1px solid #334155',
  background: 'transparent',
  color: '#e2e8f0',
  borderRadius: 10,
  padding: '8px 10px',
  cursor: 'pointer',
}

const errorStyle = {
  marginTop: 12,
  color: '#fca5a5',
  fontSize: 14,
}
