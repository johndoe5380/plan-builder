(function () {
"use strict";

/* ---------------- utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const LIB = (window.EXERCISE_LIBRARY || []).map(x => ({ ...x }));
const STORE = "onward-planbuilder-v1";
const KEYSTORE = "onward-planbuilder-ytkey";
const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
const ytUrl = id => `https://www.youtube.com/watch?v=${id}`;
const PLAY = '<svg width="14" height="16" viewBox="0 0 18 20" aria-hidden="true"><path d="M0 0l18 10L0 20z" fill="#003333"/></svg>';
const PLAY_L = '<svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M0 0l18 10L0 20z" fill="#003333"/></svg>';
const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => { if (!d) return ""; const t = new Date(d + "T12:00:00"); return isNaN(t) ? d : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2200);
}
function vid(libItem) { return libItem ? { id: libItem.id, title: libItem.title, channel: libItem.channel } : null; }
function libByName(n) { return LIB.find(x => x.name === n); }

/* ---------------- seed data ---------------- */
function seed() {
  return {
    currentId: "alex",
    patients: [
      {
        id: "alex", name: "Alex Patacchiola", therapist: "Christina", focus: "Shoulder rehab", updated: "2026-11-02",
        goals: [
          { title: "Get strong", detail: "Keep training as normal while the shoulder work runs alongside it.", status: "Ongoing" },
          { title: "Snowboard-ready knee", detail: "Build tolerance to lateral motion.", status: "Ongoing" },
          { title: "Left quad, mid-range", detail: "Check isolated L quad strength. Likely start: quad isometrics such as single-leg wall sits or split squat isos.", status: "After assessment" }
        ],
        sections: [{
          id: uid(), title: "Shoulder rehab", exercises: [
            { id: uid(), name: "Rotator cuff trio", reps: "15 each", load: "2.5 lb", freq: "3× / week", perWeek: 3, notes: "Do it as your warm-up before training.", video: vid(LIB[0]) },
            { id: uid(), name: "Lat eccentrics", reps: "10–15", load: "5–10 lb on PVC", freq: "As needed", perWeek: 0, notes: "Use these to open up overhead range of motion.\nWe didn't cover this one in session, but it's easy to set up from the video. Wes knows about these and can help.", video: vid(LIB[1]) }
          ]
        }],
        guard: { intro: "Continue training as normal. Stop or modify if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Sharp or stabbing pain", "You notice compensation patterns", "Pain stays elevated for more than 24 hours"] }
      },
      {
        id: "sample", name: "Sample Patient", therapist: "Christina", focus: "Knee: return to running", updated: today(),
        goals: [
          { title: "Run 5K pain-free", detail: "Build back to three easy runs a week.", status: "Ongoing" },
          { title: "Single-leg strength", detail: "Even out left vs right on step-downs.", status: "Next" }
        ],
        sections: [
          { id: uid(), title: "Knee strength", exercises: [
            { id: uid(), name: "Spanish squat", reps: "5 × 45 s hold", load: "Heavy band", freq: "4× / week", perWeek: 4, notes: "", video: vid(libByName("Spanish squat")) },
            { id: uid(), name: "Step-downs", reps: "3 × 10 each", load: "Bodyweight", freq: "3× / week", perWeek: 3, notes: "Slow on the way down, knee tracks over the 2nd toe.", video: vid(libByName("Step-downs")) }
          ]},
          { id: uid(), title: "Lower leg + balance", exercises: [
            { id: uid(), name: "Calf raises", reps: "3 × 15", load: "Bodyweight", freq: "Daily", perWeek: 0, notes: "", video: vid(libByName("Calf raises (straight + bent knee)")) },
            { id: uid(), name: "Single-leg balance", reps: "3 × 30 s", load: "—", freq: "Daily", perWeek: 0, notes: "", video: vid(libByName("Single-leg balance")) }
          ]}
        ],
        guard: { intro: "Some soreness is expected. Back off if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Swelling the next morning", "Pain stays elevated for more than 24 hours"] }
      }
    ]
  };
}

let db;
try { db = JSON.parse(lsGet(STORE)); } catch (e) { db = null; }
if (!db || !Array.isArray(db.patients) || !db.patients.length) db = seed();
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(() => lsSet(STORE, JSON.stringify(db)), 200); }
const cur = () => db.patients.find(p => p.id === db.currentId) || db.patients[0];
function apiKey() { return (lsGet(KEYSTORE) || window.YT_API_KEY || "").trim(); }

