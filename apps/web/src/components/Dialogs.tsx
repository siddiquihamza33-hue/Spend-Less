import { useEffect, useRef, useState } from 'react';
import { Icon, useFocusTrap } from '@spend-lens/ui';
import { useApp, dedupeFiles } from '../state/store';
import { importFiles } from '../import/importFiles';

const useEscape = (active: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!active) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onEscape(); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [active, onEscape]);
};

/** In-app replacement for the browser's confirm(): Cancel has focus so Enter can't delete by accident. */
export function ConfirmDialog() {
  const req = useApp(s => s.confirm);
  const box = useRef<HTMLDivElement>(null), cancel = useRef<HTMLButtonElement>(null);
  useFocusTrap(box, !!req, cancel);
  useEscape(!!req, () => req?.resolve(false));
  if (!req) return null;
  return (
    <div className="modal-bg" role="alertdialog" aria-modal="true" aria-labelledby="cfTitle" aria-describedby="cfBody" onClick={e => { if (e.target === e.currentTarget) req.resolve(false); }}>
      <div className="card modal cf" ref={box}>
        <h3 id="cfTitle">{req.title}</h3>
        <p id="cfBody">{req.body}</p>
        <div className="modal-actions">
          <button type="button" className="btn" ref={cancel} onClick={() => req.resolve(false)}>Cancel</button>
          <button type="button" className="btn ink" onClick={() => req.resolve(true)}>{req.ok}</button>
        </div>
      </div>
    </div>
  );
}

const LockArt = () => (
  <svg width="132" height="96" viewBox="0 0 132 96" aria-hidden="true">
    <circle cx="66" cy="50" r="44" fill="var(--brand-soft)" />
    <g transform="translate(30 14) rotate(-6)">
      <path d="M4 0h40l14 14v56a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="var(--surface)" stroke="var(--border-strong)" />
      <path d="M44 0v10a4 4 0 0 0 4 4h10" fill="var(--brand-soft-2)" />
      <rect x="9" y="12" width="24" height="5" rx="2.5" fill="var(--brand)" />
      <rect x="9" y="24" width="38" height="4" rx="2" fill="var(--surface-3)" /><rect x="9" y="33" width="30" height="4" rx="2" fill="var(--surface-3)" />
      <rect x="9" y="42" width="34" height="4" rx="2" fill="var(--surface-3)" />
    </g>
    <g transform="translate(70 44)">
      <rect x="0" y="14" width="36" height="28" rx="7" fill="var(--brand)" />
      <path d="M8 14v-5a10 10 0 0 1 20 0v5" fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="18" cy="26" r="4" fill="#fff" /><rect x="16.5" y="27" width="3" height="7" rx="1.5" fill="#fff" />
    </g>
    <path d="M112 18l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="var(--brand)" />
    <circle cx="22" cy="74" r="3" fill="var(--brand-2)" opacity=".6" />
  </svg>
);

/** Asked when a PDF is locked and no typed or remembered password opens it. */
export function PasswordDialog() {
  const req = useApp(s => s.password);
  const [pw, setPw] = useState(''), [remember, setRemember] = useState(true);
  const box = useRef<HTMLFormElement>(null), input = useRef<HTMLInputElement>(null);
  useFocusTrap(box, !!req, input);
  useEscape(!!req, () => req?.resolve(null));
  useEffect(() => { if (req) setPw(''); }, [req]);
  if (!req) return null;
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="pwTitle">
      <form className="card modal" ref={box} autoComplete="off" onSubmit={e => { e.preventDefault(); if (pw) req.resolve({ pw, remember }); }}>
        <LockArt />
        <h3 id="pwTitle">This statement is password protected</h3>
        <p className="file">{req.name}</p>
        <label className="field"><Icon name="key" /><input ref={input} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter PDF password" aria-label="PDF password" autoComplete="off" spellCheck={false} /></label>
        {req.wrong && <p className="err"><Icon name="alert" size="sm" />That password didn't unlock the file. Try again.</p>}
        <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember on this device and unlock future statements automatically</label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => req.resolve(null)}>Skip file</button>
          <button type="submit" className="btn primary"><Icon name="lock" size="sm" />Unlock</button>
        </div>
        <p className="fine"><Icon name="shield" size="sm" />Many Pakistani banks, including HBL, use your CNIC number without dashes. The password is only used in this browser.</p>
      </form>
    </div>
  );
}

const fmtSize = (b: number) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

/** Choose files and (optionally) the statement password, then import. */
export function UploadDialog() {
  const files = useApp(s => s.upload), savedPw = useApp(s => s.savedPw), set = useApp(s => s.set);
  const [pw, setPw] = useState(''), [show, setShow] = useState(false), [remember, setRemember] = useState(true);
  const box = useRef<HTMLFormElement>(null), pwRef = useRef<HTMLInputElement>(null), dropRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const open = files !== null;
  useFocusTrap(box, open, files?.length ? pwRef : dropRef);
  const close = () => { set({ upload: null }); setPw(''); setShow(false); };
  useEscape(open, close);
  if (!open) return null;
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    const picked = files.slice(), password = pw;
    close();
    importFiles(picked, { password: password || null, remember });
  };
  const pick = () => fileRef.current?.click();
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="upTitle" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <form className="card modal up" ref={box} autoComplete="off" onSubmit={go}>
        <div className="up-head">
          <div className="ic"><Icon name="upload" /></div>
          <div><h3 id="upTitle">Upload statements</h3><p>CSV, Excel or PDF. Add several months at once.</p></div>
          <button type="button" className="btn icon" aria-label="Close" onClick={close}><Icon name="x" /></button>
        </div>
        <div className="drop up-drop" ref={dropRef} tabIndex={0} role="button" aria-label="Choose statement files" onClick={pick}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
          <div className="ic"><Icon name="fileUp" size="lg" /></div>
          <div><b>Choose files</b><span>or drop them here</span></div>
        </div>
        <input ref={fileRef} type="file" multiple accept=".csv,.txt,.pdf,.xlsx,.xls" className="hidden"
          onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) set({ upload: dedupeFiles(files, fs) }); }} />
        <ul className="up-files">
          {files.map((f, i) => (
            <li key={f.name + f.size}><Icon name="file" size="sm" /><span className="nm">{f.name}</span><span className="sz">{fmtSize(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => set({ upload: files.filter((_, k) => k !== i) })}><Icon name="x" size="sm" /></button></li>
          ))}
        </ul>
        <div className="up-pw">
          <label className="lbl" htmlFor="upPw"><Icon name="key" size="sm" />Statement password <span className="opt">Optional</span></label>
          <div className="field">
            <Icon name="lock" />
            <input ref={pwRef} id="upPw" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter the PDF password" autoComplete="off" spellCheck={false} />
            <button type="button" className="eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}><Icon name={show ? 'eyeOff' : 'eye'} size="sm" /></button>
          </div>
          {savedPw > 0 && <p className="saved-note"><Icon name="check" size="sm" />A saved password will be tried automatically, so you can leave this empty.</p>}
          <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember on this device for future statements</label>
          <p className="fine"><Icon name="shield" size="sm" />HBL and most Pakistani banks use your CNIC number without dashes. If you tick Remember, it's stored in this browser's storage on this computer, so only tick it on your own computer.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!files.length}><Icon name="upload" size="sm" /><span>{files.length ? `Import ${files.length} file${files.length === 1 ? '' : 's'}` : 'Import'}</span></button>
        </div>
      </form>
    </div>
  );
}
