import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

// localStorage shim — mimics the storage API used in development
const storage = {
  get: async (key) => {
    try {
      const value = localStorage.getItem(key);
      if (value == null) return null;
      return { key, value };
    } catch (e) { return null; }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (e) { return null; }
  },
  list: async (prefix) => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || (k && k.startsWith(prefix))) keys.push(k);
      }
      return { keys };
    } catch (e) { return { keys: [] }; }
  },
};

const C = {
  paper: '#f1e7d2',
  paperShade: '#ead9b8',
  paperBright: '#f5ecd9',
  ink: '#2a2117',
  inkSoft: '#6b5c43',
  inkFaint: '#9b8a6c',
  line: '#b9a786',
  lineFaint: '#d6c6a4',
  bg: '#1a1612',
  bgSoft: '#221c14',
  accent: '#7a5e3a',
};

const F = {
  display: '"Fraunces", Georgia, serif',
  body: '"Archivo", -apple-system, sans-serif',
};

const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const fmtDateShort = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const emptyEntry = () => ({
  mood: null,
  hydration: 0,
  loops: [],
  topOne: '',
  body: { slept: 0, ate: 0, moved: 0 },
  today: [],
  freedThoughts: '',
  tomorrowFirst: '',
  counters: { log: 0, read: 0, activity: 0 },
  wins: '',
  gratitude: '',
  ashNotes: '',
});

const newLoop = () => ({
  id: Math.random().toString(36).slice(2, 9),
  text: '',
  state: 'open',
  createdAt: Date.now(),
});

const newTask = () => ({
  id: Math.random().toString(36).slice(2, 9),
  text: '',
  done: false,
});