/* ---------------- share encoding ---------------- */
function encodePlan(p) {
  const slim = { n: p.name, t: p.therapist, f: p.focus, u: p.updated, g: p.goals, s: p.sections.map(s => ({ t: s.title, e: s.exercises.map(e => ({ i: e.id, n: e.name, r: e.reps, l: e.load, f: e.freq, w: e.perWeek, o: e.notes, v: e.video ? [e.video.id, e.video.title, e.video.channel] : null })) })), x: p.guard };
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodePlan(s) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const o = JSON.parse(decodeURIComponent(escape(atob(b))));
  return { id: "shared", name: o.n, therapist: o.t, focus: o.f, updated: o.u, goals: o.g || [], guard: o.x || { signs: [] },
    sections: (o.s || []).map(s => ({ title: s.t, exercises: s.e.map(e => ({ id: e.i, name: e.n, reps: e.r, load: e.l, freq: e.f, perWeek: e.w, notes: e.o, video: e.v ? { id: e.v[0], title: e.v[1], channel: e.v[2] } : null })) })) };
}
function shareUrl(p) { return location.origin + location.pathname + "#view=" + encodePlan(p); }

/* ---------------- router ---------------- */
function route() {
  const h = location.hash.slice(1);
  if (h.startsWith("view=")) {
    try { renderPatient(decodePlan(h.slice(5)), false); }
    catch (e) { $("#app").innerHTML = `<div class="pv-wrap gut" style="padding-block:60px"><h2>This plan link looks incomplete.</h2><p>Ask your therapist to send the link again.</p></div>`; }
  } else if (h.startsWith("preview=")) {
    const p = db.patients.find(x => x.id === h.slice(8)) || cur();
    renderPatient(p, true);
  } else {
    renderClinician();
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ================= CLINICIAN ================= */
function renderClinician() {
  document.title = "Onward Plan Builder (Demo)";
  const p = cur();
  $("#app").innerHTML = `
  <header class="bar"><div class="bar-in gut">
    <img src="logo.png" alt="Onward Physical Therapy">
    <span class="app">Plan Builder</span><span class="demo">Demo</span>
    <span class="sp"></span>
    <button class="ghost" data-act="settings" type="button">Settings</button>
  </div></header>
  <div class="shell gut">
    <aside class="rail">
      <div class="rail-head"><h2>Patients</h2><button class="btn sm" data-act="new-patient" type="button">+ New</button></div>
      <ul class="plist" id="plist"></ul>
      <div class="rail-foot">Demo build. Plans save in this browser only.</div>
    </aside>
    <main class="ed" id="ed"></main>
  </div>`;
  renderRail();
  renderEditor(p);
}
function renderRail() {
  const p = cur();
  $("#plist").innerHTML = db.patients.map(x => {
    const n = x.sections.reduce((a, s) => a + s.exercises.length, 0);
    return `<li><button type="button" data-act="pick-patient" data-id="${x.id}" aria-current="${x.id === p.id}"><b>${esc(x.name || "Untitled patient")}</b><small>${esc(x.focus || "No focus set")} · ${n} exercise${n === 1 ? "" : "s"}</small></button></li>`;
  }).join("");
}

function renderEditor(p) {
  const statuses = ["Ongoing", "Next", "After assessment", "Done"];
  $("#ed").innerHTML = `
  <section class="card">
    <div class="top">
      <div style="flex:1;min-width:220px">
        <div class="eyebrow">Home exercise program</div>
        <input class="name-in" id="f-name" data-b="name" value="${esc(p.name)}" placeholder="Patient name" aria-label="Patient name">
      </div>
      <div class="actions">
        <a class="btn" href="#preview=${p.id}">Preview as patient</a>
        <button class="btn primary" data-act="share" type="button">Copy patient link</button>
      </div>
    </div>
    <div class="fields" style="margin-top:16px">
      <label class="f" for="f-ther">Therapist<input class="in" id="f-ther" data-b="therapist" value="${esc(p.therapist)}"></label>
      <label class="f" for="f-focus">Focus<input class="in" id="f-focus" data-b="focus" value="${esc(p.focus)}"></label>
      <label class="f" for="f-upd">Updated<input class="in" id="f-upd" type="date" data-b="updated" value="${esc(p.updated)}"></label>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h2>Goals</h2><button class="btn sm" data-act="add-goal" type="button">+ Goal</button></div>
    ${p.goals.length ? "" : '<p class="hint">No goals yet.</p>'}
    ${p.goals.map((g, i) => `
      <div class="goal-row">
        <input class="in" id="g-t-${i}" data-b="goals.${i}.title" value="${esc(g.title)}" placeholder="Goal" aria-label="Goal">
        <input class="in gd" id="g-d-${i}" data-b="goals.${i}.detail" value="${esc(g.detail)}" placeholder="Details" aria-label="Goal details">
        <select class="in" id="g-s-${i}" data-b="goals.${i}.status" aria-label="Goal status">${statuses.map(s => `<option${s === g.status ? " selected" : ""}>${s}</option>`).join("")}</select>
        <button class="icon-btn" data-act="del-goal" data-i="${i}" type="button" aria-label="Remove goal">${TRASH}</button>
      </div>`).join("")}
  </section>

  <section class="card">
    <div class="card-head"><div><h2>Exercises</h2><p class="hint">Pick from the library, search YouTube, or paste a link. No copy-pasting into a sheet.</p></div><button class="btn sm" data-act="add-section" type="button">+ Section</button></div>
    ${p.sections.map((s, si) => `
      <div class="sec">
        <div class="sec-head">
          <input class="sec-title" id="s-${si}" data-b="sections.${si}.title" value="${esc(s.title)}" placeholder="Section name" aria-label="Section name">
          <button class="icon-btn" data-act="del-section" data-si="${si}" type="button" aria-label="Remove section">${TRASH}</button>
        </div>
        ${s.exercises.map((e, ei) => exRow(e, si, ei)).join("")}
        <div class="add-ex">
          <button class="btn primary sm" data-act="open-picker" data-si="${si}" type="button">+ Add exercise with video</button>
          <button class="btn sm" data-act="add-blank" data-si="${si}" type="button">+ Blank exercise</button>
        </div>
      </div>`).join("")}
  </section>

  <section class="card">
    <div class="card-head"><div><h2>When to back off</h2><p class="hint">Shown to the patient as a pain scale plus stop signs.</p></div></div>
    <div class="fields" style="grid-template-columns:minmax(0,1fr) 140px;margin-bottom:12px">
      <label class="f" for="gd-intro">Message<input class="in" id="gd-intro" data-b="guard.intro" value="${esc(p.guard.intro)}"></label>
      <label class="f" for="gd-th">Pain limit (0–10)<input class="in" id="gd-th" type="number" min="0" max="10" data-b="guard.threshold" data-num="1" value="${esc(p.guard.threshold)}"></label>
    </div>
    ${p.guard.signs.map((s, i) => `<div class="sign-row"><input class="in" id="sg-${i}" data-b="guard.signs.${i}" value="${esc(s)}" aria-label="Stop sign"><button class="icon-btn" data-act="del-sign" data-i="${i}" type="button" aria-label="Remove">${TRASH}</button></div>`).join("")}
    <button class="btn sm" data-act="add-sign" type="button">+ Stop sign</button>
  </section>

  <div style="display:flex;justify-content:flex-end"><button class="btn sm" data-act="del-patient" type="button" style="color:var(--stop)">Delete this patient</button></div>`;
}

function exRow(e, si, ei) {
  const v = e.video;
  return `
  <div class="exr">
    <div class="vslot">
      ${v ? `<button class="vthumb" type="button" data-act="change-video" data-si="${si}" data-ei="${ei}" aria-label="Change video"><img src="${thumb(v.id)}" alt="" loading="lazy"><span class="pi"><span>${PLAY}</span></span></button>
             <button class="btn link" type="button" data-act="change-video" data-si="${si}" data-ei="${ei}">Change video</button>`
          : `<button class="vempty" type="button" data-act="change-video" data-si="${si}" data-ei="${ei}">+ Add video</button>`}
    </div>
    <div class="exf">
      <div class="row">
        <label class="mini" for="e-n-${e.id}">Exercise<input class="in ex-name" id="e-n-${e.id}" data-b="sections.${si}.exercises.${ei}.name" value="${esc(e.name)}"></label>
        <label class="mini" for="e-r-${e.id}">Sets / reps<input class="in" id="e-r-${e.id}" data-b="sections.${si}.exercises.${ei}.reps" value="${esc(e.reps)}"></label>
        <label class="mini" for="e-l-${e.id}">Load<input class="in" id="e-l-${e.id}" data-b="sections.${si}.exercises.${ei}.load" value="${esc(e.load)}"></label>
        <label class="mini" for="e-f-${e.id}">Frequency<input class="in" id="e-f-${e.id}" data-b="sections.${si}.exercises.${ei}.freq" value="${esc(e.freq)}" list="freqs"></label>
      </div>
      <label class="mini" for="e-o-${e.id}">Notes for patient<textarea class="in" id="e-o-${e.id}" rows="2" data-b="sections.${si}.exercises.${ei}.notes">${esc(e.notes)}</textarea></label>
      ${v ? `<div class="vtitle">▶ ${esc(v.title)}${v.channel ? " · " + esc(v.channel) : ""}</div>` : ""}
    </div>
    <button class="icon-btn" data-act="del-ex" data-si="${si}" data-ei="${ei}" type="button" aria-label="Remove exercise">${TRASH}</button>
  </div>`;
}

function perWeekFrom(freq) {
  const m = String(freq || "").match(/(\d+)\s*[x×]?\s*(?:\/|per|a)\s*w(ee)?k/i);
  return m ? Math.min(7, parseInt(m[1], 10)) : (/daily|every day/i.test(freq || "") ? 7 : 0);
}

function setPath(obj, path, val) {
  const ks = path.split("."); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = val;
}

document.addEventListener("input", e => {
  const el = e.target.closest("[data-b]"); if (!el || !$("#ed")) return;
  const p = cur(); let val = el.value;
  if (el.dataset.num) val = Math.max(0, Math.min(10, parseInt(val || "0", 10) || 0));
  setPath(p, el.dataset.b, val);
  const m = el.dataset.b.match(/^sections\.(\d+)\.exercises\.(\d+)\.freq$/);
  if (m) p.sections[+m[1]].exercises[+m[2]].perWeek = perWeekFrom(val);
  save();
  if (/^(name|focus)$/.test(el.dataset.b)) renderRail();
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, p = cur();
  const si = +b.dataset.si, ei = +b.dataset.ei, i = +b.dataset.i;
  const rerender = () => { save(); renderEditor(p); renderRail(); };
  switch (a) {
    case "settings": openSettings(); break;
    case "new-patient": {
      const np = { id: uid(), name: "", therapist: p.therapist || "", focus: "", updated: today(), goals: [{ title: "", detail: "", status: "Ongoing" }], sections: [{ id: uid(), title: "Home program", exercises: [] }], guard: { intro: "Stop or modify if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Sharp or stabbing pain", "Pain stays elevated for more than 24 hours"] } };
      db.patients.unshift(np); db.currentId = np.id; save(); renderRail(); renderEditor(np); $("#f-name").focus(); break;
    }
    case "pick-patient": db.currentId = b.dataset.id; save(); renderRail(); renderEditor(cur()); break;
    case "del-patient":
      if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to delete"; setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Delete this patient"; }, 3000); break; }
      db.patients = db.patients.filter(x => x.id !== p.id);
      if (!db.patients.length) db = seed();
      db.currentId = db.patients[0].id; save(); renderRail(); renderEditor(cur()); toast("Patient deleted"); break;
    case "add-goal": p.goals.push({ title: "", detail: "", status: "Ongoing" }); rerender(); break;
    case "del-goal": p.goals.splice(i, 1); rerender(); break;
    case "add-section": p.sections.push({ id: uid(), title: "New section", exercises: [] }); rerender(); break;
    case "del-section": p.sections.splice(si, 1); rerender(); break;
    case "add-blank": p.sections[si].exercises.push({ id: uid(), name: "", reps: "", load: "", freq: "", perWeek: 0, notes: "", video: null }); rerender(); break;
    case "del-ex": p.sections[si].exercises.splice(ei, 1); rerender(); break;
    case "add-sign": p.guard.signs.push(""); rerender(); break;
    case "del-sign": p.guard.signs.splice(i, 1); rerender(); break;
    case "open-picker": openPicker({ mode: "add", si }); break;
    case "change-video": openPicker({ mode: "replace", si, ei }); break;
    case "share": {
      const url = shareUrl(p);
      try { await navigator.clipboard.writeText(url); toast("Patient link copied. Text or email it to " + (p.name.split(" ")[0] || "your patient") + "."); }
      catch (err) { window.prompt("Copy this patient link:", url); }
      break;
    }
  }
});

