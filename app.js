(function () {
"use strict";

/* ================= utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const LIB = (window.EXERCISE_LIBRARY || []).map(x => ({ ...x }));
const KEYSTORE = "onward-planbuilder-ytkey";
const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
const ytUrl = id => `https://www.youtube.com/watch?v=${id}`;
const PLAY = '<svg width="14" height="16" viewBox="0 0 18 20" aria-hidden="true"><path d="M0 0l18 10L0 20z" fill="#003333"/></svg>';
const PLAY_L = '<svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true"><path d="M0 0l18 10L0 20z" fill="#003333"/></svg>';
const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
const EYE = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const BELL ='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const fmtDate = d => { if (!d) return ""; const t = new Date(d); return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago"; return fmtDate(d);
}
const first = n => (String(n || "").trim().split(/\s+/)[0] || "");
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2600); }
const vid = l => l ? { id: l.id, title: l.title, channel: l.channel } : null;
const libByName = n => LIB.find(x => x.name === n);
function perWeekFrom(freq) {
  const m = String(freq || "").match(/(\d+)\s*[x×]?\s*(?:\/|per|a)\s*w(ee)?k/i);
  return m ? Math.min(7, parseInt(m[1], 10)) : (/daily|every day/i.test(freq || "") ? 7 : 0);
}
function apiKey() { return (lsGet(KEYSTORE) || window.YT_API_KEY || "").trim(); }
const patientUrl = c => location.origin + location.pathname + "#p=" + c.token;
const emptyPlan = () => ({ goals: [{ title: "", detail: "", status: "Ongoing" }], sections: [{ id: uid(), title: "Home program", exercises: [] }], guard: { intro: "Stop or modify if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Sharp or stabbing pain", "Pain stays elevated for more than 24 hours"] } });

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

/* ================= router ================= */
let pollTimer = null;
async function route() {
  clearInterval(pollTimer);
  const h = location.hash.slice(1);
  if (h.startsWith("p=")) { const [tok, ...flags] = h.slice(2).split("&"); return renderPatient(tok, flags.includes("preview")); }
  const { data } = await sb.auth.getSession();
  if (!data.session) return renderAuth();
  S.user = data.session.user;
  if (h === "preview" && cur()) return renderPatient(cur().token, true);
  renderClinician();
}
window.addEventListener("hashchange", route);

/* ================= auth ================= */
function renderAuth(mode) {
  mode = mode || "in";
  document.title = "Sign in · Onward Plan Builder";
  $("#app").innerHTML = `
  <div class="auth-wrap gut">
    <form class="auth" id="auth-form">
      <div class="auth-band"><img src="logo.png" alt="Onward Physical Therapy"><span class="demo">Demo</span></div>
      <div class="auth-body">
        <h1>${mode === "in" ? "Sign in" : "Create your account"}</h1>
        <p class="hint">Plan Builder for clinicians. Patients don't need an account, they get a private link.</p>
        ${mode === "up" ? `<label class="f" for="a-name">Your name<input class="in" id="a-name" required placeholder="Christina" autocomplete="name"></label>` : ""}
        <label class="f" for="a-email">Email<input class="in" id="a-email" type="email" required autocomplete="email"></label>
        <label class="f" for="a-pass">Password<input class="in" id="a-pass" type="password" required minlength="6" autocomplete="${mode === "in" ? "current-password" : "new-password"}"></label>
        <p class="err" id="a-err" hidden></p>
        <button class="btn primary" type="submit" id="a-go">${mode === "in" ? "Sign in" : "Create account"}</button>
        <p class="hint">${mode === "in" ? `New here? <button class="btn link" type="button" id="a-swap">Create an account</button>` : `Have an account? <button class="btn link" type="button" id="a-swap">Sign in</button>`}</p>
      </div>
    </form>
  </div>`;
  $("#a-swap").onclick = () => renderAuth(mode === "in" ? "up" : "in");
  $("#auth-form").onsubmit = async e => {
    e.preventDefault();
    const btn = $("#a-go"), err = $("#a-err"); btn.disabled = true; err.hidden = true;
    const email = $("#a-email").value.trim(), password = $("#a-pass").value;
    let res;
    if (mode === "in") res = await sb.auth.signInWithPassword({ email, password });
    else res = await sb.auth.signUp({ email, password, options: { data: { name: $("#a-name").value.trim() } } });
    btn.disabled = false;
    if (res.error) { err.textContent = res.error.message; err.hidden = false; return; }
    if (!res.data.session) { err.textContent = "Account created, but email confirmation is turned on for this project. Turn off \"Confirm email\" in Supabase, or confirm from your inbox, then sign in."; err.hidden = false; return; }
    route();
  };
}

/* ================= clinician state ================= */
const S = { user: null, clients: [], curId: null, tab: "plan", entries: [], unread: [], loaded: false, chan: null, saveT: null, saving: false };
const cur = () => S.clients.find(c => c.id === S.curId) || null;
const myName = () => (S.user && S.user.user_metadata && S.user.user_metadata.name) || "";

async function loadClients() {
  const { data, error } = await sb.from("clients").select("*").eq("archived", false).order("updated_at", { ascending: false });
  if (error) { toast("Couldn't load clients: " + error.message); return; }
  S.clients = data.map(c => ({ ...c, plan: normPlan(c.plan) }));
  if (!cur()) S.curId = (S.clients[0] || {}).id || null;
}
function normPlan(p) {
  p = p || {}; p.goals = p.goals || []; p.sections = p.sections || []; p.guard = p.guard || { intro: "", threshold: 3, signs: [] };
  p.guard.signs = p.guard.signs || [];
  p.care = p.care || []; p.restrictions = p.restrictions || [];
  p.redflags = p.redflags || { intro: "", phone: "", items: [] }; p.redflags.items = p.redflags.items || [];
  p.care.forEach(x => x.id = x.id || uid()); p.restrictions.forEach(x => x.id = x.id || uid()); p.sections.forEach(s => { s.id = s.id || uid(); s.exercises = s.exercises || []; s.exercises.forEach(e => e.id = e.id || uid()); });
  return p;
}
async function loadUnread() {
  const { data } = await sb.from("entries").select("id,client_id,kind,body,activity,pain,exercise_name,created_at").eq("read_by_therapist", false).order("created_at", { ascending: false }).limit(50);
  S.unread = data || [];
  paintBadges();
}
async function loadEntries() {
  const c = cur(); if (!c) { S.entries = []; return; }
  const { data } = await sb.from("entries").select("*").eq("client_id", c.id).order("created_at", { ascending: false }).limit(300);
  S.entries = data || [];
}
function unreadFor(id) { return S.unread.filter(u => u.client_id === id).length; }

function subscribe() {
  if (S.chan) return;
  S.chan = sb.channel("entries-" + S.user.id)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "entries", filter: "therapist_id=eq." + S.user.id }, payload => {
      const e = payload.new; if (e.author !== "patient") return;
      onPatientActivity(e);
    }).subscribe();
  setInterval(async () => { const before = S.unread.length; await loadUnread(); if (S.unread.length > before) { renderRail(); if (S.tab === "activity") { await loadEntries(); renderActivity(); } } }, 30000);
}
async function onPatientActivity(e) {
  const c = S.clients.find(x => x.id === e.client_id);
  const who = c ? first(c.name) || c.name : "A patient";
  const what = e.kind === "pain" ? `logged pain ${e.pain}/10${e.activity ? " (" + e.activity + ")" : ""}` : e.kind === "question" ? "asked a question" : e.kind === "note" ? `added a note${e.exercise_name ? " on " + e.exercise_name : ""}` : "replied";
  toast(`${who} ${what}`);
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    try { new Notification(`${who} ${what}`, { body: e.body || "", icon: "fav.png" }); } catch (x) {}
  }
  await loadUnread(); renderRail();
  if (S.tab === "activity" && cur() && cur().id === e.client_id) { await loadEntries(); renderActivity(); markRead(); }
}

/* ================= clinician UI ================= */
async function renderClinician() {
  document.title = "Onward Plan Builder (Demo)";
  $("#app").innerHTML = `
  <header class="bar"><div class="bar-in gut">
    <img src="logo.png" alt="Onward Physical Therapy">
    <span class="app">Plan Builder</span><span class="demo">Demo</span>
    <span class="sp"></span>
    <div class="inbox-wrap">
      <button class="ghost bell" id="bell" type="button" aria-label="Notifications" aria-expanded="false">${BELL}<span class="badge" id="bell-n" hidden></span></button>
      <div class="inbox" id="inbox" hidden></div>
    </div>
    <button class="ghost" data-act="settings" type="button">Settings</button>
  </div></header>
  <div class="shell gut">
    <aside class="rail">
      <div class="rail-head"><h2>Clients</h2><button class="btn sm primary" data-act="new-client" type="button">+ New client</button></div>
      <input class="in" id="rail-q" type="search" placeholder="Find a client" aria-label="Find a client">
      <div id="unsent"></div>
      <ul class="plist" id="plist"><li class="hint">Loading…</li></ul>
      <div class="rail-foot">Signed in as ${esc(myName() || S.user.email)} · <button class="btn link" data-act="signout" type="button" style="padding:0;font-size:12px">Sign out</button></div>
    </aside>
    <main class="ed" id="ed"></main>
  </div>`;
  $("#bell").onclick = toggleInbox;
  $("#rail-q").oninput = renderRail;
  await loadClients(); await loadUnread(); subscribe();
  renderRail(); renderMain();
}