export default function App() {
  const [view, setView] = useState('today');
  const [user, setUser] = useState('partner');
  const [date, setDate] = useState(todayKey());
  const [entry, setEntry] = useState(emptyEntry());
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Archivo:wght@300..700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await storage.get(`entry:${date}`);
        if (mounted && r?.value) {
          setEntry({ ...emptyEntry(), ...JSON.parse(r.value) });
        } else if (mounted) setEntry(emptyEntry());
      } catch (e) {
        if (mounted) setEntry(emptyEntry());
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [date]);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get('config');
        if (r?.value) {
          const cfg = JSON.parse(r.value);
          setPartnerName(cfg.partnerName || '');
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await storage.set(`entry:${date}`, JSON.stringify(entry));
      } catch (e) {}
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [entry, date, loading]);

  const saveConfig = async (next) => {
    try {
      await storage.set('config', JSON.stringify(next));
    } catch (e) {}
  };

  const loadHistory = useCallback(async () => {
    try {
      const r = await storage.list('entry:');
      if (!r?.keys) { setHistory([]); return; }
      const keys = r.keys.sort().reverse().slice(0, 60);
      const items = [];
      for (const k of keys) {
        try {
          const ent = await storage.get(k);
          if (ent?.value) {
            items.push({ date: k.replace('entry:', ''), data: JSON.parse(ent.value) });
          }
        } catch (e) {}
      }
      setHistory(items);
    } catch (e) {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (view === 'history' || view === 'insights') loadHistory();
  }, [view, loadHistory]);

  const update = (patch) => setEntry((e) => ({ ...e, ...patch }));

  const isAsh = user === 'ash';

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: F.body,
      color: C.ink,
      paddingBottom: 80,
    }}>
      <Header
        user={user}
        setUser={setUser}
        partnerName={partnerName}
        onSettings={() => setShowSettings(true)}
        view={view}
      />

      {showSettings && (
        <Settings
          partnerName={partnerName}
          setPartnerName={(n) => { setPartnerName(n); saveConfig({ partnerName: n }); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 12px' }}>
        {view === 'today' && (
          <TodayView
            entry={entry}
            update={update}
            date={date}
            setDate={setDate}
            isAsh={isAsh}
            partnerName={partnerName}
          />
        )}
        {view === 'history' && (
          <HistoryView
            history={history}
            onPick={(d) => { setDate(d); setView('today'); }}
          />
        )}
        {view === 'insights' && <InsightsView history={history} />}
      </div>

      <TabBar view={view} setView={setView} />
    </div>
  );
}

function Header({ user, setUser, partnerName, onSettings, view }) {
  const labels = { today: 'Today', history: 'History', insights: 'Insights' };
  return (
    <div style={{
      background: C.bg,
      borderBottom: `1px solid ${C.bgSoft}`,
      padding: '14px 16px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6, background: C.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontStyle: 'italic', fontSize: 16, color: C.ink,
        }}>L</div>
        <div>
          <div style={{ fontFamily: F.display, fontSize: 15, color: C.paper, letterSpacing: '0.04em' }}>
            {labels[view]}
          </div>
          <div style={{ fontSize: 9, color: C.inkFaint, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 1 }}>
            loops
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex',
          background: C.bgSoft,
          borderRadius: 999,
          padding: 3,
        }}>
          <button
            onClick={() => setUser('partner')}
            style={{
              border: 0,
              padding: '5px 11px',
              borderRadius: 999,
              background: user === 'partner' ? C.paper : 'transparent',
              color: user === 'partner' ? C.ink : C.inkFaint,
              fontFamily: F.body,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {partnerName ? partnerName.slice(0, 6) : 'Her'}
          </button>
          <button
            onClick={() => setUser('ash')}
            style={{
              border: 0,
              padding: '5px 11px',
              borderRadius: 999,
              background: user === 'ash' ? C.paper : 'transparent',
              color: user === 'ash' ? C.ink : C.inkFaint,
              fontFamily: F.body,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Ash
          </button>
        </div>
        <button
          onClick={onSettings}
          style={{
            border: 0, background: 'transparent',
            color: C.inkFaint, fontSize: 18,
            cursor: 'pointer', padding: 4,
          }}
        >⚙</button>
      </div>
    </div>
  );
}

function TabBar({ view, setView }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: '◐' },
    { id: 'history', label: 'History', icon: '◷' },
    { id: 'insights', label: 'Insights', icon: '◊' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.bgSoft,
      borderTop: `1px solid #2a221a`,
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0 18px',
      zIndex: 10,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setView(t.id)}
          style={{
            border: 0, background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: view === t.id ? C.paper : C.inkFaint,
            fontFamily: F.body,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '2px 14px',
          }}
        >
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Settings({ partnerName, setPartnerName, onClose }) {
  const [name, setName] = useState(partnerName);
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.paper, borderRadius: 14, padding: 22,
        width: '100%', maxWidth: 360,
      }}>
        <div style={{ fontFamily: F.display, fontSize: 18, fontStyle: 'italic', marginBottom: 14 }}>
          Settings
        </div>
        <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.inkSoft, marginBottom: 6 }}>
          Her name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          style={{
            width: '100%', padding: '10px 12px',
            border: `1px solid ${C.ink}`, borderRadius: 8,
            background: C.paperBright, fontFamily: F.body, fontSize: 14,
            color: C.ink, marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', border: `1px solid ${C.ink}`, borderRadius: 8,
            background: 'transparent', cursor: 'pointer', fontFamily: F.body, fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Cancel</button>
          <button onClick={() => { setPartnerName(name); onClose(); }} style={{
            padding: '8px 16px', border: `1px solid ${C.ink}`, borderRadius: 8,
            background: C.ink, color: C.paper, cursor: 'pointer', fontFamily: F.body, fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TodayView({ entry, update, date, setDate, isAsh, partnerName }) {
  const goPrev = () => {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    setDate(todayKey(dt));
  };
  const goNext = () => {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    setDate(todayKey(dt));
  };
  const isToday = date === todayKey();

  return (
    <div style={{ paddingTop: 16 }}>
      <Page>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={goPrev} style={chevBtn}>‹</button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 17, fontStyle: 'italic', color: C.ink }}>
              {fmtDate(date)}
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.inkSoft, marginTop: 2 }}>
              {isToday ? 'today' : 'past day'}
            </div>
          </div>
          <button onClick={goNext} style={chevBtn} disabled={isToday}>›</button>
        </div>

        <Vitals
          mood={entry.mood}
          setMood={(v) => update({ mood: v })}
          hydration={entry.hydration}
          setHydration={(v) => update({ hydration: v })}
        />

        <Divider label="Open Loops" />

        <OpenLoops
          loops={entry.loops}
          setLoops={(loops) => update({ loops })}
        />

        <Divider label="Top 1" />

        <TopOne
          value={entry.topOne}
          onChange={(v) => update({ topOne: v })}
        />

        <Divider label="Body" />

        <BodyCheck
          body={entry.body}
          setBody={(body) => update({ body })}
        />

        <Divider label="Today" />

        <TodayList
          tasks={entry.today}
          setTasks={(today) => update({ today })}
        />

        <Divider label="Freed Thoughts" />

        <FreedThoughts
          value={entry.freedThoughts}
          onChange={(v) => update({ freedThoughts: v })}
        />
      </Page>

      <div style={{ height: 18 }} />

      <Page>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{
            fontFamily: F.display, fontSize: 18, fontStyle: 'italic', letterSpacing: '0.04em',
          }}>Evening Close</div>
          <div style={{ fontSize: 10, color: C.inkSoft, fontStyle: 'italic', fontFamily: F.display, marginTop: 2 }}>
            put the day to bed before it follows you home
          </div>
        </div>

        <LoopsReview loops={entry.loops} />

        <Divider label="Tomorrow's first loop" />

        <TextLine
          value={entry.tomorrowFirst}
          onChange={(v) => update({ tomorrowFirst: v })}
          placeholder="park one thing for tomorrow"
          dashed
        />

        <Divider label="Counters" />

        <Counters
          counters={entry.counters}
          setCounters={(c) => update({ counters: c })}
        />

        <Divider label="Wins" />

        <Wins
          value={entry.wins}
          onChange={(v) => update({ wins: v })}
        />

        <Divider label="One good thing" />

        <TextLine
          value={entry.gratitude}
          onChange={(v) => update({ gratitude: v })}
          placeholder="…"
        />
      </Page>

      <div style={{ height: 18 }} />

      <AshNotes
        value={entry.ashNotes}
        onChange={(v) => update({ ashNotes: v })}
        isAsh={isAsh}
        partnerName={partnerName}
      />
    </div>
  );
}