/* ---------------- picker ---------------- */
const pk = { mode: "add", si: 0, ei: 0, tab: "lib", q: "", region: "All", sel: null, ytQ: "", ytRes: null, ytErr: "", ytLoading: false, paste: "", pasteMsg: "" };
const dlg = $("#picker");

function openPicker(o) {
  Object.assign(pk, o, { sel: null, pasteMsg: "" });
  if (o.mode === "replace") {
    const ex = cur().sections[o.si].exercises[o.ei];
    pk.q = ""; pk.ytQ = ex.name || pk.ytQ;
    $("#pk-title").textContent = "Choose a video" + (ex.name ? " for " + ex.name : "");
  } else { $("#pk-title").textContent = "Add exercise"; }
  setTab(pk.tab);
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  setTimeout(() => { const s = $("#pk-pane input"); if (s) s.focus(); }, 30);
}
function closePicker() { $("#pk-preview").innerHTML = ""; dlg.close ? dlg.close() : dlg.removeAttribute("open"); }
$("#pk-close").onclick = closePicker;
dlg.addEventListener("close", () => { $("#pk-preview").innerHTML = ""; });
dlg.addEventListener("click", e => { if (e.target === dlg) closePicker(); });
document.querySelectorAll(".tabs [data-tab]").forEach(t => t.onclick = () => setTab(t.dataset.tab));

