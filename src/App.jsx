
import React, { useEffect, useMemo, useState } from "react";

export default function BioChemQuizApp() {
  return (
    <div className="min-h-screen" style={{background:"#f8fafc", color:"#0f172a"}} dir="rtl">
      <Header />
      <main style={{maxWidth: "960px", margin: "0 auto", padding: "24px"}}>
        <Quiz />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header style={{position:"sticky", top:0, zIndex:20, borderBottom:"1px solid #e2e8f0", background:"rgba(255,255,255,0.8)", backdropFilter:"blur(6px)"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", maxWidth:"960px", margin:"0 auto", padding:"12px 16px"}}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <span style={{display:"inline-flex", width:36, height:36, alignItems:"center", justifyContent:"center", background:"#4f46e5", color:"#fff", borderRadius:16, boxShadow:"0 1px 2px rgba(0,0,0,.08)"}}>β</span>
          <h1 style={{fontSize:"18px", fontWeight:600}}>מאגר שאלות ביוכימיה — תרגול</h1>
        </div>
        <span style={{display:"inline-block", border:"1px solid #cbd5e1", background:"#f1f5f9", padding:"2px 6px", borderRadius:8, fontSize:12, color:"#475569"}}>
          1–6 תשובה • R חשיפה • N הבאה • F חיפוש
        </span>
      </div>
    </header>
  );
}

// ---------- Storage helpers ----------
const STORAGE_KEY = "biochem-quiz-state-v1";
const SETTINGS_KEY = "biochem-quiz-settings-v1";
function saveState(obj){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch{} }
function loadState(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): null; } catch{ return null; } }
function saveSettings(obj){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); }catch{} }
function loadSettings(){ try{ const raw = localStorage.getItem(SETTINGS_KEY); return raw? JSON.parse(raw): null; } catch{ return null; } }