const chevBtn = {
  width: 32, height: 32, borderRadius: 999,
  border: `1px solid ${C.line}`, background: 'transparent',
  color: C.ink, fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: F.display,
};

function Page({ children }) {
  return (
    <div style={{
      background: C.paper,
      borderRadius: 8,
      padding: '22px 18px',
      boxShadow: '0 20px 40px -20px rgba(0,0,0,0.7)',
      position: 'relative',
    }}>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      margin: '20px 0 12px',
    }}>
      <div style={{ flex: 1, height: 1, background: C.line }} />
      <div style={{
        fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
        color: C.inkSoft, fontFamily: F.body,
      }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function Vitals({ mood, setMood, hydration, setHydration }) {
  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
      <div>
        <Label>Mood</Label>
        <MoodSlider value={mood} onChange={setMood} />
      </div>
      <div>
        <Label>Hydration</Label>
        <Hydration value={hydration} onChange={setHydration} />
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
      color: C.inkSoft, marginBottom: 6,
    }}>{children}</div>
  );
}

function MoodSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const set = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(pct * 100));
  };
  const onDown = (e) => {
    const handler = (ev) => set(ev.touches ? ev.touches[0].clientX : ev.clientX);
    handler(e);
    const move = (ev) => handler(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
  };

  const pos = value == null ? null : value;

  return (
    <div>
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{
          height: 26, border: `1px solid ${C.ink}`, borderRadius: 999,
          position: 'relative', cursor: 'pointer',
          background: C.paperBright,
          touchAction: 'none',
        }}
      >
        {pos != null && (
          <div style={{
            position: 'absolute',
            top: -3,
            left: `calc(${pos}% - 13px)`,
            width: 26, height: 26, borderRadius: '50%',
            background: C.ink,
            transition: 'left 0.12s ease',
          }} />
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 8, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: C.inkSoft, marginTop: 4, padding: '0 2px',
      }}>
        <span>Negative</span><span>Positive</span>
      </div>
    </div>
  );
}