function setTab(t) {
  pk.tab = t;
  document.querySelectorAll(".tabs [data-tab]").forEach(x => x.setAttribute("aria-selected", x.dataset.tab === t));
  renderPane(); renderPreview();
}

function card(v, extra) {
  const sel = pk.sel && pk.sel.id === v.id;
  return `<button class="vc" type="button" data-pick="${esc(v.id)}" aria-selected="${!!sel}">
    <img src="${thumb(v.id)}" alt="" loading="lazy">
    <span class="t">${extra || ""}<b>${esc(v.name || v.title)}</b><small>${esc(v.name ? v.title : v.channel)}</small>${v.name ? `<small>${esc(v.channel)}${v.length ? " · " + esc(v.length) : ""}</small>` : ""}</span>
  </button>`;
}

function renderPane() {
  const pane = $("#pk-pane");
  if (pk.tab === "lib") {
    const regions = ["All", ...new Set(LIB.map(x => x.region))];
    const q = pk.q.toLowerCase();
    const list = LIB.filter(x => (pk.region === "All" || x.region === pk.region) && (!q || (x.name + " " + x.title + " " + x.region).toLowerCase().includes(q)));
    pane.innerHTML = `
      <div class="search"><input class="in" id="pk-q" type="search" placeholder="Search ${LIB.length} exercises (e.g. wall sit, rotator cuff)" value="${esc(pk.q)}" aria-label="Search library"></div>
      <div class="chips">${regions.map(r => `<button class="chip" type="button" data-region="${esc(r)}" aria-pressed="${r === pk.region}">${esc(r)}</button>`).join("")}</div>
      ${list.length ? `<div class="grid">${list.map(x => card(x, `<span class="tag">${esc(x.region)}</span>`)).join("")}</div>`
        : `<div class="empty">Nothing in the library matches <b>${esc(pk.q)}</b>.<br><button class="btn sm" style="margin-top:10px" type="button" data-goyt="1">Search YouTube for “${esc(pk.q)}”</button></div>`}`;
    const qi = $("#pk-q"); qi.oninput = () => { pk.q = qi.value; const pos = qi.selectionStart; renderPane(); const n = $("#pk-q"); n.focus(); n.setSelectionRange(pos, pos); };
  } else if (pk.tab === "yt") {
    const key = apiKey();
    if (!key) {
      pane.innerHTML = `<div class="note-box"><b>Live YouTube search needs a free API key.</b>
        <ol>
          <li>Go to console.cloud.google.com and create a project.</li>
          <li>Enable <b>YouTube Data API v3</b>.</li>
          <li>Create an API key under Credentials, then restrict it to this website.</li>
          <li>Paste it in <button class="btn link" type="button" data-act="settings" style="padding:0">Settings</button>.</li>
        </ol></div>
        <p class="hint" style="margin-top:12px">Meanwhile, the exercise library and Paste a link both work without a key.</p>`;
      return;
    }
    pane.innerHTML = `
      <form class="search" id="yt-form"><input class="in" id="yt-q" type="search" placeholder="Search YouTube, e.g. copenhagen plank regression" value="${esc(pk.ytQ)}" aria-label="Search YouTube"><button class="btn primary" type="submit">Search</button></form>
      <p class="hint" style="margin-bottom:10px">Results are limited to short videos under 4 minutes.</p>
      <div id="yt-res">${pk.ytLoading ? '<div class="empty">Searching…</div>' : pk.ytErr ? `<div class="empty">${esc(pk.ytErr)}</div>` : pk.ytRes ? (pk.ytRes.length ? `<div class="grid">${pk.ytRes.map(v => card(v)).join("")}</div>` : '<div class="empty">No results. Try different words.</div>') : '<div class="empty">Type an exercise and press Search.</div>'}</div>`;
    $("#yt-form").onsubmit = ev => { ev.preventDefault(); pk.ytQ = $("#yt-q").value.trim(); ytSearch(); };
  } else {
    pane.innerHTML = `
      <label class="f" for="paste-in">YouTube link<input class="in" id="paste-in" type="url" placeholder="https://youtube.com/shorts/…  or  https://youtu.be/…" value="${esc(pk.paste)}"></label>
      <p class="hint" style="margin-top:8px">${esc(pk.pasteMsg || "Paste any YouTube, Shorts, or youtu.be link. The title fills in automatically.")}</p>`;
    const pi = $("#paste-in"); pi.oninput = () => onPaste(pi.value);
  }
}

