import { Icon } from '@spend-lens/ui';
import { useApp } from '../state/store';
import { sampleData } from '../import/sample';
import { pressable } from '../components/bits';

const Illustration = () => (
  <svg className="illo" viewBox="0 0 320 380" aria-hidden="true">
    <defs><pattern id="zz" width="16" height="10" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="6" fill="var(--page)" /></pattern></defs>
    <g transform="rotate(-3 160 190)">
      <rect x="48" y="22" width="224" height="330" fill="var(--paper)" style={{ filter: 'drop-shadow(0 14px 18px rgba(60,45,20,.16))' }} />
      <rect x="48" y="342" width="224" height="10" fill="url(#zz)" />
      <text x="160" y="62" textAnchor="middle" fontFamily="Roboto Serif, Georgia, serif" fontSize="22" fill="var(--ink)">Spend Lens</text>
      <text x="160" y="80" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="2" fill="var(--muted)">STATEMENT OF SPENDING</text>
      <line x1="66" y1="94" x2="254" y2="94" stroke="var(--rule-strong)" strokeDasharray="3 3" />
      <g fontFamily="Roboto, sans-serif" fontSize="7.5" fill="var(--muted)">
        <text x="66" y="118">01 Oct 26</text><text x="66" y="142">03 Oct 26</text><text x="66" y="166">05 Oct 26</text><text x="66" y="190">06 Oct 26</text><text x="66" y="214">09 Oct 26</text>
      </g>
      <g fill="var(--paper-3)">
        <rect x="108" y="111" width="72" height="8" rx="2" /><rect x="108" y="135" width="54" height="8" rx="2" /><rect x="108" y="159" width="80" height="8" rx="2" /><rect x="108" y="183" width="62" height="8" rx="2" /><rect x="108" y="207" width="70" height="8" rx="2" />
      </g>
      <g fill="var(--rule-strong)">
        <rect x="218" y="111" width="36" height="8" rx="2" /><rect x="226" y="135" width="28" height="8" rx="2" /><rect x="214" y="159" width="40" height="8" rx="2" /><rect x="222" y="183" width="32" height="8" rx="2" /><rect x="218" y="207" width="36" height="8" rx="2" />
      </g>
      <g>
        <rect x="66" y="238" width="62" height="12" fill="var(--c-food)" /><rect x="130" y="238" width="44" height="12" fill="var(--c-groc)" /><rect x="176" y="238" width="34" height="12" fill="var(--c-trans)" /><rect x="212" y="238" width="24" height="12" fill="var(--c-subs)" /><rect x="238" y="238" width="16" height="12" fill="var(--c-grey)" />
      </g>
      <line x1="66" y1="266" x2="254" y2="266" stroke="var(--rule-strong)" strokeWidth="3" strokeDasharray="0" style={{ strokeWidth: '3px' }} />
      <line x1="66" y1="270" x2="254" y2="270" stroke="var(--rule-strong)" />
      <text x="66" y="292" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.5" fill="var(--ink-2)">TOTAL</text>
      <rect x="196" y="283" width="58" height="11" rx="2" fill="var(--ink)" />
      <g transform="translate(200 300) rotate(-12)">
        <rect x="0" y="0" width="92" height="34" rx="4" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <text x="46" y="15" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="600" letterSpacing="1.5" fill="var(--accent)">UPLOAD TO</text>
        <text x="46" y="27" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="600" letterSpacing="1.5" fill="var(--accent)">PRINT</text>
      </g>
    </g>
  </svg>
);

export function Welcome({ dragging }: { dragging: boolean }) {
  const open = () => useApp.getState().openUpload();
  const sample = () => {
    const s = useApp.getState();
    const n = s.addTxns(sampleData());
    s.set({ viewCur: 'PKR', animSeq: s.animSeq + 1 });
    s.toastMsg(`Loaded ${n} sample transactions`);
  };
  return (
    <section id="empty">
      <div className="welcome">
        <div>
          <div className="eyebrow"><span className="dot" />No. 001 — Personal statement reader</div>
          <h2>Your card statements, finally <em>readable.</em></h2>
          <p className="lead">Drop in a CSV, Excel or PDF statement. Spend Lens reads every line, sorts it into categories and tells you, in plain words, where your money went.</p>
          <div className="actions">
            <button className="btn primary lg" onClick={open}><Icon name="upload" size="sm" />Upload a statement</button>
            <button className="btn lg" onClick={sample}><Icon name="play" size="sm" />Try sample data</button>
          </div>
        </div>
        <Illustration />
      </div>
      <div className={'drop' + (dragging ? ' over' : '')} {...pressable(open)} aria-label="Choose statement files">
        <div className="ic"><Icon name="fileUp" /></div>
        <div><b>Drag statements anywhere on this page</b><span>or click to browse. Upload several months at once to see trends.</span></div>
        <div className="formats"><i>CSV</i><i>XLSX</i><i>PDF</i></div>
      </div>
      <div className="features">
        <div className="feature"><span className="n">01</span><b>Sorted for you</b><span>Food, groceries, fuel, bills, ads and more, learned from merchant names. Fix one and it's remembered.</span></div>
        <div className="feature"><span className="n">02</span><b>Explained in words</b><span>What changed this month, what bills you every month, and where fees quietly add up.</span></div>
        <div className="feature"><span className="n">03</span><b>Stays on your device</b><span>Statements, even password-protected PDFs, are opened in your browser and never sent anywhere.</span></div>
      </div>
    </section>
  );
}