function Hydration({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5,6,7,8].map(n => {
        const filled = n <= value;
        return (
          <button
            key={n}
            onClick={() => onChange(value === n ? n - 1 : n)}
            style={{
              flex: 1,
              aspectRatio: '1 / 1',
              border: `1px solid ${C.ink}`,
              borderRadius: '50%',
              background: filled ? C.ink : C.paperBright,
              cursor: 'pointer',
              padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Drop filled={filled} />
          </button>
        );
      })}
    </div>
  );
}

function Drop({ filled }) {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
      <path d="M5.5 1 L9.5 7.5 Q11 11 8 12.5 Q5.5 13.7 3 12.5 Q0 11 1.5 7.5 Z"
        fill={filled ? C.paperBright : 'transparent'}
        stroke={filled ? C.paperBright : C.ink}
        strokeWidth="0.8"
      />
    </svg>
  );
}

function OpenLoops({ loops, setLoops }) {
  const add = () => setLoops([...loops, newLoop()]);
  const updateOne = (id, patch) =>
    setLoops(loops.map(l => l.id === id ? { ...l, ...patch } : l));
  const remove = (id) => setLoops(loops.filter(l => l.id !== id));

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: C.inkFaint, marginBottom: 8, padding: '0 2px',
      }}>
        <span>what's looping</span>
        <span>today · defer · hand off · drop · done</span>
      </div>

      {loops.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '18px 0',
          fontFamily: F.display, fontStyle: 'italic',
          color: C.inkSoft, fontSize: 13,
        }}>
          nothing captured yet
        </div>
      )}

      {loops.map(loop => (
        <LoopItem
          key={loop.id}
          loop={loop}
          onChange={(patch) => updateOne(loop.id, patch)}
          onRemove={() => remove(loop.id)}
        />
      ))}

      <button onClick={add} style={addBtnStyle}>
        + capture a loop
      </button>
    </div>
  );
}

const stateColors = {
  open: { bg: 'transparent', fg: C.inkSoft, border: C.line },
  today: { bg: C.ink, fg: C.paper, border: C.ink },
  defer: { bg: C.paperShade, fg: C.ink, border: C.ink },
  handoff: { bg: C.paperShade, fg: C.ink, border: C.ink },
  drop: { bg: C.paperShade, fg: C.inkFaint, border: C.line },
  closed: { bg: C.ink, fg: C.paper, border: C.ink },
};