async function ytSearch() {
  if (!pk.ytQ) return;
  pk.ytLoading = true; pk.ytErr = ""; renderPane();
  try {
    const u = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=18&safeSearch=strict&q=" + encodeURIComponent(pk.ytQ) + "&key=" + encodeURIComponent(apiKey());
    const r = await fetch(u); const j = await r.json();
    if (j.error) throw new Error(j.error.message || "Search failed");
    pk.ytRes = j.items.map(it => ({ id: it.id.videoId, title: decodeHtml(it.snippet.title), channel: it.snippet.channelTitle }));
  } catch (err) { pk.ytErr = "YouTube search failed: " + err.message + " Check the API key in Settings."; pk.ytRes = null; }
  pk.ytLoading = false; renderPane();
}
function decodeHtml(s) { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }

function parseYt(s) {
  s = (s || "").trim();
  const m = s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}
let pasteSeq = 0;
async function onPaste(val) {
  pk.paste = val; const id = parseYt(val); const seq = ++pasteSeq;
  if (!id) { pk.sel = null; pk.pasteMsg = val ? "That doesn't look like a YouTube link yet." : ""; $(".hint", $("#pk-pane")).textContent = pk.pasteMsg || "Paste any YouTube, Shorts, or youtu.be link. The title fills in automatically."; renderPreview(); return; }
  pk.sel = { id, title: "YouTube video", channel: "" }; renderPreview();
  try {
    const r = await fetch("https://noembed.com/embed?url=" + encodeURIComponent(ytUrl(id)));
    const j = await r.json();
    if (seq !== pasteSeq) return;
    if (j.title) { pk.sel = { id, title: j.title, channel: j.author_name || "" }; renderPreview(); }
  } catch (e) {}
}

