'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Archive, ArrowLeft, ArrowRight, Building2, Check, ChevronDown,
  CircleHelp, Download, ExternalLink, FileClock, LayoutDashboard, LogOut,
  MapPin, Menu, Package, Pencil, Plus, QrCode, RefreshCw, Search,
  ShieldCheck, Tags, Trash2, Users, Wrench, X,
} from 'lucide-react';
import { api, downloadXlsx, refreshSession, setAccessToken } from '../lib/api';

const CONDITIONS = ['Baik', 'Rusak', 'Perbaikan', 'Upgrade', 'DiPerbaiki'];
const CONDITION_COLORS = { Baik: 'green', Rusak: 'red', Perbaikan: 'amber', Upgrade: 'blue', DiPerbaiki: 'violet' };
const NAV = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'assets', label: 'Daftar aset', icon: Package },
  { id: 'locations', label: 'Lokasi', icon: MapPin },
  { id: 'types', label: 'Jenis aset', icon: Tags },
  { id: 'history', label: 'Riwayat', icon: FileClock },
  { id: 'users', label: 'Pengguna', icon: Users, adminOnly: true },
];
const fmtDate = (date) => date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) : '—';
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast ${toast.type || 'success'}`} role="status"><span className="toast-mark">{toast.type === 'error' ? <X size={16}/> : <Check size={16}/>}</span><span>{toast.message}</span><button onClick={onClose} aria-label="Tutup notifikasi"><X size={15}/></button></div>;
}

function AuthScreen({ onAuthenticated, notify }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const change = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const response = await api(path, { method: 'POST', body: JSON.stringify(form) });
      setAccessToken(response.data.accessToken);
      onAuthenticated(response.data.user);
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout">
    <section className="auth-aside">
      <div className="brand large"><span className="brand-symbol"><Package size={23}/></span><span>ruang<span className="brand-light">aset</span></span></div>
      <div className="auth-pitch"><span className="eyebrow"><ShieldCheck size={14}/> SISTEM INVENTARIS TERPADU</span><h1>Semua aset.<br/><em>Satu kendali.</em></h1><p>Catat lokasi, pantau kondisi, dan ketahui riwayat setiap aset di seluruh fasilitas Anda.</p><div className="auth-points"><div><Check size={16}/> Data tersimpan terpusat</div><div><Check size={16}/> Jejak perubahan aset</div><div><Check size={16}/> Kontrol akses per peran</div></div></div>
      <div className="auth-foot">Managemnet Aset IT · Platform manajemen fasilitas</div>
    </section>
    <section className="auth-form-side"><div className="auth-form-wrap"><div className="mobile-brand brand"><span className="brand-symbol"><Package size={21}/></span><span>ruang<span className="brand-light">aset</span></span></div><span className="eyebrow muted">SELAMAT DATANG</span><h2>{mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun RuangAset'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Masukkan kredensial untuk membuka ruang kerja.' : 'Akun baru mendapat peran viewer sampai admin memberikan akses tambahan.'}</p>
      <form onSubmit={submit} className="form-stack">{mode === 'register' && <label>Nama lengkap<input name="name" autoComplete="name" required minLength={2} maxLength={120} value={form.name} onChange={change} placeholder="Nama Anda"/></label>}<label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} value={form.email} onChange={change} placeholder="nama@perusahaan.id"/></label><label>Password<input type="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={72} value={form.password} onChange={change} placeholder={mode === 'login' ? 'Password Anda' : 'Minimal 12 karakter'}/>{mode === 'register' && <small>Gunakan setidaknya 12 karakter.</small>}</label><button className="btn primary full" type="submit" disabled={busy}>{busy ? <span className="spinner"/> : null}{mode === 'login' ? 'Masuk' : 'Daftar akun'} <ArrowRight size={17}/></button></form>
      <p className="auth-switch">{mode === 'login' ? 'Belum memiliki akun?' : 'Sudah punya akun?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Daftar' : 'Masuk'}</button></p><p className="auth-privacy"><ShieldCheck size={14}/> Sesi dilindungi token bertanda tangan dan cookie HttpOnly.</p></div></section>
  </main>;
}

function Modal({ modal, onClose, children }) {
  useEffect(() => {
    if (!modal) return;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('has-modal');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('has-modal'); };
  }, [modal, onClose]);
  if (!modal) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><span className="eyebrow muted">PENGELOLAAN DATA</span><h2 id="modal-title">{modal.title}</h2><p>{modal.subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19}/></button></header>{children}</section></div>;
}

function EmptyState({ icon: Icon = Archive, title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={25}/></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ConditionPill({ condition }) {
  return <span className={`condition-pill ${CONDITION_COLORS[condition] || 'gray'}`}><span/>{condition || '—'}</span>;
}

function PublicAssets({ locationId }) {
  const [payload, setPayload] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api(`/assets/public/${encodeURIComponent(locationId)}`).then((res) => setPayload(res.data)).catch((err) => setError(err.message)); }, [locationId]);
  return <main className="public-layout"><header className="public-header"><div className="brand"><span className="brand-symbol"><Package size={21}/></span><span>ruang<span className="brand-light">aset</span></span></div><span className="public-badge"><span/> Daftar publik</span></header><section className="public-intro"><div className="eyebrow muted"><MapPin size={14}/> INVENTARIS LOKASI</div><h1>{payload?.location?.name || (error ? 'Tautan tidak tersedia' : 'Memuat inventaris…')}</h1><p>{payload?.location?.address || 'Daftar aset yang telah dibagikan oleh pengelola.'}</p></section>{error ? <div className="public-error"><ShieldCheck size={26}/><h2>Tidak dapat menampilkan lokasi</h2><p>{error}</p></div> : !payload ? <div className="loading-screen"><span className="spinner dark"/> Memuat data lokasi…</div> : <section className="public-table-wrap"><div className="section-head"><div><h2>Daftar aset</h2><p>{payload.items.length} aset ditampilkan · Informasi terbatas untuk akses publik</p></div><span className="public-code">{payload.location.code}</span></div><div className="table-scroll"><table><thead><tr><th>ID QR</th><th>Nama aset</th><th>Jenis</th><th>Kondisi</th><th>Diperbarui</th></tr></thead><tbody>{payload.items.map((item) => <tr key={item.id}><td><span className="mono">{item.qrId}</span></td><td className="strong-cell">{item.name}</td><td>{item.type}</td><td><ConditionPill condition={item.condition}/></td><td>{fmtDate(item.updatedAt)}</td></tr>)}</tbody></table>{payload.items.length === 0 && <EmptyState icon={Package} title="Belum ada aset" text="Belum ada aset yang tercatat di lokasi ini."/>}</div></section>}<footer className="public-footer">RuangAset · Informasi aset dipublikasikan terbatas oleh pengelola lokasi.</footer></main>;
}

function QRScanner({ onResult, onCancel }) {
  const videoRef = useRef(null);
  const resultRef = useRef(onResult);
  const [note, setNote] = useState('Menghubungkan ke kamera…');
  const [manual, setManual] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState(true);
  useEffect(() => { resultRef.current = onResult; }, [onResult]);
  useEffect(() => {
    let stream; let timer; let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraAvailable(false); setNote('Browser ini tidak mendukung akses kamera. Masukkan ID QR secara manual.'); return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        if (!('BarcodeDetector' in window)) {
          setNote('Kamera aktif, tetapi deteksi QR bawaan tidak didukung browser ini. Gunakan ID QR manual.'); return;
        }
        let detector;
        try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); }
        catch { setNote('Deteksi QR tidak tersedia. Masukkan ID QR secara manual.'); return; }
        setNote('Arahkan kode QR ke dalam bingkai kamera.');
        const scan = async () => {
          if (cancelled || !videoRef.current?.isConnected) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) { resultRef.current(codes[0].rawValue); return; }
          } catch {}
          timer = setTimeout(scan, 200);
        };
        scan();
      } catch {
        setCameraAvailable(false); setNote('Kamera tidak dapat diakses. Izinkan akses atau masukkan ID QR manual.');
      }
    }
    start();
    return () => { cancelled = true; clearTimeout(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  return <div className="modal-body scanner-modal-body"><div className={`scanner-preview ${cameraAvailable ? '' : 'camera-unavailable'}`}><video ref={videoRef} playsInline muted/><div className="scanner-corners"><i/><i/><i/><i/></div>{!cameraAvailable && <span className="camera-placeholder"><QrCode size={34}/></span>}</div><p className="scanner-note">{note}</p><form className="scanner-manual" onSubmit={(event) => { event.preventDefault(); onResult(manual); }}><label>Kode QR / ID aset<input autoFocus value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Contoh: RA-IT-001" autoComplete="off"/></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={onCancel}>Tutup</button><button type="submit" className="btn primary" disabled={!manual.trim()}><Search size={15}/> Cari aset</button></div></form></div>;
}

function AssetForm({ modal, locations, types, saving, onCancel, onSubmit }) {
  const item = modal.item || {};
  const paramsText = Object.entries(item.manualParams || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
  return <form className="modal-body" onSubmit={onSubmit}><div className="form-grid"><label className="span-two">Nama aset<input name="name" required minLength={2} maxLength={180} defaultValue={item.name || ''} placeholder="Contoh: Laptop Lenovo ThinkPad"/></label><label>ID QR<input name="qrId" required minLength={2} maxLength={100} defaultValue={item.qrId || ''} placeholder="RA-IT-001"/><small>Gunakan kode unik yang tercetak pada label aset.</small></label><label>Kondisi<select name="condition" defaultValue={item.condition || 'Baik'}>{CONDITIONS.map((cond) => <option key={cond}>{cond}</option>)}</select></label><label>Jenis aset<select name="typeId" required defaultValue={item.type?._id || item.type || ''}><option value="">Pilih jenis aset</option>{types.map((type) => <option key={type._id} value={type._id}>{type.name} ({type.code})</option>)}</select>{types.length === 0 && <small>Buat jenis aset dahulu.</small>}</label><label>Lokasi<select name="locationId" required defaultValue={item.location?._id || item.location || ''}><option value="">Pilih lokasi</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}</select>{locations.length === 0 && <small>Buat lokasi dahulu.</small>}</label><label className="span-two">Parameter manual<textarea name="manualParams" rows={4} defaultValue={paramsText} placeholder={'RAM: 16 GB\nProsesor: Intel Core i7'}/><small>Satu parameter per baris dengan format <span className="mono">Nama: nilai</span>.</small></label><label className="span-two">Catatan<textarea name="notes" rows={2} maxLength={2000} defaultValue={item.notes || ''} placeholder="Catatan kondisi, garansi, atau informasi tambahan"/></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onCancel}>Batal</button><button className="btn primary" type="submit" disabled={saving || !types.length || !locations.length}>{saving ? <span className="spinner"/> : <Check size={16}/>} {item._id ? 'Simpan perubahan' : 'Simpan aset'}</button></div></form>;
}

function SimpleEntityForm({ modal, saving, onCancel, onSubmit }) {
  const item = modal.item || {};
  return <form className="modal-body" onSubmit={onSubmit}><div className="form-grid"><label className="span-two">Nama {modal.kind === 'location' ? 'lokasi' : 'jenis aset'}<input name="name" required minLength={2} maxLength={modal.kind === 'location' ? 120 : 100} defaultValue={item.name || ''} placeholder={modal.kind === 'location' ? 'Contoh: Ruang Rapat Utama' : 'Contoh: Perangkat Jaringan'}/></label><label>Kode unik<input name="code" required minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" defaultValue={item.code || ''} placeholder={modal.kind === 'location' ? 'RAPAT-01' : 'JARINGAN'}/><small>Huruf, angka, tanda hubung, atau garis bawah.</small></label>{modal.kind === 'location' && <label>Alamat / area<input name="address" maxLength={240} defaultValue={item.address || ''} placeholder="Gedung A, lantai 2"/></label>}<label className="span-two">Deskripsi<textarea name="description" rows={3} maxLength={500} defaultValue={item.description || ''} placeholder="Keterangan tambahan (opsional)"/></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onCancel}>Batal</button><button className="btn primary" type="submit" disabled={saving}>{saving ? <span className="spinner"/> : <Check size={16}/>} {item._id ? 'Simpan perubahan' : 'Tambah'}</button></div></form>;
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [publicId, setPublicId] = useState('');
  const [page, setPage] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [locations, setLocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ q: '', condition: '', locationId: '', typeId: '' });
  const [assetPage, setAssetPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [detailHistory, setDetailHistory] = useState([]);
  const [historyAsset, setHistoryAsset] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('');

  const notify = useCallback((message, type = 'success') => setToast({ message, type, id: Date.now() }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const canWrite = user && ['admin', 'staff'].includes(user.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('public');
    if (id) { setPublicId(id); setAuthLoading(false); return; }
    refreshSession().then((session) => {
      if (session?.user) setUser(session.user);
    }).finally(() => setAuthLoading(false));
  }, []);

  const loadCore = useCallback(async () => {
    if (!user) return;
    try {
      const [statsRes, locRes, typeRes, historyRes, usersRes] = await Promise.all([
        api('/dashboard/stats'), api('/locations?limit=200'), api('/asset-types?limit=200'), api('/assets/history?limit=100'),
        user.role === 'admin' ? api('/users?limit=200') : Promise.resolve({ data: { items: [] } }),
      ]);
      setStats(statsRes.data);
      setLocations(locRes.data.items || []);
      setTypes(typeRes.data.items || []);
      setHistory(historyRes.data.items || []);
      setUsers(usersRes.data.items || []);
    } catch (error) { if (error.status === 401) { setAccessToken(null); setUser(null); } else notify(error.message, 'error'); }
  }, [user, notify]);
  useEffect(() => { loadCore(); }, [loadCore]);

  const loadAssets = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ limit: '100', page: String(assetPage), sort: 'updatedAt' });
      if (filter.q.trim()) params.set('q', filter.q.trim());
      if (filter.condition) params.set('condition', filter.condition);
      if (filter.locationId) params.set('locationId', filter.locationId);
      if (filter.typeId) params.set('typeId', filter.typeId);
      const response = await api(`/assets?${params.toString()}`);
      setAssets(response.data.items || []); setTotalAssets(response.data.total || 0);
    } catch (error) { if (error.status === 401) { setAccessToken(null); setUser(null); } else notify(error.message, 'error'); }
    finally { setBusy(false); }
  }, [user, filter, assetPage, notify]);
  useEffect(() => { const timer = setTimeout(loadAssets, 200); return () => clearTimeout(timer); }, [loadAssets]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCore(), loadAssets()]);
  }, [loadCore, loadAssets]);

  async function authenticated(userInfo) {
    setUser(userInfo); setPage('dashboard'); setFilter({ q: '', condition: '', locationId: '', typeId: '' }); setAssetPage(1);
  }
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    setAccessToken(null); setUser(null); setStats(null); setAssets([]); setLocations([]); setTypes([]); setHistory([]); setUsers([]);
  }
  function navigate(nextPage) { setPage(nextPage); setMobileNav(false); setModal(null); }

  async function saveEntity(event) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      let payload; let route;
      if (modal.kind === 'asset') {
        const manualParams = {};
        const lines = String(form.get('manualParams') || '').split(/\r?\n/);
        for (const line of lines) {
          const separator = line.indexOf(':');
          if (separator > 0) {
            const key = line.slice(0, separator).trim(); const value = line.slice(separator + 1).trim();
            if (key && value) manualParams[key] = value;
          }
        }
        payload = {
          qrId: form.get('qrId'), name: form.get('name'), typeId: form.get('typeId'), locationId: form.get('locationId'),
          condition: form.get('condition'), manualParams, notes: form.get('notes'),
        };
        route = modal.item?._id ? `/assets/${modal.item._id}` : '/assets';
      } else {
        payload = { name: form.get('name'), code: form.get('code'), description: form.get('description') };
        if (modal.kind === 'location') payload.address = form.get('address');
        route = modal.kind === 'location' ? '/locations' : '/asset-types';
        if (modal.item?._id) route += `/${modal.item._id}`;
      }
      const response = await api(route, { method: modal.item?._id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setModal(null);
      notify(modal.item?._id ? 'Perubahan berhasil disimpan.' : 'Data baru berhasil ditambahkan.');
      await refreshAll();
      if (modal.kind === 'asset' && response.data?.item) setHistoryAsset(response.data.item);
    } catch (error) { notify(error.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteEntity(kind, item) {
    const label = kind === 'location' ? 'lokasi' : kind === 'type' ? 'jenis aset' : 'aset';
    if (!window.confirm(`Hapus ${label} “${item.name}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const route = kind === 'location' ? '/locations' : kind === 'type' ? '/asset-types' : '/assets';
      await api(`${route}/${item._id}`, { method: 'DELETE' });
      notify(`${label[0].toUpperCase() + label.slice(1)} berhasil dihapus.`);
      await refreshAll();
    } catch (error) { notify(error.message, 'error'); }
  }

  async function togglePublic(location) {
    try {
      const result = await api(`/locations/${location._id}`, { method: 'PATCH', body: JSON.stringify({ publicEnabled: !location.publicEnabled }) });
      setLocations((old) => old.map((entry) => entry._id === location._id ? result.data.item : entry));
      if (!location.publicEnabled) {
        const url = `${window.location.origin}/?public=${encodeURIComponent(location._id)}`;
        try { await navigator.clipboard.writeText(url); notify('Tautan publik diaktifkan dan disalin.'); }
        catch { notify('Tautan publik diaktifkan. Gunakan tombol Buka tautan untuk menyalin alamat.'); }
      } else notify('Tautan publik dinonaktifkan.');
    } catch (error) { notify(error.message, 'error'); }
  }

  async function copyPublic(location) {
    const url = `${window.location.origin}/?public=${encodeURIComponent(location._id)}`;
    try { await navigator.clipboard.writeText(url); notify('Tautan publik disalin.'); }
    catch { window.prompt('Salin tautan publik berikut:', url); }
  }

  async function showAssetHistory(asset) {
    try {
      const response = await api(`/assets/${asset._id}/history`);
      setHistoryAsset(asset); setDetailHistory(response.data.items || []);
      setModal({ kind: 'asset-history', title: 'Riwayat aset', subtitle: `${asset.name} · ${asset.qrId}`, item: asset });
    } catch (error) { notify(error.message, 'error'); }
  }

  async function lookupQr(value) {
    const qr = String(value || '').trim();
    if (!qr) { notify('Masukkan kode QR terlebih dahulu.', 'error'); return; }
    try {
      const response = await api(`/assets?q=${encodeURIComponent(qr)}&limit=200`);
      const item = (response.data.items || []).find((asset) => asset.qrId?.toLowerCase() === qr.toLowerCase() || asset._id?.toLowerCase() === qr.toLowerCase());
      if (!item) { notify(`Aset dengan kode “${qr}” tidak ditemukan.`, 'error'); return; }
      setModal(null);
      await showAssetHistory(item);
    } catch (error) { notify(error.message, 'error'); }
  }

  async function exportAssets() {
    try { await downloadXlsx('/assets/export.xlsx'); notify('Laporan Excel berhasil diunduh.'); }
    catch (error) { notify(error.message, 'error'); }
  }

  const pageTitle = NAV.find((entry) => entry.id === page)?.label || 'Ringkasan';
  const brokenCount = (stats?.byCondition?.Rusak || 0) + (stats?.byCondition?.Perbaikan || 0) + (stats?.byCondition?.DiPerbaiki || 0);

  if (publicId) return <><PublicAssets locationId={publicId}/><Toast toast={toast} onClose={closeToast}/></>;
  if (authLoading) return <div className="loading-screen"><span className="spinner dark"/> Mengamankan sesi Anda…</div>;
  if (!user) return <><AuthScreen onAuthenticated={authenticated} notify={notify}/><Toast toast={toast} onClose={closeToast}/></>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand"><span className="brand-symbol"><Package size={21}/></span><span>ruang<span className="brand-light">aset</span></span></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Tutup navigasi"><X size={19}/></button></div>
      <div className="workspace-label">RUANG KERJA</div><nav className="main-nav">{NAV.filter((entry) => !entry.adminOnly || isAdmin).map((entry) => { const Icon = entry.icon; return <button key={entry.id} className={`nav-item ${page === entry.id ? 'active' : ''}`} onClick={() => navigate(entry.id)}><Icon size={18}/><span>{entry.label}</span>{entry.id === 'assets' && <span className="nav-count">{stats?.totalAssets ?? '–'}</span>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon"><CircleHelp size={17}/></span><div><strong>Butuh bantuan?</strong><span>Kelola aset lebih mudah.</span></div></div><div className="sidebar-user"><span className="avatar">{initials(user.name)}</span><div className="user-info"><strong>{user.name}</strong><span>{user.role === 'admin' ? 'Administrator' : user.role === 'staff' ? 'Staff operasional' : 'Viewer'}</span></div><button className="icon-button logout-button" title="Keluar" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)}/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Buka navigasi"><Menu size={20}/></button><div className="breadcrumb"><span>RuangAset</span><span className="breadcrumb-sep">/</span><strong>{pageTitle}</strong></div></div><div className="topbar-right"><span className="system-status"><span/> Terhubung ke workspace</span><button className="icon-button" title="Muat ulang data" onClick={() => refreshAll()}><RefreshCw size={17}/></button><div className="topbar-profile"><span className="avatar small">{initials(user.name)}</span><div><strong>{user.name}</strong><span>{user.role}</span></div><ChevronDown size={15}/></div></div></header>
      <div className="page-content">
        {page === 'dashboard' && <Dashboard stats={stats} assets={assets} locations={locations} history={history} brokenCount={brokenCount} canWrite={canWrite} onNavigate={navigate} onAdd={() => setModal({ kind: 'asset', title: 'Tambah aset baru', subtitle: 'Lengkapi identitas dan lokasi aset.', item: null })} onDetails={showAssetHistory}/>}
        {page === 'assets' && <AssetsPage assets={assets} total={totalAssets} locations={locations} types={types} filter={filter} setFilter={(updater) => { setFilter(updater); setAssetPage(1); }} assetPage={assetPage} setAssetPage={setAssetPage} busy={busy} canWrite={canWrite} isAdmin={isAdmin} onAdd={() => setModal({ kind: 'asset', title: 'Tambah aset baru', subtitle: 'Lengkapi identitas dan lokasi aset.', item: null })} onEdit={(item) => setModal({ kind: 'asset', title: 'Edit aset', subtitle: 'Perbarui data inventaris dan simpan perubahan.', item })} onDelete={(item) => deleteEntity('asset', item)} onHistory={showAssetHistory} onExport={exportAssets} onScan={() => setModal({ kind: 'scanner', title: 'Scan kode QR', subtitle: 'Arahkan kamera ke label aset atau masukkan ID QR secara manual.' })}/>}
        {page === 'locations' && <LocationsPage locations={locations} canWrite={canWrite} isAdmin={isAdmin} onAdd={() => setModal({ kind: 'location', title: 'Tambah lokasi', subtitle: 'Daftarkan gedung, ruangan, atau area penyimpanan.', item: null })} onEdit={(item) => setModal({ kind: 'location', title: 'Edit lokasi', subtitle: 'Perbarui informasi lokasi.', item })} onDelete={(item) => deleteEntity('location', item)} onTogglePublic={togglePublic} onCopyPublic={copyPublic} onViewAssets={(id) => { setFilter((old) => ({ ...old, locationId: id })); setAssetPage(1); navigate('assets'); }}/>} 
        {page === 'types' && <TypesPage types={types} typeStats={stats?.byType || []} canWrite={canWrite} isAdmin={isAdmin} onAdd={() => setModal({ kind: 'type', title: 'Tambah jenis aset', subtitle: 'Kelompokkan aset supaya inventaris konsisten.', item: null })} onEdit={(item) => setModal({ kind: 'type', title: 'Edit jenis aset', subtitle: 'Perbarui nama atau kode jenis.', item })} onDelete={(item) => deleteEntity('type', item)}/>}
        {page === 'history' && <HistoryPage history={history} filter={historyFilter} setFilter={setHistoryFilter}/>}
        {page === 'users' && isAdmin && <UsersPage users={users} onUpdate={async (item, changes) => { try { const result = await api(`/users/${item._id || item.id}`, { method: 'PATCH', body: JSON.stringify(changes) }); setUsers((old) => old.map((user) => (user._id || user.id) === (item._id || item.id) ? { ...user, ...result.data.item } : user)); notify('Akses pengguna berhasil diperbarui.'); } catch (error) { notify(error.message, 'error'); } }}/>}
      </div><footer className="app-footer"><span>© {new Date().getFullYear()} RuangAset</span><span><ShieldCheck size={13}/> Data operasional · akses sesuai peran</span></footer>
    </main>
    <Modal modal={modal} onClose={() => setModal(null)}>
      {modal?.kind === 'scanner' && <QRScanner onResult={lookupQr} onCancel={() => setModal(null)}/>}
      {modal?.kind === 'asset' && <AssetForm modal={modal} locations={locations} types={types} saving={saving} onCancel={() => setModal(null)} onSubmit={saveEntity}/>}
      {(modal?.kind === 'location' || modal?.kind === 'type') && <SimpleEntityForm modal={modal} saving={saving} onCancel={() => setModal(null)} onSubmit={saveEntity}/>}
      {modal?.kind === 'asset-history' && <div className="modal-body"><div className="history-detail-head"><span className="asset-symbol"><Package size={21}/></span><div><strong>{historyAsset?.name}</strong><span className="mono">{historyAsset?.qrId}</span></div><ConditionPill condition={historyAsset?.condition}/></div>{detailHistory.length ? <div className="timeline">{detailHistory.map((item) => <div className="timeline-item" key={item._id}><span className="timeline-dot"/><div><div className="timeline-title">{changeLabel(item.changeType)}</div><p>{displayChange(item.oldValue)} <ArrowRight size={13}/> <strong>{displayChange(item.newValue)}</strong></p><small>{fmtDate(item.createdAt)} · {item.changedBy?.name || 'Sistem'}</small></div></div>)}</div> : <EmptyState icon={FileClock} title="Belum ada riwayat" text="Perubahan aset akan tercatat di sini."/>}<div className="modal-actions"><button className="btn secondary" onClick={() => setModal(null)}>Tutup</button></div></div>}
    </Modal>
    <Toast toast={toast} onClose={closeToast}/>
  </div>;
}

function changeLabel(type) { return ({ create: 'Aset dibuat', delete: 'Aset dihapus', name: 'Nama aset diubah', type: 'Jenis aset diubah', location: 'Lokasi dipindahkan', condition: 'Kondisi diubah', manualParams: 'Parameter manual diubah', notes: 'Catatan diperbarui' })[type] || type; }
function displayChange(value) { if (value === null || value === undefined || value === '') return '—'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }

function Dashboard({ stats, assets, locations, history, brokenCount, canWrite, onNavigate, onAdd, onDetails }) {
  if (!stats) return <div className="content-loading"><span className="spinner dark"/> Memuat ringkasan dari database…</div>;
  const statCards = [
    { label: 'Total aset tercatat', value: stats.totalAssets, foot: 'Semua aset dalam inventaris', icon: Package, tone: 'mint' },
    { label: 'Lokasi terdaftar', value: stats.totalLocations, foot: 'Area penyimpanan & ruangan', icon: MapPin, tone: 'blue' },
    { label: 'Jenis aset', value: stats.totalTypes, foot: 'Kategori inventaris aktif', icon: Tags, tone: 'violet' },
    { label: 'Perlu perhatian', value: brokenCount, foot: 'Rusak atau sedang perbaikan', icon: Wrench, tone: 'amber' },
  ];
  const conditions = Object.entries(stats.byCondition || {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const maxCondition = Math.max(1, ...conditions.map(([, count]) => count));
  return <><PageHeading eyebrow="GAMBARAN INVENTARIS" title="Ringkasan aset" subtitle="Pantau kondisi aset, cakupan lokasi, dan aktivitas terbaru." action={canWrite && <button className="btn primary" onClick={onAdd}><Plus size={17}/> Tambah aset</button>}/><div className="stats-grid">{statCards.map((item) => { const Icon = item.icon; return <article className="stat-card" key={item.label}><div className={`stat-icon ${item.tone}`}><Icon size={19}/></div><div className="stat-label">{item.label}</div><div className="stat-value">{item.value.toLocaleString('id-ID')}</div><div className="stat-foot">{item.foot}</div></article>; })}</div><div className="dashboard-grid"><section className="panel condition-panel"><div className="panel-heading"><div><h2>Kondisi aset</h2><p>Distribusi berdasarkan status terkini</p></div><span className="panel-icon"><Activity size={18}/></span></div>{conditions.length ? <div className="condition-bars">{conditions.map(([condition, count]) => <div className="condition-row" key={condition}><div className="condition-row-label"><span>{condition}</span><strong>{count}</strong></div><div className="bar-track"><span className={`bar-fill ${CONDITION_COLORS[condition] || 'green'}`} style={{ width: `${count / maxCondition * 100}%` }}/></div></div>)}</div> : <EmptyState icon={Package} title="Belum ada aset" text="Tambahkan aset untuk melihat distribusi kondisi."/>}<button className="text-link" onClick={() => onNavigate('assets')}>Lihat daftar aset <ArrowRight size={15}/></button></section><section className="panel locations-panel"><div className="panel-heading"><div><h2>Lokasi dengan aset</h2><p>Area yang memiliki inventaris terbanyak</p></div><button className="text-link" onClick={() => onNavigate('locations')}>Semua <ArrowRight size={14}/></button></div>{stats.byLocation?.length ? <div className="ranking-list">{stats.byLocation.map((loc, idx) => <button className="ranking-row" key={loc.name} onClick={() => onNavigate('locations')}><span className={`rank-number ${idx === 0 ? 'top' : ''}`}>{String(idx + 1).padStart(2, '0')}</span><span className="rank-location"><strong>{loc.name}</strong><small>Lokasi inventaris</small></span><span className="rank-count">{loc.count}<small> aset</small></span><ArrowRight className="rank-arrow" size={14}/></button>)}</div> : <EmptyState icon={MapPin} title="Belum ada lokasi" text="Tambahkan lokasi sebelum mencatat aset." action={<button className="btn secondary small" onClick={() => onNavigate('locations')}>Kelola lokasi</button>}/>}</section></div><section className="panel latest-panel"><div className="panel-heading"><div><h2>Aktivitas terkini</h2><p>Perubahan data terbaru yang tercatat di database</p></div><button className="text-link" onClick={() => onNavigate('history')}>Lihat riwayat <ArrowRight size={14}/></button></div>{history.length ? <div className="activity-table">{history.slice(0, 5).map((item) => <button className="activity-row" key={item._id} onClick={() => item.assetId?._id && onDetails(item.assetId)} disabled={!item.assetId?._id}><span className="activity-marker"><FileClock size={16}/></span><span className="activity-main"><strong>{item.assetName || item.assetId?.name || 'Aset'}</strong><small>{changeLabel(item.changeType)} · {item.changedBy?.name || 'Sistem'}</small></span><span className="activity-date">{fmtDate(item.createdAt)}</span><ArrowRight className="activity-arrow" size={15}/></button>)}</div> : <EmptyState icon={FileClock} title="Belum ada aktivitas" text="Aktivitas akan tercatat saat aset dibuat atau diubah."/>}</section><div className="dashboard-bottom-note"><ShieldCheck size={15}/><span>Ringkasan ini langsung diambil dari database. Tidak menggunakan data contoh.</span><span className="server-tag"><span/> MongoDB</span></div></>;
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><span className="eyebrow muted">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-actions">{action}</div>}</div>;
}

function AssetsPage({ assets, total, locations, types, filter, setFilter, assetPage, setAssetPage, busy, canWrite, isAdmin, onAdd, onEdit, onDelete, onHistory, onExport, onScan }) {
  return <><PageHeading eyebrow="DATA INVENTARIS" title="Daftar aset" subtitle="Kelola identitas aset, kondisi terkini, dan penempatannya." action={<><button className="btn secondary" onClick={onScan}><QrCode size={16}/> Scan QR</button><button className="btn secondary" onClick={onExport}><Download size={16}/> Ekspor Excel</button>{canWrite && <button className="btn primary" onClick={onAdd}><Plus size={17}/> Tambah aset</button>}</>}/><section className="panel table-panel"><div className="table-toolbar"><div className="search-input"><Search size={17}/><input value={filter.q} onChange={(e) => setFilter((old) => ({ ...old, q: e.target.value }))} placeholder="Cari nama aset atau ID QR…" aria-label="Cari aset"/><kbd>⌕</kbd></div><div className="filter-controls"><select aria-label="Filter lokasi" value={filter.locationId} onChange={(e) => setFilter((old) => ({ ...old, locationId: e.target.value }))}><option value="">Semua lokasi</option>{locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}</select><select aria-label="Filter jenis" value={filter.typeId} onChange={(e) => setFilter((old) => ({ ...old, typeId: e.target.value }))}><option value="">Semua jenis</option>{types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select><select aria-label="Filter kondisi" value={filter.condition} onChange={(e) => setFilter((old) => ({ ...old, condition: e.target.value }))}><option value="">Semua kondisi</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div></div><div className="table-caption"><span>{busy ? 'Memperbarui hasil…' : <>Menampilkan <strong>{assets.length}</strong> dari <strong>{total}</strong> aset hasil pencarian</>}</span><span><span className="live-dot"/> Data tersinkron melalui API</span></div><div className="table-scroll"><table><thead><tr><th>Nama aset</th><th>ID QR</th><th>Jenis aset</th><th>Lokasi</th><th>Kondisi</th><th>Diperbarui</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{assets.map((asset) => <tr key={asset._id}><td><button className="asset-name-cell" onClick={() => onHistory(asset)}><span className="asset-symbol"><Package size={17}/></span><span><strong>{asset.name}</strong><small>{asset.notes || 'Tidak ada catatan'}</small></span></button></td><td><span className="mono">{asset.qrId}</span></td><td>{asset.type?.name || '—'}</td><td><span className="table-location"><MapPin size={13}/>{asset.location?.name || '—'}</span></td><td><ConditionPill condition={asset.condition}/></td><td className="date-cell">{fmtDate(asset.updatedAt)}</td><td><div className="row-actions">{canWrite && <button className="icon-button" title="Edit aset" onClick={() => onEdit(asset)}><Pencil size={15}/></button>}{isAdmin && <button className="icon-button danger-hover" title="Hapus aset" onClick={() => onDelete(asset)}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table>{!assets.length && <EmptyState icon={Package} title="Tidak ada aset ditemukan" text={total ? 'Coba ubah pencarian atau filter Anda.' : 'Tambahkan aset pertama Anda untuk memulai inventaris.'} action={canWrite && <button className="btn primary small" onClick={onAdd}><Plus size={15}/> Tambah aset</button>}/>}</div><div className="table-bottom"><span>QR ID bersifat unik dan tersimpan di database.</span><span className="role-note"><ShieldCheck size={14}/>{isAdmin ? 'Admin: tambah, edit, hapus' : canWrite ? 'Staff: tambah & edit' : 'Viewer: akses baca saja'}</span></div>{Math.ceil(total / 100) > 1 && <div className="pagination-controls"><span>Halaman {assetPage} dari {Math.ceil(total / 100)}</span><div><button className="btn secondary small" disabled={assetPage <= 1 || busy} onClick={() => setAssetPage((page) => Math.max(1, page - 1))}><ArrowLeft size={14}/> Sebelumnya</button><button className="btn secondary small" disabled={assetPage >= Math.ceil(total / 100) || busy} onClick={() => setAssetPage((page) => page + 1)}>Berikutnya <ArrowRight size={14}/></button></div></div>}</section></>;
}

function LocationsPage({ locations, canWrite, isAdmin, onAdd, onEdit, onDelete, onTogglePublic, onCopyPublic, onViewAssets }) {
  return <><PageHeading eyebrow="STRUKTUR FASILITAS" title="Lokasi" subtitle="Daftarkan ruang, gedung, dan area penyimpanan sebagai tujuan aset." action={canWrite && <button className="btn primary" onClick={onAdd}><Plus size={17}/> Tambah lokasi</button>}/><div className="entity-summary"><div><span className="entity-summary-icon blue"><MapPin size={19}/></span><div><strong>{locations.length}</strong><span>Lokasi terdaftar</span></div></div><p>Lokasi yang masih digunakan oleh aset tidak dapat dihapus.</p></div><section className="panel entity-panel"><div className="entity-panel-heading"><div><h2>Daftar lokasi</h2><p>Informasi lokasi dan kontrol tautan publik.</p></div><span className="count-chip">{locations.length} lokasi</span></div>{locations.length ? <div className="entity-list">{locations.map((loc) => <article className="entity-row" key={loc._id}><span className="entity-icon blue"><Building2 size={20}/></span><div className="entity-details"><div className="entity-title-line"><strong>{loc.name}</strong><span className="code-chip">{loc.code}</span></div><p>{loc.address || loc.description || 'Belum ada alamat atau deskripsi.'}</p><div className="entity-meta"><span><MapPin size={13}/>{loc.address || 'Alamat belum diisi'}</span><span className={`public-status ${loc.publicEnabled ? 'enabled' : ''}`}><span/>{loc.publicEnabled ? 'Tautan publik aktif' : 'Tautan publik nonaktif'}</span></div></div><div className="entity-actions"><button className="btn tertiary small" onClick={() => onViewAssets(loc._id)}>Lihat aset</button>{canWrite && <button className="btn secondary small" onClick={() => onTogglePublic(loc)}>{loc.publicEnabled ? 'Nonaktifkan link' : 'Aktifkan link'}</button>}{loc.publicEnabled && <button className="icon-button" title="Salin tautan publik" onClick={() => onCopyPublic(loc)}><ExternalLink size={16}/></button>}{canWrite && <button className="icon-button" title="Edit lokasi" onClick={() => onEdit(loc)}><Pencil size={15}/></button>}{isAdmin && <button className="icon-button danger-hover" title="Hapus lokasi" onClick={() => onDelete(loc)}><Trash2 size={15}/></button>}</div></article>)}</div> : <EmptyState icon={MapPin} title="Belum ada lokasi" text="Tambahkan lokasi pertama agar aset dapat ditempatkan secara tepat." action={canWrite && <button className="btn primary small" onClick={onAdd}><Plus size={15}/> Tambah lokasi</button>}/>}</section></>;
}

function TypesPage({ types, typeStats, canWrite, isAdmin, onAdd, onEdit, onDelete }) {
  const counts = useMemo(() => Object.fromEntries(typeStats.map((item) => [item.id, item.count])), [typeStats]);
  return <><PageHeading eyebrow="KLASIFIKASI INVENTARIS" title="Jenis aset" subtitle="Buat kategori dan kode standar untuk klasifikasi seluruh inventaris." action={canWrite && <button className="btn primary" onClick={onAdd}><Plus size={17}/> Tambah jenis aset</button>}/><div className="entity-summary"><div><span className="entity-summary-icon violet"><Tags size={19}/></span><div><strong>{types.length}</strong><span>Jenis aset</span></div></div><p>Setiap aset harus dikaitkan dengan salah satu jenis yang terdaftar.</p></div><section className="type-grid">{types.map((type) => <article className="type-card" key={type._id}><div className="type-card-top"><span className="entity-icon violet"><Tags size={20}/></span><span className="code-chip">{type.code}</span></div><h2>{type.name}</h2><p>{type.description || 'Belum ada deskripsi untuk jenis aset ini.'}</p><div className="type-card-foot"><span><Package size={14}/>{counts[type._id] ?? 0} aset</span><div className="row-actions">{canWrite && <button className="icon-button" title="Edit jenis" onClick={() => onEdit(type)}><Pencil size={15}/></button>}{isAdmin && <button className="icon-button danger-hover" title="Hapus jenis" onClick={() => onDelete(type)}><Trash2 size={15}/></button>}</div></div></article>)}{canWrite && <button className="type-add-card" onClick={onAdd}><span><Plus size={20}/></span><strong>Tambah jenis baru</strong><small>Buat kategori inventaris baru</small></button>}</section>{!types.length && <section className="panel empty-panel"><EmptyState icon={Tags} title="Belum ada jenis aset" text="Buat jenis aset sebelum menambahkan barang ke inventaris." action={canWrite && <button className="btn primary small" onClick={onAdd}><Plus size={15}/> Tambah jenis aset</button>}/></section>}</>;
}

function UsersPage({ users, onUpdate }) {
  return <><PageHeading eyebrow="KONTROL AKSES" title="Pengguna" subtitle="Kelola role dan status akun. Pendaftaran mandiri selalu dimulai sebagai viewer."/><section className="panel table-panel"><div className="entity-panel-heading users-heading"><div><h2>Daftar pengguna</h2><p>Admin dapat memberikan akses staff atau admin sesuai kebutuhan.</p></div><span className="count-chip">{users.length} akun</span></div><div className="table-scroll"><table><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Login terakhir</th></tr></thead><tbody>{users.map((item) => <tr key={item._id || item.id}><td><div className="history-asset"><span className="avatar">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.email}</small></span></div></td><td><select className="role-select" aria-label={`Peran untuk ${item.email}`} value={item.role} onChange={(event) => onUpdate(item, { role: event.target.value })}><option value="viewer">Viewer</option><option value="staff">Staff</option><option value="admin">Admin</option></select></td><td><button className={`user-status ${item.active ? 'active' : 'inactive'}`} onClick={() => onUpdate(item, { active: !item.active })}><span/>{item.active ? 'Aktif' : 'Nonaktif'}</button></td><td className="date-cell">{fmtDate(item.lastLoginAt)}</td></tr>)}</tbody></table>{!users.length && <EmptyState icon={Users} title="Belum ada akun" text="Akun pengguna yang mendaftar atau dibuat admin akan muncul di sini."/>}</div><div className="table-bottom"><span>Perubahan akses langsung membatalkan refresh token akun yang dinonaktifkan.</span><span><ShieldCheck size={14}/> Hanya admin</span></div></section></>;
}

function HistoryPage({ history, filter, setFilter }) {
  const visible = useMemo(() => history.filter((item) => !filter || `${item.assetName} ${item.changeType} ${item.changedBy?.name || ''}`.toLowerCase().includes(filter.toLowerCase())), [history, filter]);
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Riwayat aktivitas" subtitle="Jejak pembuatan dan perubahan data aset yang tersimpan di database."/><section className="panel table-panel"><div className="table-toolbar"><div className="search-input history-search"><Search size={17}/><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cari nama aset, aksi, atau pengguna…" aria-label="Cari riwayat"/></div><span className="count-chip">{visible.length} aktivitas dimuat</span></div><div className="table-scroll"><table><thead><tr><th>Aktivitas</th><th>Jenis perubahan</th><th>Diubah oleh</th><th>Waktu</th></tr></thead><tbody>{visible.map((item) => <tr key={item._id}><td><div className="history-asset"><span className="history-row-icon"><FileClock size={16}/></span><span><strong>{item.assetName || item.assetId?.name || 'Aset tidak tersedia'}</strong><small>{item.assetId?.qrId || 'ID aset tidak tersedia'}</small></span></div></td><td><span className="history-action-chip">{changeLabel(item.changeType)}</span></td><td>{item.changedBy?.name || 'Sistem'}</td><td className="date-cell">{fmtDate(item.createdAt)}</td></tr>)}</tbody></table>{!visible.length && <EmptyState icon={FileClock} title="Riwayat tidak ditemukan" text="Aktivitas aset akan muncul setelah terjadi perubahan."/>}</div><div className="table-bottom"><span>Riwayat terbaru dimuat dari API (maks. 100 entri).</span><span><ShieldCheck size={14}/> Jejak perubahan tercatat otomatis</span></div></section></>;
}