// ---------- Loader for questions.json or ?bank=URL ----------
async function tryLoadInitialBank() {
  try {
    const params = new URLSearchParams(location.search);
    const url = params.get('bank') || 'questions.json';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch { return null; }
}

function shuffle(arr){ for(let i=arr.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
const clsx=(...xs)=>xs.filter(Boolean).join(" ");

function Quiz() {
  const persisted = loadState();
  const persistedSettings = loadSettings();

  const [bank, setBank] = useState(persisted?.bank?.length ? persisted.bank : []);
  const [index, setIndex] = useState(persisted?.index ?? 0);
  const [order, setOrder] = useState(persisted?.order ?? []);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(persisted?.score ?? 0);
  const [attempts, setAttempts] = useState(persisted?.attempts ?? 0);
  const [streak, setStreak] = useState(persisted?.streak ?? 0);
  const [wrongIds, setWrongIds] = useState(new Set(persisted?.wrongIds ?? []));

  const [query, setQuery] = useState("");
  const [showOnlyWrong, setShowOnlyWrong] = useState(persistedSettings?.onlyWrong ?? false);
  const [noRepeatUntilAll, setNoRepeatUntilAll] = useState(persistedSettings?.noRepeat ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(persistedSettings?.shuffleOpts ?? true);
  const [compactMode, setCompactMode] = useState(persistedSettings?.compact ?? false);

  useEffect(()=>{ saveState({ bank, index, order, score, attempts, streak, wrongIds:[...wrongIds] }); }, [bank,index,order,score,attempts,streak,wrongIds]);
  useEffect(()=>{ saveSettings({ onlyWrong:showOnlyWrong, noRepeat:noRepeatUntilAll, shuffleOpts:shuffleOptions, compact:compactMode }); }, [showOnlyWrong,noRepeatUntilAll,shuffleOptions,compactMode]);

  useEffect(()=>{
    (async () => {
      if (bank.length) return;
      const loaded = await tryLoadInitialBank();
      if (loaded?.length) {
        setBank(loaded);
        setOrder(shuffle([...Array(loaded.length).keys()]));
        setIndex(0);
      }
    })();
  }, []);

  useEffect(()=>{
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "6") {
        const idx = Number(k)-1;
        const keys = currentOptions.map(o => o.key);
        if (idx < keys.length) handleChoose(keys[idx]);
      } else if (k === "n") next();
      else if (k === "r") setRevealed(v => !v);
      else if (k === "f") document.getElementById("search-input")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const filteredOrder = useMemo(()=>{
    const idsToUse = showOnlyWrong
      ? bank.map((q,i)=>({id:q.id,i})).filter(({id})=>wrongIds.has(id)).map(({i})=>i)
      : [...Array(bank.length).keys()];
    const ordered = (noRepeatUntilAll ? order : [...Array(bank.length).keys()]);
    const list = ordered.filter(i => idsToUse.includes(i));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(i => {
      const item = bank[i];
      const hay = (item.text + "\\n" + item.options.map(o=>o.text).join("\\n")).toLowerCase();
      return hay.includes(q);
    });
  }, [bank,order,query,showOnlyWrong,wrongIds,noRepeatUntilAll]);

  const currentIndexInFiltered = Math.min(index, Math.max(filteredOrder.length-1,0));
  const absoluteIndex = filteredOrder[currentIndexInFiltered] ?? 0;
  const current = bank[absoluteIndex] ?? bank[0];
  const currentOptions = useMemo(()=>{
    if (!current) return [];
    const opts = [...current.options];
    return shuffleOptions ? shuffle(opts) : opts;
  }, [absoluteIndex, bank, shuffleOptions]);

  function handleChoose(key){
    if (!current) return;
    setSelected(key);
    setAttempts(a=>a+1);
    const correct = key === current.answer;
    setRevealed(true);
    if (correct){
      setScore(s=>s+1);
      setStreak(s=>s+1);
      setWrongIds(set => { const n=new Set(set); n.delete(current.id); return n; });
    } else {
      setStreak(0);
      setWrongIds(set => { const n=new Set(set); n.add(current.id); return n; });
    }
  }
  function next(){
    setSelected(null);
    setRevealed(false);
    setIndex(i => {
      const atEnd = i >= filteredOrder.length - 1;
      return atEnd ? 0 : i + 1;
    });
  }
  function goPrev(){
    setSelected(null);
    setRevealed(false);
    setIndex(i => (i - 1 + filteredOrder.length) % filteredOrder.length);
  }
  function reshuffle(){
    setOrder(shuffle([...Array(bank.length).keys()]));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
  }
  function resetProgress(){
    setScore(0); setAttempts(0); setStreak(0); setWrongIds(new Set()); setIndex(0); setSelected(null); setRevealed(false);
  }
  const answeredPct = attempts ? Math.round((score/attempts)*100) : 0;

  return (
    <div style={{display:"grid", gap:16}}>
      <TopBar
        count={bank.length}
        currentNumber={currentIndexInFiltered + 1}
        onPrev={goPrev}
        onNext={next}
        onReshuffle={reshuffle}
        onReset={resetProgress}
        answeredPct={answeredPct}
        score={score}
        attempts={attempts}
        streak={streak}
      />
      <Controls
        query={query}
        onQuery={setQuery}
        showOnlyWrong={showOnlyWrong}
        setShowOnlyWrong={setShowOnlyWrong}
        noRepeatUntilAll={noRepeatUntilAll}
        setNoRepeatUntilAll={setNoRepeatUntilAll}
        shuffleOptions={shuffleOptions}
        setShuffleOptions={setShuffleOptions}
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        bank={bank}
        setBank={setBank}
        setOrder={setOrder}
        setIndex={setIndex}
      />
      <QuestionCard
        item={current}
        options={currentOptions}
        selected={selected}
        revealed={revealed}
        onChoose={handleChoose}
        onReveal={() => setRevealed(v => !v)}
        compact={compactMode}
      />
    </div>
  );
}

function TopBar({ count, currentNumber, onPrev, onNext, onReshuffle, onReset, answeredPct, score, attempts, streak }){
  const chip = (bg, color, children) => (
    <span style={{display:"inline-flex", alignItems:"center", gap:8, background:bg, color, borderRadius:12, padding:"4px 10px", fontSize:14}}>{children}</span>
  );
  const btn = (label, onClick, primary=false, danger=false)=>(
    <button onClick={onClick} style={{
      border:"1px solid " + (primary? "#4f46e5" : danger? "#e11d48" : "#e2e8f0"),
      background: primary? "#4f46e5" : danger? "#e11d48" : "#fff",
      color: primary? "#fff" : danger? "#fff" : "#0f172a",
      borderRadius:12, padding:"6px 12px", fontSize:14, cursor:"pointer"
    }}>{label}</button>
  );
  return (
    <div style={{display:"flex", flexDirection:"column", gap:12, border:"1px solid #e2e8f0", background:"#fff", padding:12, borderRadius:16, boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
        {chip("#f1f5f9","#0f172a", <>שאלה <b>{currentNumber}</b> מתוך <b>{count}</b></>)}
        {chip("#ecfeff","#0369a1", <>דיוק: <b>{answeredPct}%</b></>)}
        {chip("#eef2ff","#3730a3", <>ניקוד: <b>{score}</b>/<b>{attempts}</b></>)}
        {chip("#fff7ed","#9a3412", <>רצף: <b>{streak}</b></>)}
      </div>
      <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
        {btn("הקודמת", onPrev)}
        {btn("לשאלה הבאה", onNext, true)}
        {btn("ערבב", onReshuffle)}
        {btn("איפוס התקדמות", onReset, false, true)}
      </div>
    </div>
  );
}

function Controls({ query, onQuery, showOnlyWrong, setShowOnlyWrong, noRepeatUntilAll, setNoRepeatUntilAll, shuffleOptions, setShuffleOptions, compactMode, setCompactMode, bank, setBank, setOrder, setIndex }){
  const [showImport, setShowImport] = useState(false);
  const [raw, setRaw] = useState("");
  const [jsonTxt, setJsonTxt] = useState("");

  function doImportRaw(){
    const parsed = parseRawBank(raw);
    if (!parsed.length) return alert("לא זוהו שאלות. ודא שהטקסט כולל A) … ANSWER: X");
    setBank(parsed);
    setOrder(shuffle([...Array(parsed.length).keys()]));
    setIndex(0);
    setShowImport(false);
    setRaw("");
  }
  function doImportJSON(){
    try{
      const parsed = JSON.parse(jsonTxt);
      if (!Array.isArray(parsed)) throw new Error("format");
      setBank(parsed);
      setOrder(shuffle([...Array(parsed.length).keys()]));
      setIndex(0);
      setShowImport(false);
      setJsonTxt("");
    }catch(e){ alert("JSON לא תקין"); }
  }
  function doExportJSON(){
    const blob = new Blob([JSON.stringify(bank, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "biochem-questions.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data) || !data.length) throw new Error('bad');
        setBank(data);
        setOrder(shuffle([...Array(data.length).keys()]));
        setIndex(0);
      }catch(err){
        alert('JSON לא תקין — צפה למערך של אובייקטים עם id, text, options[], answer');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const box = {border:"1px solid #e2e8f0", background:"#fff", padding:16, borderRadius:16, boxShadow:"0 1px 2px rgba(0,0,0,.04)"};
  const label = {fontSize:14, color:"#475569"};
  const row = {display:"grid", gridTemplateColumns: "1fr 1fr 1fr", gap:12};
  const toggle = (checked, setChecked, text) => (
    <label style={{display:"flex", alignItems:"center", gap:8, border:"1px solid #e2e8f0", padding:"8px 12px", borderRadius:12}}>
      <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} />
      <span style={{fontSize:14}}>{text}</span>
    </label>
  );
  const btn = (label, onClick)=> <button onClick={onClick} style={{border:"1px solid #e2e8f0", background:"#fff", borderRadius:12, padding:"6px 12px", cursor:"pointer"}}>{label}</button>;
  const btnPrimary = (label, onClick)=> <button onClick={onClick} style={{border:"1px solid #4f46e5", background:"#4f46e5", color:"#fff", borderRadius:12, padding:"6px 12px", cursor:"pointer"}}>{label}</button>;

  return (
    <div style={box}>
      <div style={row}>
        <label style={{display:"flex", alignItems:"center", gap:8, border:"1px solid #e2e8f0", padding:"8px 12px", borderRadius:12}}>
          <span style={label}>חיפוש</span>
          <input id="search-input" value={query} onChange={e=>onQuery(e.target.value)} placeholder="טקסט בשאלה / תשובות" style={{width:"100%", border:"none", outline:"none", background:"transparent"}}/>
        </label>
        {toggle(showOnlyWrong, setShowOnlyWrong, "רק שאלות שטעיתי בהן")}
        {toggle(noRepeatUntilAll, setNoRepeatUntilAll, "בלי חזרות עד שמסיימים")}
        {toggle(shuffleOptions, setShuffleOptions, "ערבב תשובות")}
        {toggle(compactMode, setCompactMode, "מצב קומפקטי")}
        <div style={{display:"flex", flexWrap:"wrap", gap:8, paddingTop:4, alignItems:"center"}}>
          {btn("ייבוא / ייצוא", ()=>setShowImport(v=>!v))}
          {btn("ייצא JSON", doExportJSON)}
          <label style={{border:"1px solid #e2e8f0", background:"#fff", borderRadius:12, padding:"6px 12px", cursor:"pointer"}}>
            טען קובץ JSON
            <input type="file" accept="application/json" style={{display:"none"}} onChange={onFile} />
          </label>
        </div>
      </div>

      {showImport && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16}}>
          <div>
            <h3 style={{marginBottom:8, fontSize:14, fontWeight:600}}>ייבוא RAW (הדבק טקסט — *כולל* ANSWER: X)</h3>
            <textarea value={raw} onChange={e=>setRaw(e.target.value)} style={{minHeight:180, width:"100%", border:"1px solid #cbd5e1", borderRadius:12, padding:8}} placeholder={"הדבק כאן בלוקי שאלות בפורמט:\\nשאלה\\nA) …\\nB) …\\nC) …\\nD) …\\nANSWER: C"} />
            <div style={{marginTop:8, display:"flex", gap:8}}>
              {btnPrimary("ייבא RAW", doImportRaw)}
              {btn("נקה", ()=>setRaw(""))}
            </div>
          </div>
          <div>
            <h3 style={{marginBottom:8, fontSize:14, fontWeight:600}}>ייבוא JSON (מערך של שאלות)</h3>
            <textarea value={jsonTxt} onChange={e=>setJsonTxt(e.target.value)} style={{minHeight:180, width:"100%", border:"1px solid #cbd5e1", borderRadius:12, padding:8}} placeholder='[ { "id":1, "text":"...", "options":[{"key":"A","text":"..."},...], "answer":"B" } ]' />
            <div style={{marginTop:8, display:"flex", gap:8}}>
              {btnPrimary("ייבא JSON", doImportJSON)}
              {btn("נקה", ()=>setJsonTxt(""))}
            </div>
          </div>
        </div>
      )}

      <p style={{marginTop:12, fontSize:12, color:"#64748b"}}>
        טיפ: אפשר לסנן לפי מילת מפתח (למשל “גליקוליזה”, “אוראה”, “חומצות שומן”), לתרגל רק את מה שטעיתם בו, ולשמור התקדמות בדפדפן.
      </p>
    </div>
  );
}

function QuestionCard({ item, options, selected, revealed, onChoose, onReveal, compact }){
  if (!item) return <div style={{padding:16, border:"1px solid #e2e8f0", background:"#fff", borderRadius:16}}>טוען שאלות… ודא שקיים <code>public/questions.json</code> או טען JSON ידני.</div>;
  const opt = (o) => {
    const isCorrect = revealed && o.key === item.answer;
    const isWrong = revealed && selected && o.key === selected && o.key !== item.answer;
    const style = {
      width:"100%", textAlign:"right", borderRadius:12, padding:"10px 12px",
      border:"1px solid " + (isCorrect? "#a7f3d0" : isWrong? "#fecaca" : "#e2e8f0"),
      background: isCorrect? "#ecfdf5" : isWrong? "#fff1f2" : "#fff",
      cursor:"pointer"
    };
    return (
      <li key={o.key}>
        <button onClick={()=>onChoose(o.key)} style={style}>
          <div style={{display:"flex", alignItems:"start", gap:8}}>
            <span style={{marginTop:2, display:"inline-flex", width:24, height:24, alignItems:"center", justifyContent:"center", background:"#f1f5f9", borderRadius:6, fontSize:12, fontWeight:600, color:"#334155"}}>{o.key}</span>
            <span style={{lineHeight:"1.5"}}>{o.text}</span>
          </div>
        </button>
      </li>
    );
  };
  return (
    <div style={{border:"1px solid #e2e8f0", background:"#fff", padding:16, borderRadius:16}}>
      <div style={{display:"flex", gap:12, marginBottom:12}}>
        <div style={{width:32, height:32, borderRadius:10, background:"#4f46e5", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}>
          {typeof item.id === 'number' ? item.id : 'Q'}
        </div>
        <div style={{fontSize: compact? 16: 18, lineHeight:1.6}}>{item.text}</div>
      </div>
      <ul style={{display:"grid", gap:8, gridTemplateColumns: compact? "1fr 1fr" : "1fr"}}>
        {options.map(opt)}
      </ul>
      <div style={{marginTop:12, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
        <button onClick={onReveal} style={{border:"1px solid #e2e8f0", background:"#fff", borderRadius:12, padding:"6px 12px", cursor:"pointer"}}>{revealed ? "הסתר תשובה" : "חשוף תשובה"}</button>
        <span style={{fontSize:14, color:"#64748b"}}>תשובה נכונה: <b>{revealed ? item.answer : "?"}</b></span>
      </div>
    </div>
  );
}

function Footer(){
  return (
    <footer style={{borderTop:"1px solid #e2e8f0", background:"rgba(255,255,255,0.7)", padding:"16px 0"}}>
      <div style={{maxWidth:"960px", margin:"0 auto", padding:"0 16px", fontSize:12, color:"#64748b"}}>
        נבנה לצורכי לימוד — שמירה בדפדפן בלבד. אפשר לייבא מאגר משלך (RAW/JSON) ולפרסם בגיטהאב פייג'ס.
      </div>
    </footer>
  );
}

// RAW parser (A) lines + ANSWER: X
function parseRawBank(raw){
  const cleaned = raw.replace(/\\r/g, "");
  const regex = /(.*?)(?:\\n|^)\\s*ANSWER:\\s*([A-F])\\s*(?=\\n|$)/gs;
  const blocks = [];
  let match;
  while ((match = regex.exec(cleaned))){
    const block = match[1].trim();
    const answer = match[2].trim();
    const optRegex = /\\n\\s*([A-F])\\)\\s*(.+?)(?=(?:\\n\\s*[A-F]\\)|$))/gs;
    const firstOptIdx = block.search(/\\n\\s*[A-F]\\)\\s*/);
    let stem = block;
    let opts = [];
    if (firstOptIdx !== -1){
      stem = block.slice(0, firstOptIdx).trim();
      let m;
      while ((m = optRegex.exec(block)) !== null){
        opts.push({ key: m[1].trim(), text: m[2].trim() });
      }
    }
    let id = undefined;
    const idEnd = stem.match(/(\\d{1,4})\\s*$/);
    const idStart = stem.match(/^(\\d{1,4})\\s*[\\).:-]?\\s*/);
    if (idEnd) id = idEnd[1];
    else if (idStart) id = idStart[1];
    stem = stem.replace(/^\\?\\s*/, "").trim();
    if (stem && opts.length >= 2){
      blocks.push({ id: id ?? crypto.randomUUID(), text: stem, options: opts, answer: answer });
    }
  }
  return blocks;
}