$("#pk-pane").addEventListener("click", e => {
  const r = e.target.closest("[data-region]");
  if (r) { pk.region = r.dataset.region; renderPane(); return; }
  if (e.target.closest("[data-goyt]")) { pk.ytQ = pk.q; setTab("yt"); if (apiKey()) ytSearch(); return; }
  const c = e.target.closest("[data-pick]"); if (!c) return;
  const id = c.dataset.pick;
  const pool = pk.tab === "lib" ? LIB : (pk.ytRes || []);
  const v = pool.find(x => x.id === id); if (!v) return;
  pk.sel = { id: v.id, title: v.title, channel: v.channel, name: v.name || "" };
  document.querySelectorAll("#pk-pane .vc").forEach(x => x.setAttribute("aria-selected", x.dataset.pick === id));
  renderPreview();
});

function renderPreview() {
  const box = $("#pk-preview"), v = pk.sel;
  if (!v) { box.innerHTML = `<div class="player">Pick a video to watch it here</div><p class="hint">Preview plays right here. No trip to YouTube.</p>`; return; }
  const ex = pk.mode === "replace" ? cur().sections[pk.si].exercises[pk.ei] : null;
  const defName = ex ? ex.name : (v.name || guessName(v.title));
  box.innerHTML = `
    <div class="player"><iframe src="${embed(v.id)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
    <div><h4>${esc(v.title)}</h4><div class="meta">${esc(v.channel || "")}</div></div>
    ${pk.mode === "add" ? `<label class="f" for="pk-name">Exercise name<input class="in" id="pk-name" value="${esc(defName)}"></label>
      <div class="fields" style="grid-template-columns:1fr 1fr">
        <label class="f" for="pk-reps">Sets / reps<input class="in" id="pk-reps" placeholder="3 × 10"></label>
        <label class="f" for="pk-freq">Frequency<input class="in" id="pk-freq" placeholder="3× / week" list="freqs"></label>
      </div>` : ""}
    <button class="btn primary" type="button" id="pk-use">${pk.mode === "add" ? "Add to plan" : "Use this video"}</button>`;
  $("#pk-use").onclick = useSelection;
}
function guessName(t) { return String(t || "").split(/[|\-–—:(]/)[0].replace(/how to (do|perform)( a| the)?/i, "").trim().slice(0, 50); }

function useSelection() {
  const p = cur(), v = pk.sel; if (!v) return;
  const video = { id: v.id, title: v.title, channel: v.channel };
  if (pk.mode === "replace") {
    p.sections[pk.si].exercises[pk.ei].video = video;
    toast("Video updated");
  } else {
    const freq = $("#pk-freq").value.trim();
    p.sections[pk.si].exercises.push({ id: uid(), name: $("#pk-name").value.trim() || guessName(v.title), reps: $("#pk-reps").value.trim(), load: "", freq, perWeek: perWeekFrom(freq), notes: "", video });
    toast("Added to " + (p.sections[pk.si].title || "plan"));
  }
  save(); closePicker(); renderEditor(p); renderRail();
}

/* ---------------- settings ---------------- */
const st = $("#settings");
function openSettings() {
  if (dlg.open) closePicker();
  $("#st-key").value = lsGet(KEYSTORE) || "";
  $("#st-key-src").textContent = window.YT_API_KEY ? "A key is built into this demo. Anything you enter here overrides it in this browser." : "No key is built in yet. Live YouTube search is off until one is added.";
  st.showModal ? st.showModal() : st.setAttribute("open", "");
}
$("#st-close").onclick = () => st.close();
$("#st-save").onclick = () => { lsSet(KEYSTORE, $("#st-key").value.trim()); st.close(); toast(apiKey() ? "API key saved. YouTube search is on." : "Key cleared"); };
$("#st-reset").onclick = () => { db = seed(); save(); lsSet(STORE, JSON.stringify(db)); st.close(); renderClinician(); toast("Demo data reset"); };

/* ================= PATIENT VIEW ================= */
function renderPatient(p, isPreview) {
  document.title = (p.name ? p.name + " · " : "") + "Home Program";
  const th = Math.max(0, Math.min(10, +p.guard.threshold || 0));
  const planKey = "trk-" + encodePlan(p).slice(0, 24);
  $("#app").innerHTML = `
  ${isPreview ? `<div class="backbar"><div class="pv-wrap gut"><span>Patient preview. This is what ${esc((p.name || "they").split(" ")[0])} sees.</span><button type="button" id="back">Back to editor</button></div></div>` : ""}
  <div class="pv">
  <header class="pv-band"><div class="pv-wrap gut">
    <div class="pv-top"><img src="logo.png" alt="Onward Physical Therapy"><span class="eyebrow">Home exercise program</span></div>
    <div><h1>${esc(p.name || "Your program")}</h1>
      <div class="pv-meta">${p.therapist ? `<span>Therapist <b>${esc(p.therapist)}</b></span>` : ""}${p.focus ? `<span>Focus <b>${esc(p.focus)}</b></span>` : ""}${p.updated ? `<span>Updated <b>${esc(fmtDate(p.updated))}</b></span>` : ""}</div>
    </div>
  </div></header>
  <main class="pv-main"><div class="pv-wrap gut">
    ${p.goals.filter(g => g.title).length ? `<section><div class="eyebrow">What we're working toward</div><h2>Goals</h2><div class="goals">
      ${p.goals.filter(g => g.title).map(g => `<div class="goal"><span class="pill${g.status === "Ongoing" ? "" : " next"}">${esc(g.status)}</span><h3>${esc(g.title)}</h3>${g.detail ? `<p>${esc(g.detail)}</p>` : ""}</div>`).join("")}
    </div></section>` : ""}
    ${p.sections.filter(s => s.exercises.length).map(s => `<section><div class="eyebrow">${esc(s.title)}</div><h2>Your exercises</h2>
      ${s.exercises.map(e => `<article class="pex">
        ${e.video ? `<button class="pplay" type="button" data-play="${esc(e.video.id)}" aria-label="Play video: ${esc(e.name)}"><img src="${thumb(e.video.id)}" alt="" loading="lazy"><span class="pi"><span>${PLAY_L}</span></span><small>Tap to watch</small></button>` : `<div></div>`}
        <div class="pbody">
          <h3>${esc(e.name || "Exercise")}</h3>
          <dl class="rx">${e.reps ? `<div><dt>Sets / reps</dt><dd>${esc(e.reps)}</dd></div>` : ""}${e.load ? `<div><dt>Load</dt><dd>${esc(e.load)}</dd></div>` : ""}${e.freq ? `<div><dt>Frequency</dt><dd>${esc(e.freq)}</dd></div>` : ""}</dl>
          ${e.notes ? `<p class="pnote">${esc(e.notes)}</p>` : ""}
          ${e.video ? `<div class="vsrc">Video: ${esc(e.video.title)}${e.video.channel ? " · " + esc(e.video.channel) : ""}</div>` : ""}
          ${e.perWeek > 0 ? `<div class="track" data-track="${esc(e.id)}" data-n="${e.perWeek}"><span class="lbl">This week</span><div class="dots"></div><span class="count"></span></div>` : ""}
        </div></article>`).join("")}
    </section>`).join("")}
    ${p.guard.signs.filter(Boolean).length ? `<section><div class="eyebrow">During training</div><h2>Know when to back off</h2><div class="rails">
      ${p.guard.intro ? `<p>${esc(p.guard.intro)}</p>` : ""}
      <div class="scale" aria-label="Pain scale 0 to 10, stop above ${th}">${Array.from({ length: 11 }, (_, n) => `<div class="${n <= th ? "g" : "r"}${n === th ? " t" : ""}">${n}</div>`).join("")}</div>
      <div class="scale-key"><span>0–${th}: OK to keep going</span><span>Above ${th}/10: stop or modify</span></div>
      <ul class="stops">${p.guard.signs.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    </div></section>` : ""}
  </div></main>
  <footer class="pv-foot"><div class="pv-wrap gut"><span>Onward Physical Therapy</span><span>Questions? Bring them to your next session.</span></div></footer>
  </div>`;

  if (isPreview) $("#back").onclick = () => { location.hash = ""; };
  document.querySelectorAll("[data-play]").forEach(b => b.addEventListener("click", () => {
    b.innerHTML = `<iframe src="${embed(b.dataset.play)}" title="Exercise video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    b.style.cursor = "default"; b.removeAttribute("data-play");
  }, { once: true }));

  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const wk = d.toISOString().slice(0, 10);
  document.querySelectorAll("[data-track]").forEach(t => {
    const key = planKey + "-" + t.dataset.track + "-" + wk, n = +t.dataset.n;
    let done = parseInt(lsGet(key) || "0", 10) || 0;
    const draw = () => {
      $(".dots", t).innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" aria-pressed="${k < done}" aria-label="Session ${k + 1}">${k + 1}</button>`).join("");
      $(".count", t).textContent = done >= n ? "Done for the week ✓" : `${done} of ${n}`;
      $(".dots", t).querySelectorAll("button").forEach((btn, k) => btn.onclick = () => { done = done === k + 1 ? k : k + 1; lsSet(key, String(done)); draw(); });
    };
    draw();
  });
}

/* frequency suggestions */
const dl = document.createElement("datalist"); dl.id = "freqs";
dl.innerHTML = ["Daily", "2× / week", "3× / week", "4× / week", "5× / week", "As needed", "Before training"].map(x => `<option value="${x}">`).join("");
document.body.appendChild(dl);

route();
})();
