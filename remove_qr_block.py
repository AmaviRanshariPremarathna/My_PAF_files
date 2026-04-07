from pathlib import Path
path = Path(r'c:\Users\Admin\Documents\PAF Spring Boot files\smartcampus\smartcampus\frontend\src\App.jsx')
text = path.read_text(encoding='utf-8')
start_marker = '/* ─── QR PAGE — generates real QR for EVERY asset ─────────────────────── */'
end_marker = '/* ─── ISSUES ──────────────────────────────────────────────────────────── */'
start = text.find(start_marker)
end = text.find(end_marker, start)
print('start', start, 'end', end)
if start == -1 or end == -1:
    raise SystemExit('Marker missing')
new_text = text[:start] + text[end:]
path.write_text(new_text, encoding='utf-8')
print('removed old QRPage block')