function renderRail() {
  const box = $("#plist"); if (!box) return;
  const q = ($("#rail-q") || {}).value ? $("#rail-q").value.toLowerCase() : "";
  const list = S.clients.filter(c => !q || (c.name + " " + c.focus).toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(c => {
    const n = c.plan.sections.reduce((a, s) => a + s.exercises.length, 0), u = unreadFor(c.id);
    return `<li><button type="button" data-act="pick-client" data-id="${c.id}" aria-current="${c.id === S.curId}">
      <span class="pl-top"><b>${esc(c.name || "Untitled client")}</b>${u ? `<span class="dot-n">${u}</span>` : c.plan.sentAt ? "" : '<span class="draft-tag">Draft</span>'}</span>
      <small>${esc(c.focus || "No focus set")} · ${n} exercise${n === 1 ? "" : "s"}</small></button></li>`;
  }).join("") : `<li class="hint" style="padding:8px 4px">${S.clients.length ? "No match." : "No clients yet."}</li>`;
  const ru = readyUnsent(), box2 = $("#unsent");
  if (box2) box2.innerHTML = ru.length ? `<button class="unsent" type="button" data-act="go-unsent"><b>${ru.length} plan${ru.length === 1 ? "" : "s"} not sent yet</b><small>${esc(ru.map(c => first(c.name) || "Untitled").join(", "))}</small></button>` : "";
  paintBadges();
}
function paintBadges() {
  const b = $("#bell-n"); if (!b) return;
  const n = S.unread.length + readyUnsent().length;
  b.textContent = n > 9 ? "9+" : n; b.hidden = !n;
  const t = $("#tab-act-n"); if (t && cur()) { const n = unreadFor(cur().id); t.textContent = n; t.hidden = !n; }
}

function renderMain() {
  const ed = $("#ed"), c = cur();
  if (!c) {
    ed.innerHTML = `<section class="card empty-state">
      <h2>Add your first client</h2>
      <p>Each client gets a plan you build here and a private page they open from an email. Their notes, pain logs and questions come back to you as notifications.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn primary" data-act="new-client" type="button">+ New client</button>
        <button class="btn" data-act="load-samples" type="button">Load 2 sample clients</button>
      </div></section>`;
    return;
  }
  ed.innerHTML = `
  <section class="card">
    <div class="top">
      <div style="flex:1;min-width:220px">
        <div class="eyebrow">Home exercise program</div>
        <input class="name-in" id="f-name" data-b="name" value="${esc(c.name)}" placeholder="Client name" aria-label="Client name">
      </div>
      <div class="actions">
        <span class="saved" id="saved">Saved</span>
        <a class="btn preview-btn" href="${esc(patientUrl(c))}&preview" target="_blank" rel="noopener">${EYE} Preview ${esc(first(c.name) || "client")}'s page <span aria-hidden="true">↗</span></a>
        <button class="btn" data-act="copy-link" type="button">Copy link</button>
        <button class="btn primary" data-act="email-link" type="button">${c.plan.sentAt ? "Resend plan" : `Send plan to ${esc(first(c.name) || "client")}`}</button>
      </div>
    </div>
    ${c.plan.sentAt ? `<p class="sent-line">Plan sent ${esc(fmtDate(c.plan.sentAt))}. Edits you make now update their page automatically, no need to resend.</p>`
      : `<p class="draft-line"><b>Draft.</b> ${esc(first(c.name) || "This client")} hasn't been sent their plan yet. Build it below, check it with <b>Preview</b>, then click <b>Send plan</b> to email it${c.email ? "" : " (you can type their address in your email app)"}, or <b>Copy link</b> to text it.</p>`}
    <div class="fields" style="margin-top:16px">
      <label class="f" for="f-email">Client email (optional)<input class="in" id="f-email" type="email" data-b="email" value="${esc(c.email)}"></label>
      <label class="f" for="f-focus">Focus<input class="in" id="f-focus" data-b="focus" value="${esc(c.focus)}"></label>
      <label class="f" for="f-ther">Therapist<input class="in" id="f-ther" data-b="therapist_name" value="${esc(c.therapist_name)}"></label>
    </div>
  </section>
  <div class="etabs" role="tablist">
    <button role="tab" type="button" data-act="tab" data-tab="plan" aria-selected="${S.tab === "plan"}">Plan</button>
    <button role="tab" type="button" data-act="tab" data-tab="activity" aria-selected="${S.tab === "activity"}">Client activity <span class="dot-n" id="tab-act-n" hidden></span></button>
  </div>
  <div id="tabbody"></div>`;
  paintBadges();
  if (S.tab === "plan") renderEditor(); else openActivity();
}

/* ---------- plan editor ---------- */
function renderEditor() {
  const c = cur(), p = c.plan, statuses = ["Ongoing", "Next", "After assessment", "Done"];
  $("#tabbody").innerHTML = `
  <div class="ed">
  <section class="card">
    <div class="card-head"><h2>Goals</h2><button class="btn sm" data-act="add-goal" type="button">+ Goal</button></div>
    ${p.goals.length ? "" : '<p class="hint">No goals yet.</p>'}
    ${p.goals.map((g, i) => `
      <div class="goal-row">
        <input class="in" id="g-t-${i}" data-b="plan.goals.${i}.title" value="${esc(g.title)}" placeholder="Goal" aria-label="Goal">
        <input class="in gd" id="g-d-${i}" data-b="plan.goals.${i}.detail" value="${esc(g.detail)}" placeholder="Details" aria-label="Goal details">
        <select class="in" id="g-s-${i}" data-b="plan.goals.${i}.status" aria-label="Goal status">${statuses.map(s => `<option${s === g.status ? " selected" : ""}>${s}</option>`).join("")}</select>
        <button class="icon-btn" data-act="del-goal" data-i="${i}" type="button" aria-label="Remove goal">${TRASH}</button>
      </div>`).join("")}
  </section>
  <section class="card">
    <div class="card-head"><div><h2>Exercises</h2><p class="hint">Changes save automatically and show up on ${esc(first(c.name) || "the client")}'s page right away.</p></div><button class="btn sm" data-act="add-section" type="button">+ Section</button></div>
    ${p.sections.map((s, si) => `
      <div class="sec">
        <div class="sec-head">
          <input class="sec-title" id="s-${si}" data-b="plan.sections.${si}.title" value="${esc(s.title)}" placeholder="Section name" aria-label="Section name">
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
    <div class="card-head"><div><h2>Home care &amp; precautions</h2><p class="hint">Pick from common instructions and edit the wording, or write your own. Empty parts don't show on the client's page.</p></div></div>

    <div class="cg">
      <div class="cg-head"><h3>Restrictions</h3><span class="hint">Shown at the top of their page</span></div>
      ${p.restrictions.map((r, i) => `<div class="rrow">
        <textarea class="in" rows="1" id="rs-${r.id}" data-b="plan.restrictions.${i}.text" aria-label="Restriction">${esc(r.text)}</textarea>
        <label class="mini" for="rsu-${r.id}">Until<input class="in" type="date" id="rsu-${r.id}" data-b="plan.restrictions.${i}.until" value="${esc(r.until || "")}"></label>
        <button class="icon-btn" data-act="care-del" data-kind="r" data-i="${i}" type="button" aria-label="Remove restriction">${TRASH}</button>
        ${careVid(r, "r", i)}</div>`).join("")}
      <div class="add-ex"><button class="btn sm" data-act="care-pick" data-kind="r" type="button">+ From list</button><button class="btn sm" data-act="care-add" data-kind="r" type="button">+ Write your own</button></div>
    </div>

    <div class="cg">
      <div class="cg-head"><h3>Home care</h3><span class="hint">Ice, elevation, positioning, walking program…</span></div>
      ${p.care.map((x, i) => `<div class="crow">
        <div class="crow-top">
          <label class="mini" for="ct-${x.id}">Instruction<input class="in ex-name" id="ct-${x.id}" data-b="plan.care.${i}.title" value="${esc(x.title)}"></label>
          <label class="mini" for="cf-${x.id}">How often<input class="in" id="cf-${x.id}" data-b="plan.care.${i}.freq" value="${esc(x.freq)}"></label>
          <label class="mini" for="cu-${x.id}">Until<input class="in" type="date" id="cu-${x.id}" data-b="plan.care.${i}.until" value="${esc(x.until || "")}"></label>
          <label class="chk" for="cd-${x.id}"><input type="checkbox" id="cd-${x.id}" data-b="plan.care.${i}.daily"${x.daily ? " checked" : ""}> Daily checklist</label>
          <button class="icon-btn" data-act="care-del" data-kind="c" data-i="${i}" type="button" aria-label="Remove">${TRASH}</button>
        </div>
        <textarea class="in" rows="1" id="cx-${x.id}" data-b="plan.care.${i}.detail" placeholder="Details for the client" aria-label="Details">${esc(x.detail)}</textarea>
        ${careVid(x, "c", i)}
      </div>`).join("")}
      <div class="add-ex"><button class="btn sm" data-act="care-pick" data-kind="c" type="button">+ From list</button><button class="btn sm" data-act="care-add" data-kind="c" type="button">+ Write your own</button></div>
    </div>

    <div class="cg cg-red">
      <div class="cg-head"><h3>Call us if…</h3><span class="hint">Warning signs that need a call or medical care, not just backing off</span></div>
      <div class="fields" style="grid-template-columns:minmax(0,1fr) 200px;margin-bottom:10px">
        <label class="f" for="rf-intro">Message<input class="in" id="rf-intro" data-b="plan.redflags.intro" value="${esc(p.redflags.intro)}" placeholder="Call the clinic right away if you notice any of these."></label>
        <label class="f" for="rf-phone">Clinic phone<input class="in" id="rf-phone" data-b="plan.redflags.phone" value="${esc(p.redflags.phone)}" placeholder="(303) 555-0100"></label>
      </div>
      ${p.redflags.items.map((s, i) => `<div class="sign-row"><input class="in" id="rfi-${i}" data-b="plan.redflags.items.${i}" value="${esc(s)}" aria-label="Warning sign"><button class="icon-btn" data-act="care-del" data-kind="f" data-i="${i}" type="button" aria-label="Remove">${TRASH}</button></div>`).join("")}
      <div class="add-ex"><button class="btn sm" data-act="care-pick" data-kind="f" type="button">+ From list</button><button class="btn sm" data-act="care-add" data-kind="f" type="button">+ Write your own</button></div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><h2>When to back off</h2><p class="hint">Shown to the client as a pain scale plus stop signs.</p></div></div>
    <div class="fields" style="grid-template-columns:minmax(0,1fr) 140px;margin-bottom:12px">
      <label class="f" for="gd-intro">Message<input class="in" id="gd-intro" data-b="plan.guard.intro" value="${esc(p.guard.intro)}"></label>
      <label class="f" for="gd-th">Pain limit (0–10)<input class="in" id="gd-th" type="number" min="0" max="10" data-b="plan.guard.threshold" data-num="1" value="${esc(p.guard.threshold)}"></label>
    </div>
    ${p.guard.signs.map((s, i) => `<div class="sign-row"><input class="in" id="sg-${i}" data-b="plan.guard.signs.${i}" value="${esc(s)}" aria-label="Stop sign"><button class="icon-btn" data-act="del-sign" data-i="${i}" type="button" aria-label="Remove">${TRASH}</button></div>`).join("")}
    <button class="btn sm" data-act="add-sign" type="button">+ Stop sign</button>
  </section>
  <div style="display:flex;justify-content:flex-end"><button class="btn sm" data-act="archive" type="button" style="color:var(--stop)">Remove this client</button></div>
  </div>`;
}
function careVid(x, kind, i) {
  const v = x.video;
  return `<div class="cvid">${v
    ? `<button class="cv-thumb" type="button" data-act="care-video" data-kind="${kind}" data-i="${i}" aria-label="Change video"><img src="${thumb(v.id)}" alt="" loading="lazy"><span class="pi"><span>${PLAY}</span></span></button>
       <span class="vtitle">▶ ${esc(v.title)}</span>
       <button class="btn link" type="button" data-act="care-video" data-kind="${kind}" data-i="${i}">Change</button>
       <button class="btn link" type="button" data-act="care-video-del" data-kind="${kind}" data-i="${i}" style="color:var(--muted)">Remove video</button>`
    : `<button class="btn link" type="button" data-act="care-video" data-kind="${kind}" data-i="${i}">+ Add a how-to video (optional)</button>`}</div>`;
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
        <label class="mini" for="e-n-${e.id}">Exercise<input class="in ex-name" id="e-n-${e.id}" data-b="plan.sections.${si}.exercises.${ei}.name" value="${esc(e.name)}"></label>
        <label class="mini" for="e-r-${e.id}">Sets / reps<input class="in" id="e-r-${e.id}" data-b="plan.sections.${si}.exercises.${ei}.reps" value="${esc(e.reps)}"></label>
        <label class="mini" for="e-l-${e.id}">Load<input class="in" id="e-l-${e.id}" data-b="plan.sections.${si}.exercises.${ei}.load" value="${esc(e.load)}"></label>
        <label class="mini" for="e-f-${e.id}">Frequency<input class="in" id="e-f-${e.id}" data-b="plan.sections.${si}.exercises.${ei}.freq" value="${esc(e.freq)}" list="freqs"></label>
      </div>
      <label class="mini" for="e-o-${e.id}">Notes for client<textarea class="in" id="e-o-${e.id}" rows="2" data-b="plan.sections.${si}.exercises.${ei}.notes">${esc(e.notes)}</textarea></label>
      ${v ? `<div class="vtitle">▶ ${esc(v.title)}${v.channel ? " · " + esc(v.channel) : ""}</div>` : ""}
    </div>
    <button class="icon-btn" data-act="del-ex" data-si="${si}" data-ei="${ei}" type="button" aria-label="Remove exercise">${TRASH}</button>
  </div>`;
}

function setPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; }
function scheduleSave() {
  const s = $("#saved"); if (s) { s.textContent = "Saving…"; s.classList.add("busy"); }
  clearTimeout(S.saveT); S.saveT = setTimeout(saveNow, 600);
}
async function saveNow() {
  const c = cur(); if (!c) return;
  const { error } = await sb.from("clients").update({ name: c.name, email: c.email, focus: c.focus, therapist_name: c.therapist_name, plan: c.plan }).eq("id", c.id);
  const s = $("#saved"); if (s) { s.textContent = error ? "Not saved" : "Saved"; s.classList.toggle("busy", false); s.classList.toggle("bad", !!error); }
  if (error) toast("Save failed: " + error.message);
}

document.addEventListener("input", e => {
  const el = e.target.closest("[data-b]"); if (!el || !$("#ed")) return;
  const c = cur(); if (!c) return;
  let val = el.type === "checkbox" ? el.checked : el.value;
  if (el.dataset.num) val = Math.max(0, Math.min(10, parseInt(val || "0", 10) || 0));
  setPath(c, el.dataset.b, val);
  const m = el.dataset.b.match(/^plan\.sections\.(\d+)\.exercises\.(\d+)\.freq$/);
  if (m) c.plan.sections[+m[1]].exercises[+m[2]].perWeek = perWeekFrom(val);
  scheduleSave();
  if (/^(name|focus)$/.test(el.dataset.b)) renderRail();
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, c = cur();
  const si = +b.dataset.si, ei = +b.dataset.ei, i = +b.dataset.i;
  const rerender = () => { scheduleSave(); renderEditor(); renderRail(); };
  switch (a) {
    case "settings": openSettings(); break;
    case "signout": await sb.auth.signOut(); if (S.chan) sb.removeChannel(S.chan); S.chan = null; S.clients = []; S.curId = null; location.hash = ""; route(); break;
    case "new-client": openNewClient(); break;
    case "load-samples": b.disabled = true; await loadSamples(); break;
    case "pick-client":
      clearTimeout(S.saveT); if (S.saveT) await saveNow();
      if (c && c.id !== b.dataset.id && !c.plan.sentAt && exCount(c)) toast(`Reminder: ${first(c.name) || "that client"}'s plan hasn't been sent yet`);
      S.curId = b.dataset.id; S.tab = unreadFor(S.curId) ? "activity" : "plan"; renderRail(); renderMain(); break;
    case "tab": S.tab = b.dataset.tab; renderMain(); break;
    case "add-goal": c.plan.goals.push({ title: "", detail: "", status: "Ongoing" }); rerender(); break;
    case "del-goal": c.plan.goals.splice(i, 1); rerender(); break;
    case "add-section": c.plan.sections.push({ id: uid(), title: "New section", exercises: [] }); rerender(); break;
    case "del-section": c.plan.sections.splice(si, 1); rerender(); break;
    case "add-blank": c.plan.sections[si].exercises.push({ id: uid(), name: "", reps: "", load: "", freq: "", perWeek: 0, notes: "", video: null }); rerender(); break;
    case "del-ex": c.plan.sections[si].exercises.splice(ei, 1); rerender(); break;
    case "care-pick": openCarePick(b.dataset.kind); break;
    case "care-video": openPicker({ mode: "replace", target: { kind: b.dataset.kind, i } }); break;
    case "care-video-del": { const it = (b.dataset.kind === "r" ? c.plan.restrictions : c.plan.care)[i]; delete it.video; rerender(); break; }
    case "care-add": {
      const k = b.dataset.kind;
      if (k === "r") c.plan.restrictions.push({ id: uid(), text: "", until: "" });
      else if (k === "c") c.plan.care.push({ id: uid(), cat: "", title: "", freq: "", until: "", daily: false, detail: "" });
      else c.plan.redflags.items.push("");
      rerender(); break;
    }
    case "care-del": {
      const k = b.dataset.kind;
      (k === "r" ? c.plan.restrictions : k === "c" ? c.plan.care : c.plan.redflags.items).splice(i, 1); rerender(); break;
    }
    case "add-sign": c.plan.guard.signs.push(""); rerender(); break;
    case "del-sign": c.plan.guard.signs.splice(i, 1); rerender(); break;
    case "open-picker": openPicker({ mode: "add", si }); break;
    case "change-video": openPicker({ mode: "replace", si, ei }); break;
    case "copy-link":
      if (!c.plan.sentAt && !exCount(c)) { toast("Add at least one exercise before sharing the plan"); break; }
      await copy(patientUrl(c), c.plan.sentAt ? "Link copied" : `Link copied. ${first(c.name) || "Client"}'s plan is marked as sent.`); markSent(c); break;
    case "go-unsent": { const u = readyUnsent()[0]; if (u) { if (S.saveT) await saveNow(); S.curId = u.id; S.tab = "plan"; const ib = $("#inbox"); if (ib) ib.hidden = true; renderRail(); renderMain(); } break; }
    case "email-link": emailLink(c); break;
    case "archive":
      if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to remove"; setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Remove this client"; }, 3000); break; }
      await sb.from("clients").update({ archived: true }).eq("id", c.id);
      S.clients = S.clients.filter(x => x.id !== c.id); S.curId = (S.clients[0] || {}).id || null; S.tab = "plan";
      renderRail(); renderMain(); toast("Client removed. Their link no longer works."); break;
    case "send-reply": sendReply(b); break;
    case "inbox-plan": {
      $("#inbox").hidden = true; $("#bell").setAttribute("aria-expanded", "false");
      if (S.saveT) await saveNow(); S.curId = b.dataset.id; S.tab = "plan"; renderRail(); renderMain(); break;
    }
    case "inbox-open": {
      $("#inbox").hidden = true; $("#bell").setAttribute("aria-expanded", "false");
      if (S.saveT) await saveNow(); S.curId = b.dataset.id; S.tab = "activity"; renderRail(); renderMain(); break;
    }
    case "alerts": {
      if (!("Notification" in window)) { toast("This browser doesn't support desktop alerts"); break; }
      const r = await Notification.requestPermission(); toast(r === "granted" ? "Desktop alerts on" : "Desktop alerts are blocked in this browser"); renderInbox(); break;
    }
    case "mark-all": await sb.from("entries").update({ read_by_therapist: true }).eq("read_by_therapist", false); await loadUnread(); renderRail(); renderInbox(); break;
  }
});