function LoopItem({ loop, onChange, onRemove }) {
  const stateOpts = [
    { id: 'today', label: 'T' },
    { id: 'defer', label: 'D' },
    { id: 'handoff', label: '→' },
    { id: 'drop', label: '✕' },
    { id: 'closed', label: '✓' },
  ];

  const dropped = loop.state === 'drop';
  const closed = loop.state === 'closed';

  return (
    <div style={{
      borderBottom: `1px solid ${C.line}`,
      padding: '6px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={loop.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="…what's on your mind"
          style={{
            flex: 1, border: 0, background: 'transparent',
            outline: 'none', fontFamily: F.body, fontSize: 14,
            color: C.ink, padding: '4px 0',
            textDecoration: (closed || dropped) ? 'line-through' : 'none',
            opacity: (closed || dropped) ? 0.55 : 1,
          }}
        />
        <button onClick={onRemove} style={{
          border: 0, background: 'transparent', cursor: 'pointer',
          color: C.inkFaint, fontSize: 14, padding: 4,
        }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 4, marginLeft: 2 }}>
        {stateOpts.map(opt => {
          const active = loop.state === opt.id;
          const cs = active ? stateColors[opt.id] : stateColors.open;
          return (
            <button
              key={opt.id}
              onClick={() => onChange({ state: active ? 'open' : opt.id })}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `1px solid ${cs.border}`,
                background: cs.bg, color: cs.fg,
                fontFamily: F.display, fontSize: 11,
                cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{opt.label}</button>
          );
        })}
      </div>
    </div>
  );
}

const addBtnStyle = {
  width: '100%', padding: '10px',
  border: `1px dashed ${C.line}`, borderRadius: 8,
  background: 'transparent', color: C.inkSoft,
  fontFamily: F.body, fontSize: 11,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  cursor: 'pointer', marginTop: 10,
};

function TopOne({ value, onChange }) {
  return (
    <div style={{
      border: `1px solid ${C.ink}`, borderRadius: 10,
      padding: 14, background: C.paperBright,
    }}>
      <div style={{
        fontFamily: F.display, fontStyle: 'italic',
        fontSize: 12, color: C.inkSoft, marginBottom: 6,
      }}>
        if only one thing today, it is…
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        rows={2}
        style={{
          width: '100%', border: 0, background: 'transparent',
          outline: 'none', resize: 'none',
          fontFamily: F.display, fontSize: 17,
          color: C.ink, lineHeight: 1.4,
        }}
      />
    </div>
  );
}

function BodyCheck({ body, setBody }) {
  const items = [
    { key: 'slept', label: 'Slept', max: 2 },
    { key: 'ate', label: 'Ate', max: 3 },
    { key: 'moved', label: 'Moved', max: 2 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      {items.map(it => (
        <div key={it.key} style={{
          border: `1px solid ${C.ink}`, borderRadius: 12,
          padding: '10px 8px 8px', textAlign: 'center',
          background: C.paperBright,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
            {Array.from({ length: it.max }).map((_, i) => {
              const filled = i < body[it.key];
              return (
                <button
                  key={i}
                  onClick={() => setBody({
                    ...body,
                    [it.key]: filled && i === body[it.key] - 1 ? i : i + 1
                  })}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `1px solid ${C.ink}`,
                    background: filled ? C.ink : 'transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              );
            })}
          </div>
          <div style={{
            fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
            color: C.inkSoft,
          }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function TodayList({ tasks, setTasks }) {
  const add = () => setTasks([...tasks, newTask()]);
  const upd = (id, patch) => setTasks(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  const rm = (id) => setTasks(tasks.filter(t => t.id !== id));

  return (
    <div style={{
      border: `1px solid ${C.ink}`, borderRadius: 12,
      padding: '12px 12px 10px', background: C.paperBright,
    }}>
      {tasks.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '12px 0',
          color: C.inkSoft, fontStyle: 'italic',
          fontFamily: F.display, fontSize: 12,
        }}>nothing here yet</div>
      )}
      {tasks.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '5px 0',
          borderBottom: `1px solid ${C.lineFaint}`,
        }}>
          <button
            onClick={() => upd(t.id, { done: !t.done })}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `1px solid ${C.ink}`,
              background: t.done ? C.ink : 'transparent',
              cursor: 'pointer', padding: 0, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.paper, fontSize: 9,
            }}
          >{t.done ? '✓' : ''}</button>
          <input
            value={t.text}
            onChange={(e) => upd(t.id, { text: e.target.value })}
            placeholder="…"
            style={{
              flex: 1, border: 0, background: 'transparent',
              outline: 'none', fontFamily: F.body, fontSize: 14,
              color: C.ink, padding: '2px 0',
              textDecoration: t.done ? 'line-through' : 'none',
              opacity: t.done ? 0.5 : 1,
            }}
          />
          <button onClick={() => rm(t.id)} style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            color: C.inkFaint, fontSize: 14,
          }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{
        ...addBtnStyle, marginTop: 8, padding: '8px',
      }}>+ add a task</button>
    </div>
  );
}

function FreedThoughts({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="let whatever's in your head land here"
      rows={4}
      style={{
        width: '100%',
        border: `1px solid ${C.line}`,
        borderRadius: 10, padding: 12,
        background: C.paperBright,
        fontFamily: F.body, fontSize: 14,
        color: C.ink, lineHeight: 1.6,
        outline: 'none', resize: 'vertical',
      }}
    />
  );
}

function LoopsReview({ loops }) {
  const closed = loops.filter(l => l.state === 'closed');
  const open = loops.filter(l => l.state !== 'closed' && l.state !== 'drop');

  return (
    <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <ReviewBox title="Closed" items={closed} emptyText="none yet" />
      <ReviewBox title="Still open" items={open} emptyText="all clear" />
    </div>
  );
}

function ReviewBox({ title, items, emptyText }) {
  return (
    <div style={{
      border: `1px solid ${C.ink}`, borderRadius: 12,
      padding: 12, minHeight: 130,
      background: C.paperBright,
    }}>
      <div style={{
        textAlign: 'center', fontFamily: F.display,
        fontSize: 11, letterSpacing: '0.28em',
        textTransform: 'uppercase', marginBottom: 10,
      }}>{title}</div>
      {items.length === 0 && (
        <div style={{
          textAlign: 'center', color: C.inkSoft,
          fontStyle: 'italic', fontFamily: F.display, fontSize: 12,
        }}>{emptyText}</div>
      )}
      {items.map((l, i) => (
        <div key={l.id} style={{
          fontSize: 12, color: C.ink, padding: '3px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${C.lineFaint}` : 'none',
          textDecoration: title === 'Closed' ? 'line-through' : 'none',
          opacity: title === 'Closed' ? 0.7 : 1,
        }}>
          {l.text || '…'}
        </div>
      ))}
    </div>
  );
}

function TextLine({ value, onChange, placeholder, dashed }) {
  return (
    <div style={{
      border: dashed ? `1px dashed ${C.ink}` : 'none',
      borderRadius: dashed ? 10 : 0,
      padding: dashed ? '10px 12px' : 0,
      background: dashed ? C.paperBright : 'transparent',
      borderBottom: dashed ? `1px dashed ${C.ink}` : `1px solid ${C.ink}`,
    }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', border: 0, background: 'transparent',
          outline: 'none', fontFamily: F.body, fontSize: 14,
          color: C.ink, padding: '6px 0',
        }}
      />
    </div>
  );
}

function Counters({ counters, setCounters }) {
  const items = [
    { key: 'log', label: 'Log', max: 3 },
    { key: 'read', label: 'Read', max: 2 },
    { key: 'activity', label: 'Activity', max: 2 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {items.map(it => (
        <div key={it.key} style={{ textAlign: 'center' }}>
          <div style={{
            border: `1px solid ${C.ink}`, borderRadius: 999,
            display: 'flex', justifyContent: 'center', gap: 6,
            padding: '6px 10px', marginBottom: 4, background: C.paperBright,
          }}>
            {Array.from({ length: it.max }).map((_, i) => {
              const filled = i < counters[it.key];
              return (
                <button
                  key={i}
                  onClick={() => setCounters({
                    ...counters,
                    [it.key]: filled && i === counters[it.key] - 1 ? i : i + 1
                  })}
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `1px solid ${C.ink}`,
                    background: filled ? C.ink : 'transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.inkSoft }}>
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Wins({ value, onChange }) {
  return (
    <div style={{
      border: `1px solid ${C.ink}`, borderRadius: 12,
      padding: 14, background: C.paperBright,
    }}>
      <div style={{
        fontFamily: F.display, fontStyle: 'italic',
        fontSize: 11, color: C.inkSoft, marginBottom: 6, textAlign: 'center',
      }}>
        what got closed today
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: '100%', border: 0, background: 'transparent',
          outline: 'none', resize: 'none',
          fontFamily: F.body, fontSize: 14,
          color: C.ink, lineHeight: 1.6,
        }}
      />
    </div>
  );
}

function AshNotes({ value, onChange, isAsh, partnerName }) {
  return (
    <div style={{
      background: '#2a2117',
      borderRadius: 8,
      padding: '18px 18px',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: F.display, fontStyle: 'italic',
          fontSize: 15, color: C.paper,
        }}>From Ash</div>
        <div style={{
          fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: C.inkFaint, padding: '3px 8px',
          border: `1px solid ${C.inkFaint}`, borderRadius: 999,
        }}>
          {isAsh ? 'editing' : 'read only'}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => isAsh && onChange(e.target.value)}
        readOnly={!isAsh}
        placeholder={isAsh
          ? `a note for ${partnerName || 'her'}…`
          : (value ? '' : 'nothing here today')
        }
        rows={3}
        style={{
          width: '100%', border: 0,
          background: 'transparent',
          outline: 'none', resize: 'none',
          fontFamily: F.body, fontSize: 14,
          color: C.paper, lineHeight: 1.6,
          fontStyle: !value && !isAsh ? 'italic' : 'normal',
          opacity: !value && !isAsh ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function HistoryView({ history, onPick }) {
  return (
    <div style={{ paddingTop: 18 }}>
      {history.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          color: C.inkFaint, fontFamily: F.display,
          fontStyle: 'italic', fontSize: 15,
        }}>
          no past days yet
        </div>
      )}
      {history.map(item => {
        const e = item.data;
        const loopsClosed = (e.loops || []).filter(l => l.state === 'closed').length;
        const loopsTotal = (e.loops || []).length;
        const tasksDone = (e.today || []).filter(t => t.done).length;
        const tasksTotal = (e.today || []).length;
        return (
          <div key={item.date} onClick={() => onPick(item.date)} style={{
            background: C.paper, borderRadius: 8,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 15, fontStyle: 'italic' }}>
                {fmtDate(item.date)}
              </div>
              <div style={{
                fontSize: 10, color: C.inkSoft, marginTop: 3,
                display: 'flex', gap: 12,
              }}>
                <span>{loopsClosed}/{loopsTotal} loops</span>
                <span>·</span>
                <span>{tasksDone}/{tasksTotal} tasks</span>
                <span>·</span>
                <span>{e.hydration || 0}/8 water</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {e.mood != null && (
                <div style={{
                  width: 36, height: 6, borderRadius: 999,
                  background: C.lineFaint, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: -2,
                    left: `calc(${e.mood}% - 5px)`,
                    width: 10, height: 10, borderRadius: '50%',
                    background: C.ink,
                  }} />
                </div>
              )}
              <div style={{ fontSize: 16, color: C.inkSoft }}>›</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightsView({ history }) {
  if (history.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', paddingTop: 60,
        color: C.inkFaint, fontFamily: F.display,
        fontStyle: 'italic', fontSize: 15,
      }}>
        no data to chart yet
      </div>
    );
  }

  const data = [...history].reverse().map(item => {
    const e = item.data;
    const loops = e.loops || [];
    return {
      date: fmtDateShort(item.date),
      mood: e.mood,
      hydration: e.hydration || 0,
      opened: loops.length,
      closed: loops.filter(l => l.state === 'closed').length,
    };
  });

  const avgMood = data.filter(d => d.mood != null).reduce((s, d) => s + d.mood, 0) /
    Math.max(1, data.filter(d => d.mood != null).length);
  const avgHydration = data.reduce((s, d) => s + d.hydration, 0) / data.length;
  const totalClosed = data.reduce((s, d) => s + d.closed, 0);
  const totalOpened = data.reduce((s, d) => s + d.opened, 0);

  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginBottom: 14,
      }}>
        <Stat label="Avg mood" value={`${Math.round(avgMood)}`} suffix="/100" />
        <Stat label="Avg water" value={avgHydration.toFixed(1)} suffix="/8" />
        <Stat label="Loops closed" value={totalClosed} suffix={`of ${totalOpened}`} />
        <Stat label="Days logged" value={history.length} suffix="" />
      </div>

      <Card title="Mood">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={C.lineFaint} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: C.paperBright, border: `1px solid ${C.ink}`, borderRadius: 6, fontSize: 11 }} />
            <Line type="monotone" dataKey="mood" stroke={C.ink} strokeWidth={2} dot={{ fill: C.ink, r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Hydration">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={C.lineFaint} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 8]} />
            <Tooltip contentStyle={{ background: C.paperBright, border: `1px solid ${C.ink}`, borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="hydration" fill={C.accent} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Loops · opened vs closed">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={C.lineFaint} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.inkSoft, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: C.paperBright, border: `1px solid ${C.ink}`, borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="opened" fill={C.lineFaint} radius={[3, 3, 0, 0]} />
            <Bar dataKey="closed" fill={C.ink} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{
          display: 'flex', gap: 14, justifyContent: 'center',
          fontSize: 9, color: C.inkSoft, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginTop: 6,
        }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.lineFaint, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>opened</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.ink, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>closed</span>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div style={{
      background: C.paper, borderRadius: 8, padding: 14,
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
        color: C.inkSoft, marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <div style={{ fontFamily: F.display, fontSize: 24, color: C.ink }}>{value}</div>
        <div style={{ fontSize: 11, color: C.inkSoft }}>{suffix}</div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: C.paper, borderRadius: 8, padding: 16, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
        color: C.inkSoft, marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}