async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch (err) { window.prompt("Copy this:", text); }
}
const exCount = c => c.plan.sections.reduce((a, s) => a + s.exercises.filter(e => e.name).length, 0);
const readyUnsent = () => S.clients.filter(c => !c.plan.sentAt && exCount(c) > 0);
function markSent(c) {
  if (c.plan.sentAt) return;
  c.plan.sentAt = new Date().toISOString(); clearTimeout(S.saveT); saveNow(); renderRail(); setTimeout(renderMain, 300);
}
function emailLink(c) {
  const nEx = c.plan.sections.reduce((a, s) => a + s.exercises.filter(e => e.name).length, 0);
  if (!nEx) { toast("Add at least one exercise before sending the plan"); return; }
  markSent(c);
  const name = first(c.name) || "there", ther = c.therapist_name || myName() || "your therapist";
  const subject = "Your home exercise program";
  const body = `Hi ${name},\n\nHere's your home exercise program. It has your exercises with demo videos, and you can log pain, add notes, or send me questions right from the page:\n\n${patientUrl(c)}\n\nBookmark it. I'll update it as we go.\n\n${ther}`;
  location.href = `mailto:${encodeURIComponent(c.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ---------- new client ---------- */
const nc = $("#newclient");
function openNewClient() {
  $("#nc-body").innerHTML = `
    <form id="nc-form" style="display:grid;gap:12px">
      <label class="f" for="nc-name">Client name<input class="in" id="nc-name" required autocomplete="off"></label>
      <label class="f" for="nc-email">Client email (optional)<input class="in" id="nc-email" type="email" autocomplete="off" placeholder="Add now or later"></label>
      <label class="f" for="nc-focus">Focus<input class="in" id="nc-focus" placeholder="e.g. Shoulder rehab" autocomplete="off"></label>
      <p class="hint">Next you'll build their plan. Nothing is sent until you click <b>Send plan</b>.</p>
      <div><button class="btn primary" type="submit" id="nc-go">Save client</button></div>
    </form>`;
  nc.showModal ? nc.showModal() : nc.setAttribute("open", "");
  setTimeout(() => $("#nc-name").focus(), 30);
  $("#nc-form").onsubmit = async ev => {
    ev.preventDefault(); $("#nc-go").disabled = true;
    const row = { name: $("#nc-name").value.trim(), email: $("#nc-email").value.trim(), focus: $("#nc-focus").value.trim(), therapist_name: myName() || (cur() || {}).therapist_name || "", plan: emptyPlan() };
    const { data, error } = await sb.from("clients").insert(row).select().single();
    if (error) { toast("Couldn't add client: " + error.message); $("#nc-go").disabled = false; return; }
    data.plan = normPlan(data.plan); S.clients.unshift(data); S.curId = data.id; S.tab = "plan";
    nc.close(); renderRail(); renderMain();
    toast(`${first(data.name)} added. Build their plan, then click Send plan.`);
  };
}
$("#nc-close").onclick = () => nc.close();

/* ---------- samples ---------- */
async function loadSamples() {
  const ther = myName() || "Christina";
  const alexPlan = {
    goals: [
      { title: "Get strong", detail: "Keep training as normal while the shoulder work runs alongside it.", status: "Ongoing" },
      { title: "Snowboard-ready knee", detail: "Build tolerance to lateral motion.", status: "Ongoing" },
      { title: "Left quad, mid-range", detail: "Check isolated L quad strength. Likely start: quad isometrics such as single-leg wall sits or split squat isos.", status: "After assessment" }],
    sections: [{ id: uid(), title: "Shoulder rehab", exercises: [
      { id: "cuff", name: "Rotator cuff trio", reps: "15 each", load: "2.5 lb", freq: "3× / week", perWeek: 3, notes: "Do it as your warm-up before training.", video: vid(LIB[0]) },
      { id: "lat", name: "Lat eccentrics", reps: "10–15", load: "5–10 lb on PVC", freq: "As needed", perWeek: 0, notes: "Use these to open up overhead range of motion.\nWe didn't cover this one in session, but it's easy to set up from the video. Wes knows about these and can help.", video: vid(LIB[1]) }] }],
    guard: { intro: "Continue training as normal. Stop or modify if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Sharp or stabbing pain", "You notice compensation patterns", "Pain stays elevated for more than 24 hours"] }
  };
  const samplePlan = {
    goals: [{ title: "Run 5K pain-free", detail: "Build back to three easy runs a week.", status: "Ongoing" }, { title: "Single-leg strength", detail: "Even out left vs right on step-downs.", status: "Next" }],
    sections: [
      { id: uid(), title: "Knee strength", exercises: [
        { id: "spanish", name: "Spanish squat", reps: "5 × 45 s hold", load: "Heavy band", freq: "4× / week", perWeek: 4, notes: "", video: vid(libByName("Spanish squat")) },
        { id: "stepdown", name: "Step-downs", reps: "3 × 10 each", load: "Bodyweight", freq: "3× / week", perWeek: 3, notes: "Slow on the way down, knee tracks over the 2nd toe.", video: vid(libByName("Step-downs")) }] },
      { id: uid(), title: "Lower leg + balance", exercises: [
        { id: "calf", name: "Calf raises", reps: "3 × 15", load: "Bodyweight", freq: "Daily", perWeek: 0, notes: "", video: vid(libByName("Calf raises (straight + bent knee)")) }] }],
    guard: { intro: "Some soreness is expected. Back off if you notice any of these.", threshold: 3, signs: ["Pain above 3/10", "Swelling the next morning", "Pain stays elevated for more than 24 hours"] }
  };
  const { data, error } = await sb.from("clients").insert([
    { name: "Sample Patient", email: "", focus: "Knee: return to running", therapist_name: ther, plan: samplePlan },
    { name: "Alex Patacchiola", email: "", focus: "Shoulder rehab", therapist_name: ther, plan: alexPlan }
  ]).select();
  if (error) { toast("Couldn't load samples: " + error.message); return; }
  const alex = data.find(d => d.name.startsWith("Alex")), samp = data.find(d => d.name.startsWith("Sample"));
  const post = (c, args) => sb.rpc("patient_post", { p_token: c.token, ...args });
  await post(alex, { p_kind: "pain", p_pain: 2, p_activity: "Overhead press", p_body: "Mild ache at the top, gone after warm-up." });
  await post(alex, { p_kind: "note", p_exercise_id: "cuff", p_exercise_name: "Rotator cuff trio", p_body: "2.5 lb feels easy now. Should I go up to 5?" });
  await post(alex, { p_kind: "question", p_body: "Is it OK to snowboard this weekend if the knee feels fine?" });
  await post(samp, { p_kind: "pain", p_pain: 5, p_activity: "Stairs at work", p_body: "Sharp on the way down, left knee." });
  await loadClients(); S.curId = alex.id; S.tab = "activity"; await loadUnread(); renderRail(); renderMain();
  toast("Sample clients loaded with some client activity");
}

/* ---------- activity ---------- */
async function openActivity() {
  $("#tabbody").innerHTML = `<div class="card"><p class="hint">Loading activity…</p></div>`;
  await loadEntries(); renderActivity(); markRead();
}
async function markRead() {
  const c = cur(); if (!c || !S.entries.some(e => !e.read_by_therapist)) return;
  await sb.from("entries").update({ read_by_therapist: true }).eq("client_id", c.id).eq("read_by_therapist", false);
  S.unread = S.unread.filter(u => u.client_id !== c.id); renderRail();
}
function painChip(n, th) { return `<span class="painchip ${n > th ? "hi" : "lo"}">${n}/10</span>`; }
function renderActivity() {
  const c = cur(), th = +c.plan.guard.threshold || 3, box = $("#tabbody"); if (!box) return;
  const tops = S.entries.filter(e => !e.parent_id), kids = id => S.entries.filter(e => e.parent_id === id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const pains = S.entries.filter(e => e.kind === "pain").slice(0, 20).reverse();
  const label = e => e.kind === "pain" ? `Pain log${e.activity ? " · " + esc(e.activity) : ""}` : e.kind === "note" ? `Note on ${esc(e.exercise_name || "an exercise")}` : e.kind === "question" ? "Question" : "Reply";
  box.innerHTML = `
  <div class="ed">
  ${pains.length ? `<section class="card"><div class="card-head"><div><h2>Pain trend</h2><p class="hint">Last ${pains.length} logs. Bars above the line are over the ${th}/10 limit.</p></div></div>
    <div class="trend" role="img" aria-label="Pain logs over time">
      <div class="trend-line" style="bottom:${th * 10}%"><span>${th}</span></div>
      ${pains.map(p => `<div class="tb ${p.pain > th ? "hi" : ""}" style="height:${Math.max(4, p.pain * 10)}%" title="${p.pain}/10 · ${esc(p.activity || "")} · ${fmtDate(p.created_at)}"><span>${p.pain}</span></div>`).join("")}
    </div></section>` : ""}
  <section class="card">
    <div class="card-head"><div><h2>Client activity</h2><p class="hint">Notes, pain logs and questions from ${esc(first(c.name) || "this client")}'s page. Replies show up on their page.</p></div></div>
    ${tops.length ? tops.map(e => `
      <article class="act${e.read_by_therapist ? "" : " new"}">
        <div class="act-head"><span class="act-kind k-${e.kind}">${label(e)}</span>${e.kind === "pain" ? painChip(e.pain, th) : ""}${e.read_by_therapist ? "" : '<span class="newpill">New</span>'}<span class="when">${ago(e.created_at)}</span></div>
        ${e.body ? `<p class="act-body">${esc(e.body)}</p>` : ""}
        ${kids(e.id).map(r => `<div class="reply ${r.author}"><b>${r.author === "therapist" ? esc(c.therapist_name || "You") : esc(first(c.name))}</b> <span class="when">${ago(r.created_at)}</span><p>${esc(r.body)}</p></div>`).join("")}
        <div class="reply-form"><textarea class="in" rows="1" id="rp-${e.id}" placeholder="Reply to ${esc(first(c.name) || "client")}…" aria-label="Reply"></textarea><button class="btn sm primary" type="button" data-act="send-reply" data-id="${e.id}">Reply</button></div>
      </article>`).join("")
      : `<div class="empty">Nothing yet. When ${esc(first(c.name) || "the client")} logs pain, adds a note, or asks a question on their page, it shows up here and in the bell.</div>`}
  </section></div>`;
}
async function sendReply(b) {
  const c = cur(), id = b.dataset.id, ta = $("#rp-" + id), body = ta.value.trim(); if (!body) return;
  b.disabled = true;
  const { error } = await sb.from("entries").insert({ client_id: c.id, therapist_id: S.user.id, author: "therapist", kind: "reply", parent_id: id, body });
  b.disabled = false;
  if (error) { toast("Reply failed: " + error.message); return; }
  toast(`Reply sent to ${first(c.name)}`); await loadEntries(); renderActivity();
}

/* ---------- inbox ---------- */
function toggleInbox() {
  const box = $("#inbox"), open = box.hidden;
  box.hidden = !open; $("#bell").setAttribute("aria-expanded", String(open));
  if (open) renderInbox();
}
document.addEventListener("click", e => { const box = $("#inbox"); if (box && !box.hidden && !e.target.closest(".inbox-wrap")) { box.hidden = true; $("#bell").setAttribute("aria-expanded", "false"); } });
function renderInbox() {
  const box = $("#inbox"); if (!box) return;
  const name = id => (S.clients.find(c => c.id === id) || {}).name || "Client";
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  box.innerHTML = `
    <div class="ib-head"><b>Notifications</b>${S.unread.length ? `<button class="btn link" data-act="mark-all" type="button">Mark all read</button>` : ""}</div>
    ${readyUnsent().map(c => `<button class="ib-item ib-unsent" type="button" data-act="inbox-plan" data-id="${c.id}"><span><b>${esc(c.name || "Untitled client")}</b>'s plan is ready but not sent</span><small>Open it and click Send plan or Copy link</small></button>`).join("")}
    ${S.unread.length ? S.unread.map(u => `<button class="ib-item" type="button" data-act="inbox-open" data-id="${u.client_id}">
        <span><b>${esc(name(u.client_id))}</b> ${u.kind === "pain" ? `logged pain <b>${u.pain}/10</b>${u.activity ? " · " + esc(u.activity) : ""}` : u.kind === "question" ? "asked a question" : u.kind === "note" ? `added a note on ${esc(u.exercise_name || "an exercise")}` : "replied"}</span>
        ${u.body ? `<small>${esc(u.body.slice(0, 90))}</small>` : ""}<small class="when">${ago(u.created_at)}</small></button>`).join("")
      : readyUnsent().length ? "" : `<p class="hint" style="padding:14px">You're all caught up.</p>`}
    ${perm === "default" ? `<div class="ib-foot"><button class="btn sm" data-act="alerts" type="button">Turn on desktop alerts</button></div>` : ""}`;
}

/* ================= picker ================= */
const pk = { mode: "add", si: 0, ei: 0, tab: "lib", q: "", region: "All", sel: null, ytQ: "", ytRes: null, ytErr: "", ytLoading: false, paste: "", pasteMsg: "" };
const dlg = $("#picker");
const careItem = t => (t.kind === "r" ? cur().plan.restrictions : cur().plan.care)[t.i];
const shortLabel = s => String(s || "").split(/[.:(]/)[0].replace(/^(no|don't|do not)\s+/i, "").slice(0, 40).trim();
function openPicker(o) {
  Object.assign(pk, { target: null }, o, { sel: null, pasteMsg: "" });
  if (o.target) {
    const it = careItem(o.target), label = o.target.kind === "r" ? shortLabel(it.text) : it.title;
    $("#pk-title").textContent = "How-to video" + (label ? " for " + label : "");
    pk.tab = "lib"; pk.region = "All"; pk.q = label ? label + " physical therapy" : ""; pk.ytQ = pk.q;
    if (apiKey() && pk.q.trim().length >= 3 && pk.libYtQ !== pk.q.trim()) libYtSearch(pk.q.trim());
  } else if (o.mode === "replace") { const ex = cur().plan.sections[o.si].exercises[o.ei]; pk.ytQ = ex.name || pk.ytQ; $("#pk-title").textContent = "Choose a video" + (ex.name ? " for " + ex.name : ""); }
  else $("#pk-title").textContent = "Add exercise";
  setTab(pk.tab);
  dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  setTimeout(() => { const s = $("#pk-pane input"); if (s) s.focus(); }, 30);
}
function closePicker() { $("#pk-preview").innerHTML = ""; dlg.close ? dlg.close() : dlg.removeAttribute("open"); }
$("#pk-close").onclick = closePicker;
dlg.addEventListener("close", () => { $("#pk-preview").innerHTML = ""; });
dlg.addEventListener("click", e => { if (e.target === dlg) closePicker(); });
$$(".tabs [data-tab]").forEach(t => t.onclick = () => setTab(t.dataset.tab));
function setTab(t) { pk.tab = t; $$(".tabs [data-tab]").forEach(x => x.setAttribute("aria-selected", x.dataset.tab === t)); renderPane(); renderPreview(); }
function card(v, extra) {
  const sel = pk.sel && pk.sel.id === v.id;
  return `<button class="vc" type="button" data-pick="${esc(v.id)}" aria-selected="${!!sel}"><img src="${thumb(v.id)}" alt="" loading="lazy">
    <span class="t">${extra || ""}<b>${esc(v.name || v.title)}</b><small>${esc(v.name ? v.title : v.channel)}</small>${v.name ? `<small>${esc(v.channel)}${v.length ? " · " + esc(v.length) : ""}</small>` : ""}</span></button>`;
}
function renderPane() {
  const pane = $("#pk-pane");
  if (pk.tab === "lib") {
    const regions = ["All", ...new Set(LIB.map(x => x.region))], q = pk.q.toLowerCase();
    const list = LIB.filter(x => (pk.region === "All" || x.region === pk.region) && (!q || (x.name + " " + x.title + " " + x.region).toLowerCase().includes(q)));
    const key = apiKey(), qq = pk.q.trim();
    const ytBlock = !key || qq.length < 3 ? "" : `
      <h4 class="res-h">From YouTube${pk.libYtQ === qq && pk.libYt ? ` <span>${pk.libYt.length} results</span>` : ""}</h4>
      ${pk.libYtQ !== qq || pk.libYtLoading ? '<div class="empty">Searching YouTube…</div>'
        : pk.libYtErr ? `<div class="empty">${esc(pk.libYtErr)}</div>`
        : pk.libYt && pk.libYt.length ? `<div class="grid">${pk.libYt.map(v => card(v, '<span class="tag yt">YouTube</span>')).join("")}</div>`
        : '<div class="empty">No YouTube results. Try different words.</div>'}`;
    pane.innerHTML = `
      <div class="search"><input class="in" id="pk-q" type="search" placeholder="${key ? "Search the library and YouTube (e.g. wall sit, copenhagen plank)" : `Search ${LIB.length} library exercises (e.g. wall sit, rotator cuff)`}" value="${esc(pk.q)}" aria-label="Search exercises"></div>
      <div class="chips">${regions.map(r => `<button class="chip" type="button" data-region="${esc(r)}" aria-pressed="${r === pk.region}">${esc(r)}</button>`).join("")}</div>
      ${qq && key ? `<h4 class="res-h">Exercise library <span>${list.length} match${list.length === 1 ? "" : "es"}</span></h4>` : ""}
      ${list.length ? `<div class="grid">${list.map(x => card(x, `<span class="tag">${esc(x.region)}</span>`)).join("")}</div>`
        : key ? (qq.length < 3 ? '<div class="empty">Keep typing to search YouTube too.</div>' : "")
        : `<div class="empty">Nothing in the library matches <b>${esc(pk.q)}</b>.<br><button class="btn sm" style="margin-top:10px" type="button" data-goyt="1">Search YouTube for “${esc(pk.q)}”</button></div>`}
      ${ytBlock}`;
    const qi = $("#pk-q"); qi.oninput = () => {
      pk.q = qi.value; const pos = qi.selectionStart; renderPane(); const n = $("#pk-q"); n.focus(); n.setSelectionRange(pos, pos);
      clearTimeout(pk.libT); const v = pk.q.trim();
      if (apiKey() && v.length >= 3 && v !== pk.libYtQ) pk.libT = setTimeout(() => libYtSearch(v), 600);
    };
  } else if (pk.tab === "yt") {
    if (!apiKey()) {
      pane.innerHTML = `<div class="note-box"><b>Live YouTube search needs a free API key.</b><ol>
          <li>Go to console.cloud.google.com and create a project.</li><li>Enable <b>YouTube Data API v3</b>.</li>
          <li>Create an API key under Credentials, then restrict it to this website.</li>
          <li>Paste it in <button class="btn link" type="button" data-act="settings" style="padding:0">Settings</button>.</li></ol></div>
        <p class="hint" style="margin-top:12px">Meanwhile, the exercise library and Paste a link both work without a key.</p>`;
      return;
    }
    pane.innerHTML = `
      <form class="search" id="yt-form"><input class="in" id="yt-q" type="search" placeholder="Search YouTube, e.g. copenhagen plank regression" value="${esc(pk.ytQ)}" aria-label="Search YouTube"><button class="btn primary" type="submit">Search</button></form>
      <p class="hint" style="margin-bottom:10px">Results are limited to short videos under 4 minutes.</p>
      <div>${pk.ytLoading ? '<div class="empty">Searching…</div>' : pk.ytErr ? `<div class="empty">${esc(pk.ytErr)}</div>` : pk.ytRes ? (pk.ytRes.length ? `<div class="grid">${pk.ytRes.map(v => card(v)).join("")}</div>` : '<div class="empty">No results. Try different words.</div>') : '<div class="empty">Type an exercise and press Search.</div>'}</div>`;
    $("#yt-form").onsubmit = ev => { ev.preventDefault(); pk.ytQ = $("#yt-q").value.trim(); ytSearch(); };
  } else {
    pane.innerHTML = `<label class="f" for="paste-in">YouTube link<input class="in" id="paste-in" type="url" placeholder="https://youtube.com/shorts/…  or  https://youtu.be/…" value="${esc(pk.paste)}"></label>
      <p class="hint" id="paste-hint" style="margin-top:8px">${esc(pk.pasteMsg || "Paste any YouTube, Shorts, or youtu.be link. The title fills in automatically.")}</p>`;
    const pi = $("#paste-in"); pi.oninput = () => onPaste(pi.value);
  }
}
async function ytSearch() {
  if (!pk.ytQ) return; pk.ytLoading = true; pk.ytErr = ""; renderPane();
  try {
    const u = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=18&safeSearch=strict&q=" + encodeURIComponent(pk.ytQ) + "&key=" + encodeURIComponent(apiKey());
    const j = await (await fetch(u)).json(); if (j.error) throw new Error(j.error.message || "Search failed");
    pk.ytRes = j.items.map(it => ({ id: it.id.videoId, title: decodeHtml(it.snippet.title), channel: it.snippet.channelTitle }));
  } catch (err) { pk.ytErr = "YouTube search failed: " + err.message + " Check the API key in Settings."; pk.ytRes = null; }
  pk.ytLoading = false; renderPane();
}
async function fetchYt(q) {
  const u = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=18&safeSearch=strict&relevanceLanguage=en&q=" + encodeURIComponent(q) + "&key=" + encodeURIComponent(apiKey());
  const j = await (await fetch(u)).json();
  if (j.error) throw new Error(j.error.message || "Search failed");
  return j.items.map(it => ({ id: it.id.videoId, title: decodeHtml(it.snippet.title), channel: it.snippet.channelTitle }));
}
async function libYtSearch(q) {
  pk.libYtQ = q; pk.libYtLoading = true; pk.libYtErr = ""; if (pk.tab === "lib" && pk.q.trim() === q) renderPaneKeepFocus();
  try { const res = await fetchYt(q); if (pk.libYtQ !== q) return; pk.libYt = res; }
  catch (err) { if (pk.libYtQ !== q) return; pk.libYt = null; pk.libYtErr = "YouTube search failed: " + err.message + " Check the API key in Settings."; }
  pk.libYtLoading = false; if (pk.tab === "lib" && pk.q.trim() === q) renderPaneKeepFocus();
}
function renderPaneKeepFocus() {
  const a = document.activeElement, had = a && a.id === "pk-q", pos = had ? a.selectionStart : 0;
  renderPane(); if (had) { const n = $("#pk-q"); n.focus(); n.setSelectionRange(pos, pos); }
}
function decodeHtml(s) { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }
function parseYt(s) { s = (s || "").trim(); const m = s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) || s.match(/^([A-Za-z0-9_-]{11})$/); return m ? m[1] : null; }
let pasteSeq = 0;
async function onPaste(val) {
  pk.paste = val; const id = parseYt(val), seq = ++pasteSeq;
  if (!id) { pk.sel = null; $("#paste-hint").textContent = val ? "That doesn't look like a YouTube link yet." : "Paste any YouTube, Shorts, or youtu.be link. The title fills in automatically."; renderPreview(); return; }
  pk.sel = { id, title: "YouTube video", channel: "" }; renderPreview();
  try { const j = await (await fetch("https://noembed.com/embed?url=" + encodeURIComponent(ytUrl(id)))).json(); if (seq === pasteSeq && j.title) { pk.sel = { id, title: j.title, channel: j.author_name || "" }; renderPreview(); } } catch (e) {}
}
$("#pk-pane").addEventListener("click", e => {
  const r = e.target.closest("[data-region]"); if (r) { pk.region = r.dataset.region; renderPane(); return; }
  if (e.target.closest("[data-goyt]")) { pk.ytQ = pk.q; setTab("yt"); if (apiKey()) ytSearch(); return; }
  const c = e.target.closest("[data-pick]"); if (!c) return;
  const pool = pk.tab === "lib" ? LIB.concat(pk.libYt || []) : (pk.ytRes || []);
  const v = pool.find(x => x.id === c.dataset.pick); if (!v) return;
  pk.sel = { id: v.id, title: v.title, channel: v.channel, name: v.name || "" };
  $$("#pk-pane .vc").forEach(x => x.setAttribute("aria-selected", x.dataset.pick === v.id)); renderPreview();
});
function renderPreview() {
  const box = $("#pk-preview"), v = pk.sel;
  if (!v) { box.innerHTML = `<div class="player">Pick a video to watch it here</div><p class="hint">Preview plays right here. No trip to YouTube.</p>`; return; }
  const ex = pk.mode === "replace" && !pk.target ? cur().plan.sections[pk.si].exercises[pk.ei] : null;
  box.innerHTML = `
    <div class="player"><iframe src="${embed(v.id)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
    <div><h4>${esc(v.title)}</h4><div class="meta">${esc(v.channel || "")}</div></div>
    ${pk.mode === "add" ? `<label class="f" for="pk-name">Exercise name<input class="in" id="pk-name" value="${esc(ex ? ex.name : (v.name || guessName(v.title)))}"></label>
      <div class="fields" style="grid-template-columns:1fr 1fr">
        <label class="f" for="pk-reps">Sets / reps<input class="in" id="pk-reps" placeholder="3 × 10"></label>
        <label class="f" for="pk-freq">Frequency<input class="in" id="pk-freq" placeholder="3× / week" list="freqs"></label></div>` : ""}
    <button class="btn primary" type="button" id="pk-use">${pk.mode === "add" ? "Add to plan" : "Use this video"}</button>`;
  $("#pk-use").onclick = useSelection;
}
function guessName(t) { return String(t || "").split(/[|\-–—:(]/)[0].replace(/how to (do|perform)( a| the)?/i, "").trim().slice(0, 50); }
function useSelection() {
  const c = cur(), v = pk.sel; if (!v) return;
  const video = { id: v.id, title: v.title, channel: v.channel };
  if (pk.target) { careItem(pk.target).video = video; toast("Video added"); }
  else if (pk.mode === "replace") { c.plan.sections[pk.si].exercises[pk.ei].video = video; toast("Video updated"); }
  else {
    const freq = $("#pk-freq").value.trim();
    c.plan.sections[pk.si].exercises.push({ id: uid(), name: $("#pk-name").value.trim() || guessName(v.title), reps: $("#pk-reps").value.trim(), load: "", freq, perWeek: perWeekFrom(freq), notes: "", video });
    toast("Added to " + (c.plan.sections[pk.si].title || "plan"));
  }
  scheduleSave(); closePicker(); renderEditor(); renderRail();
}

/* ---------- home-care preset picker ---------- */
const cp = $("#carepick");
function openCarePick(kind) {
  const c = cur(), P = window.CARE_PRESETS || { restrictions: [], care: [], redflags: [] };
  const titles = { r: "Add restrictions", c: "Add home care", f: "Add warning signs" };
  let items;
  if (kind === "r") items = P.restrictions.map(x => ({ cat: x.cat, label: x.text, sub: "", have: c.plan.restrictions.some(r => r.text === x.text), val: x }));
  else if (kind === "c") items = P.care.map(x => ({ cat: x.cat, label: x.title, sub: `${x.freq} · ${x.detail}`, have: c.plan.care.some(r => r.title === x.title), val: x }));
  else items = P.redflags.map(x => ({ cat: "", label: x, sub: "", have: c.plan.redflags.items.includes(x), val: x }));
  const cats = [...new Set(items.map(x => x.cat))];
  $("#cp-title").textContent = titles[kind];
  $("#cp-body").innerHTML = `
    <p class="hint" style="margin:0 0 12px">These are starting points. Edit the wording after adding so it matches what you told ${esc(first(c.name) || "the client")}.</p>
    ${cats.map(cat => `${cat ? `<h4 class="res-h">${esc(cat)}</h4>` : ""}<div class="cp-list">
      ${items.map((x, i) => x.cat !== cat ? "" : `<label class="cp-item${x.have ? " have" : ""}" for="cp-${i}"><input type="checkbox" id="cp-${i}" data-cpi="${i}"${x.have ? " checked disabled" : ""}><span><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}${x.have ? '<small class="ok">Already in plan</small>' : ""}</span></label>`).join("")}
    </div>`).join("")}`;
  const go = $("#cp-go"); go.disabled = true; go.textContent = "Add selected";
  $("#cp-body").onchange = () => { const n = $$("#cp-body [data-cpi]:checked:not(:disabled)").length; go.disabled = !n; go.textContent = n ? `Add ${n}` : "Add selected"; };
  go.onclick = () => {
    $$("#cp-body [data-cpi]:checked:not(:disabled)").forEach(el => {
      const v = items[+el.dataset.cpi].val;
      if (kind === "r") c.plan.restrictions.push({ id: uid(), text: v.text, until: "" });
      else if (kind === "c") c.plan.care.push({ id: uid(), cat: v.cat, title: v.title, freq: v.freq, until: "", daily: !!v.daily, detail: v.detail });
      else c.plan.redflags.items.push(v);
    });
    if (kind === "f" && !c.plan.redflags.intro) c.plan.redflags.intro = "Call the clinic right away if you notice any of these.";
    cp.close(); scheduleSave(); renderEditor(); toast("Added. Edit the wording to fit this client.");
  };
  cp.showModal ? cp.showModal() : cp.setAttribute("open", "");
}
$("#cp-close").onclick = () => cp.close();

/* ---------- settings ---------- */
const st = $("#settings");
function openSettings() {
  if (dlg.open) closePicker();
  $("#st-key").value = lsGet(KEYSTORE) || "";
  $("#st-key-src").textContent = window.YT_API_KEY ? "A key is built into this demo. Anything you enter here overrides it in this browser." : "No key is built in yet. Live YouTube search is off until one is added.";
  st.showModal ? st.showModal() : st.setAttribute("open", "");
}
$("#st-close").onclick = () => st.close();
$("#st-save").onclick = () => { lsSet(KEYSTORE, $("#st-key").value.trim()); st.close(); toast(apiKey() ? "API key saved. YouTube search is on." : "Key cleared"); };

/* ================= PATIENT VIEW ================= */
const P = { token: null, data: null, preview: false };
async function renderPatient(token, isPreview) {
  P.token = token; P.preview = isPreview;
  $("#app").innerHTML = `<div class="pv-wrap gut" style="padding-block:60px"><p class="hint">Loading your program…</p></div>`;
  const { data, error } = await sb.rpc("patient_get", { p_token: token });
  if (error || !data) {
    $("#app").innerHTML = `<div class="pv-wrap gut" style="padding-block:60px"><h2 class="pv-h">This link isn't active.</h2><p>Ask your therapist to send you a new link.</p></div>`; return;
  }
  P.data = data; const c = data.client, p = normPlan(c.plan);
  document.title = (c.name ? c.name + " · " : "") + "Home Program";
  const th = Math.max(0, Math.min(10, +p.guard.threshold || 0)), T = first(c.therapist_name) || "your therapist";
  const tdy = localDay();
  const activeR = p.restrictions.filter(r => r.text && (!r.until || r.until >= tdy));
  const activeC = p.care.filter(x => x.title && (!x.until || x.until >= tdy));
  $("#app").innerHTML = `
  ${isPreview ? `<div class="backbar"><div class="pv-wrap gut"><span><b>Preview.</b> This is exactly what ${esc(first(c.name) || "your client")} sees. It updates as you edit (reload this tab). Anything you post here shows up as the client.</span><button type="button" id="back">Close preview</button></div></div>` : ""}
  <div class="pv">
  <header class="pv-band"><div class="pv-wrap gut">
    <div class="pv-top"><img src="logo.png" alt="Onward Physical Therapy"><span class="eyebrow">Home exercise program</span></div>
    <div><h1>${esc(c.name || "Your program")}</h1>
      <div class="pv-meta">${c.therapist_name ? `<span>Therapist <b>${esc(c.therapist_name)}</b></span>` : ""}${c.focus ? `<span>Focus <b>${esc(c.focus)}</b></span>` : ""}<span>Updated <b>${esc(fmtDate(c.updated_at))}</b></span></div>
    </div>
    <nav class="pv-nav"><a href="#log" data-jump="log">Log pain</a><a href="#ask" data-jump="ask">Ask ${esc(T)}</a><span id="pv-newreplies"></span></nav>
  </div></header>
  <main class="pv-main"><div class="pv-wrap gut">
    ${activeR.length ? `<section class="restr" aria-labelledby="restr-h"><div class="eyebrow">Important</div><h2 class="pv-h" id="restr-h">Restrictions</h2>
      <ul>${activeR.map(r => `<li><div class="r-main"><span class="r-text">${esc(r.text)}</span><span class="r-until">${r.until ? "Until " + esc(fmtDay(r.until)) : "Until " + esc(T) + " clears you"}</span></div>
        ${r.video ? `<button class="howto" type="button" data-howto="${esc(r.video.id)}">▶ Watch how</button><div class="howto-player" hidden></div>` : ""}</li>`).join("")}</ul>
    </section>` : ""}
    ${p.goals.filter(g => g.title).length ? `<section><div class="eyebrow">What we're working toward</div><h2 class="pv-h">Goals</h2><div class="goals">
      ${p.goals.filter(g => g.title).map(g => `<div class="goal"><span class="pill${g.status === "Ongoing" ? "" : " next"}">${esc(g.status)}</span><h3>${esc(g.title)}</h3>${g.detail ? `<p>${esc(g.detail)}</p>` : ""}</div>`).join("")}
    </div></section>` : ""}
    ${p.sections.filter(s => s.exercises.length).map(s => `<section><div class="eyebrow">${esc(s.title)}</div><h2 class="pv-h">Your exercises</h2>
      ${s.exercises.map(e => `<article class="pex">
        ${e.video ? `<button class="pplay" type="button" data-play="${esc(e.video.id)}" aria-label="Play video: ${esc(e.name)}"><img src="${thumb(e.video.id)}" alt="" loading="lazy"><span class="pi"><span>${PLAY_L}</span></span><small>Tap to watch</small></button>` : `<div></div>`}
        <div class="pbody">
          <h3>${esc(e.name || "Exercise")}</h3>
          <dl class="rx">${e.reps ? `<div><dt>Sets / reps</dt><dd>${esc(e.reps)}</dd></div>` : ""}${e.load ? `<div><dt>Load</dt><dd>${esc(e.load)}</dd></div>` : ""}${e.freq ? `<div><dt>Frequency</dt><dd>${esc(e.freq)}</dd></div>` : ""}</dl>
          ${e.notes ? `<p class="pnote">${esc(e.notes)}</p>` : ""}
          ${e.perWeek > 0 ? `<div class="track" data-track="${esc(e.id)}" data-n="${e.perWeek}"><span class="lbl">This week</span><div class="dots"></div><span class="count"></span></div>` : ""}
          <div class="exnotes" data-exnotes="${esc(e.id)}"></div>
          <details class="addnote"><summary>Add a note for ${esc(T)}</summary>
            <form data-noteform="${esc(e.id)}" data-exname="${esc(e.name)}"><textarea class="in" rows="2" required maxlength="2000" placeholder="How did it feel? Anything ${esc(T)} should know?" aria-label="Note on ${esc(e.name)}"></textarea><button class="btn sm primary" type="submit">Send note</button></form>
          </details>
        </div></article>`).join("")}
    </section>`).join("")}

    ${activeC.length ? `<section id="care"><div class="eyebrow">Every day</div><h2 class="pv-h">Home care</h2>
      ${activeC.some(x => x.daily) ? `<div class="today" id="care-today"></div>` : ""}
      <div class="care-grid">${activeC.map(x => `<article class="care">
        ${x.video ? `<button class="pplay sm" type="button" data-play="${esc(x.video.id)}" aria-label="Play video: ${esc(x.title)}"><img src="${thumb(x.video.id)}" alt="" loading="lazy"><span class="pi"><span>${PLAY}</span></span><small>How to</small></button>` : ""}
        <div class="care-body">
          ${x.cat ? `<span class="tag">${esc(x.cat)}</span>` : ""}
          <h3>${esc(x.title || "Home care")}</h3>
          ${x.freq ? `<div class="care-freq">${esc(x.freq)}</div>` : ""}
          ${x.detail ? `<p>${esc(x.detail)}</p>` : ""}
          ${x.until ? `<small class="muted">Until ${esc(fmtDay(x.until))}</small>` : ""}
          ${x.daily ? `<button class="donebtn" type="button" data-done="${esc(x.id)}" aria-pressed="false">Mark done today</button>` : ""}
        </div></article>`).join("")}</div>
    </section>` : ""}

    <section id="log"><div class="eyebrow">Throughout the day</div><h2 class="pv-h">Log pain</h2>
      <form class="pv-card" id="painform">
        <label class="f" for="pf-act">What were you doing?<input class="in" id="pf-act" required maxlength="120" placeholder="e.g. Overhead press, stairs, sleeping" autocomplete="off"></label>
        <div class="chips" id="pf-chips">${["Training", "Work", "Stairs", "Sleeping", "Snowboarding", "Driving"].map(x => `<button class="chip" type="button" data-actchip="${x}">${x}</button>`).join("")}</div>
        <div class="f">Pain level</div>
        <div class="painpick" role="radiogroup" aria-label="Pain level 0 to 10">${Array.from({ length: 11 }, (_, n) => `<button type="button" role="radio" aria-checked="false" data-pain="${n}" class="${n <= th ? "g" : "r"}">${n}</button>`).join("")}</div>
        <label class="f" for="pf-note">Notes (optional)<input class="in" id="pf-note" maxlength="2000" placeholder="Where, what kind of pain, how long" autocomplete="off"></label>
        <p class="warnline" id="pf-warn" hidden>That's above your ${th}/10 limit. Stop or modify the activity, and ${esc(T)} will see this log.</p>
        <div><button class="btn primary" type="submit" id="pf-go" disabled>Log it</button></div>
      </form>
      <div id="painlist"></div>
    </section>

    <section id="ask"><div class="eyebrow">Between sessions</div><h2 class="pv-h">Ask ${esc(T)}</h2>
      <form class="pv-card" id="askform"><textarea class="in" id="ask-in" rows="3" required maxlength="2000" placeholder="Type your question. ${esc(T)} gets a notification and replies right here." aria-label="Your question"></textarea><div><button class="btn primary" type="submit">Send question</button></div></form>
      <div id="asklist"></div>
    </section>

    ${p.guard.signs.filter(Boolean).length ? `<section><div class="eyebrow">During training</div><h2 class="pv-h">Know when to back off</h2><div class="rails">
      ${p.guard.intro ? `<p>${esc(p.guard.intro)}</p>` : ""}
      <div class="scale" aria-label="Pain scale 0 to 10, stop above ${th}">${Array.from({ length: 11 }, (_, n) => `<div class="${n <= th ? "g" : "r"}${n === th ? " t" : ""}">${n}</div>`).join("")}</div>
      <div class="scale-key"><span>0–${th}: OK to keep going</span><span>Above ${th}/10: stop or modify</span></div>
      <ul class="stops">${p.guard.signs.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    </div></section>` : ""}
    ${p.redflags.items.filter(Boolean).length ? `<section class="redflags" aria-labelledby="rf-h"><div class="eyebrow">Don't wait</div><h2 class="pv-h" id="rf-h">Call us if…</h2>
      <p>${esc(p.redflags.intro || "Call the clinic right away if you notice any of these.")}</p>
      <ul>${p.redflags.items.filter(Boolean).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      ${p.redflags.phone ? `<p class="rf-phone">Clinic: <span class="sel">${esc(p.redflags.phone)}</span> <a class="btn sm" href="tel:${esc(p.redflags.phone.replace(/[^\d+]/g, ""))}">Call</a></p>` : ""}
      <p class="rf-911">Chest pain, trouble breathing, or any emergency: call 911.</p>
    </section>` : ""}
  </div></main>
  <footer class="pv-foot"><div class="pv-wrap gut"><span>Onward Physical Therapy</span><span>Bookmark this page. ${esc(T)} keeps it up to date.</span></div></footer>
  </div>`;

  if (isPreview) $("#back").onclick = () => { window.close(); setTimeout(() => { location.href = location.pathname; }, 200); };
  $$("[data-jump]").forEach(a => a.onclick = ev => { ev.preventDefault(); $("#" + a.dataset.jump).scrollIntoView({ behavior: "smooth" }); });
  $$("[data-play]").forEach(b => b.addEventListener("click", () => {
    b.innerHTML = `<iframe src="${embed(b.dataset.play)}" title="Exercise video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; b.style.cursor = "default"; b.removeAttribute("data-play");
  }, { once: true }));
  bindTrackers();
  bindCare();
  bindPatientForms(th);
  renderPatientLists();
  if (!isPreview) setTimeout(() => sb.rpc("patient_mark_read", { p_token: token }), 4000);
  pollTimer = setInterval(refreshPatient, 20000);
}
async function refreshPatient() {
  const { data } = await sb.rpc("patient_get", { p_token: P.token });
  if (data) { const had = P.data.entries.length; P.data = data; renderPatientLists(); if (data.entries.length > had && data.entries.some(e => e.author === "therapist" && !e.read_by_patient)) { toast("New reply from " + (first(data.client.therapist_name) || "your therapist")); if (!P.preview) setTimeout(() => sb.rpc("patient_mark_read", { p_token: P.token }), 4000); } }
}
function localDay(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fmtDay(s) { const d = new Date(s + "T12:00:00"); return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function bindCare() {
  $$("[data-howto]").forEach(b => b.onclick = () => {
    const box = b.nextElementSibling; const open = box.hidden;
    box.hidden = !open; b.textContent = open ? "Hide video" : "▶ Watch how";
    box.innerHTML = open ? `<div class="player"><iframe src="${embed(b.dataset.howto)}" title="How-to video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : "";
  });
  const btns = $$("[data-done]"); if (!btns.length) return;
  const day = localDay(), key = id => "care-" + P.token.slice(0, 8) + "-" + id + "-" + day;
  const paint = () => {
    let n = 0;
    btns.forEach(b => { const on = lsGet(key(b.dataset.done)) === "1"; if (on) n++; b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "✓ Done today" : "Mark done today"; });
    const t = $("#care-today"); if (t) t.innerHTML = `<b>Today:</b> ${n} of ${btns.length} done${n === btns.length ? " ✓" : ""}<span class="bar"><span style="width:${Math.round(n / btns.length * 100)}%"></span></span>`;
  };
  btns.forEach(b => b.onclick = () => { lsSet(key(b.dataset.done), lsGet(key(b.dataset.done)) === "1" ? "0" : "1"); paint(); });
  paint();
}
function bindTrackers() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const wk = d.toISOString().slice(0, 10);
  $$("[data-track]").forEach(t => {
    const key = "trk-" + P.token.slice(0, 8) + "-" + t.dataset.track + "-" + wk, n = +t.dataset.n;
    let done = parseInt(lsGet(key) || "0", 10) || 0;
    const draw = () => {
      $(".dots", t).innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" aria-pressed="${k < done}" aria-label="Session ${k + 1}">${k + 1}</button>`).join("");
      $(".count", t).textContent = done >= n ? "Done for the week ✓" : `${done} of ${n}`;
      $$(".dots button", t).forEach((btn, k) => btn.onclick = () => { done = done === k + 1 ? k : k + 1; lsSet(key, String(done)); draw(); });
    };
    draw();
  });
}
async function patientPost(args) {
  const { error } = await sb.rpc("patient_post", { p_token: P.token, ...args });
  if (error) { toast("Couldn't send: " + error.message); return false; }
  await refreshPatient(); return true;
}
function bindPatientForms(th) {
  let pain = null;
  $$("[data-pain]").forEach(b => b.onclick = () => {
    pain = +b.dataset.pain; $$("[data-pain]").forEach(x => x.setAttribute("aria-checked", String(x === b)));
    $("#pf-warn").hidden = pain <= th; $("#pf-go").disabled = false;
  });
  $$("[data-actchip]").forEach(b => b.onclick = () => { $("#pf-act").value = b.dataset.actchip; });
  $("#painform").onsubmit = async e => {
    e.preventDefault(); if (pain == null) return;
    const ok = await patientPost({ p_kind: "pain", p_pain: pain, p_activity: $("#pf-act").value.trim(), p_body: $("#pf-note").value.trim() });
    if (ok) { e.target.reset(); pain = null; $$("[data-pain]").forEach(x => x.setAttribute("aria-checked", "false")); $("#pf-go").disabled = true; $("#pf-warn").hidden = true; toast("Logged. " + (first(P.data.client.therapist_name) || "Your therapist") + " can see it."); }
  };
  $("#askform").onsubmit = async e => {
    e.preventDefault(); const v = $("#ask-in").value.trim(); if (!v) return;
    if (await patientPost({ p_kind: "question", p_body: v })) { e.target.reset(); toast("Question sent"); }
  };
  $$("[data-noteform]").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const ta = $("textarea", f), v = ta.value.trim(); if (!v) return;
    if (await patientPost({ p_kind: "note", p_body: v, p_exercise_id: f.dataset.noteform, p_exercise_name: f.dataset.exname })) { ta.value = ""; f.closest("details").open = false; toast("Note sent"); }
  });
}
function thread(e, all, T) {
  const kids = all.filter(k => k.parent_id === e.id);
  return `<div class="pt-item">
    <div class="pt-head">${e.kind === "pain" ? `<span class="painchip ${e.pain > (+P.data.client.plan.guard.threshold || 3) ? "hi" : "lo"}">${e.pain}/10</span> <b>${esc(e.activity || "")}</b>` : ""}<span class="when">${ago(e.created_at)}</span></div>
    ${e.body ? `<p>${esc(e.body)}</p>` : ""}
    ${kids.map(k => `<div class="reply ${k.author}"><b>${k.author === "therapist" ? esc(T) : "You"}</b>${k.author === "therapist" && !k.read_by_patient ? ' <span class="newpill">New reply</span>' : ""} <span class="when">${ago(k.created_at)}</span><p>${esc(k.body)}</p></div>`).join("")}
  </div>`;
}
function renderPatientLists() {
  const all = P.data.entries, T = first(P.data.client.therapist_name) || "Your therapist";
  const tops = all.filter(e => !e.parent_id).slice().reverse();
  $$("[data-exnotes]").forEach(box => {
    const list = tops.filter(e => e.kind === "note" && e.exercise_id === box.dataset.exnotes);
    box.innerHTML = list.length ? `<div class="pt-list">${list.map(e => thread(e, all, T)).join("")}</div>` : "";
  });
  const pains = tops.filter(e => e.kind === "pain");
  $("#painlist").innerHTML = pains.length ? `<h3 class="sub">Your recent logs</h3><div class="pt-list">${pains.slice(0, 15).map(e => thread(e, all, T)).join("")}</div>` : "";
  const qs = tops.filter(e => e.kind === "question");
  $("#asklist").innerHTML = qs.length ? `<div class="pt-list">${qs.map(e => thread(e, all, T)).join("")}</div>` : "";
  const nNew = all.filter(e => e.author === "therapist" && !e.read_by_patient).length;
  $("#pv-newreplies").innerHTML = nNew ? `<span class="newpill big">${nNew} new repl${nNew === 1 ? "y" : "ies"} from ${esc(T)}</span>` : "";
}

/* ---------- misc ---------- */
const dl = document.createElement("datalist"); dl.id = "freqs";
dl.innerHTML = ["Daily", "2× / week", "3× / week", "4× / week", "5× / week", "As needed", "Before training"].map(x => `<option value="${x}">`).join("");
document.body.appendChild(dl);
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" && !location.hash.startsWith("#p=")) renderAuth(); });

route();
})();
