
var C = window.APP_CONFIG || {}, sb = window.supabase.createClient(C.url, C.key);
var $ = function (s) { return document.querySelector(s) }, DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] }) }
function plain(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() }
function toast(m, bad) { var t = $("#toast"); t.textContent = m; t.className = bad ? "bad" : ""; t.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(function () { t.style.display = "none" }, bad ? 6000 : 2500) }
function sel(id) { document.querySelectorAll(id + " .it").forEach(function (b) { b.classList.remove("on") }) }

/* ---- auth ---- */
async function enter(u) {
    var a = await sb.from("admins").select("user_id").eq("user_id", u.id);
    if (a.error || !a.data.length) { $("#lerr").textContent = "This account is signed in but is not an admin yet."; await sb.auth.signOut(); return }
    $("#login").hidden = true; $("#app").hidden = false; $("#who").textContent = "· " + u.email; loadHymns(); loadProg(); loadHist()
}
$("#go").onclick = async function () {
    var r = await sb.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value });
    if (r.error) { $("#lerr").textContent = r.error.message; return } $("#lerr").textContent = ""; enter(r.data.user)
};
$("#pw").onkeydown = function (e) { if (e.key === "Enter") $("#go").click() };
$("#out").onclick = async function () { await sb.auth.signOut(); location.reload() };
document.querySelectorAll(".tab[data-t]").forEach(function (b) {
    b.onclick = function () {
        document.querySelectorAll(".tab[data-t]").forEach(function (x) { x.classList.toggle("on", x === b) });
        ["hymns", "programs", "history"].forEach(function (t) { $("#t-" + t).hidden = t !== b.dataset.t })
    }
});
sb.auth.getSession().then(function (r) { if (r.data.session) enter(r.data.session.user) });

/* ---- hymns ---- */
var HY = [], curH = null;
async function loadHymns() {
    var r = await sb.from("hymn_texts").select("hymn_number,title").eq("language", "yo").order("hymn_number");
    if (r.error) return toast(r.error.message, 1); HY = r.data; drawHymns()
}
function drawHymns() {
    var q = plain($("#hq").value.trim());
    $("#hl").innerHTML = HY.filter(function (h) { return !q || String(h.hymn_number) === q || plain(h.title).indexOf(q) > -1 }).map(function (h) {
        return '<button class="it' + (h.hymn_number === curH ? " on" : "") + '" data-n="' + h.hymn_number + '"><span class="n">' + h.hymn_number + '</span><span>' + esc(h.title) + '</span></button>'
    }).join("") || '<p class="mut">No hymns found.</p>'
}
$("#hq").oninput = drawHymns;
$("#hl").onclick = function (e) { var b = e.target.closest("[data-n]"); if (b) editHymn(+b.dataset.n) };
$("#hnew").onclick = function () { curH = null; drawHymns(); hymnForm(null, "", "", [""], true) };
async function editHymn(n) {
    curH = n; drawHymns();
    var r = await sb.from("hymn_sections").select("position,type,text").eq("hymn_number", n).eq("language", "yo").order("position");
    if (r.error) return toast(r.error.message, 1);
    var ch = r.data.find(function (x) { return x.type === "chorus" }), vs = r.data.filter(function (x) { return x.type === "verse" }).map(function (x) { return x.text });
    hymnForm(n, HY.find(function (h) { return h.hymn_number === n }).title, ch ? ch.text : "", vs.length ? vs : [""], r.data.some(function (x) { return x.type === "amen" }))
}
function vHtml(t) { return '<div class="v"><div><span class="vn"></span><button class="btn d" data-rm style="padding:2px 10px">Remove</button></div><textarea>' + esc(t) + '</textarea></div>' }
function numberVerses() { document.querySelectorAll("#vs .vn").forEach(function (s, i) { s.textContent = "Verse " + (i + 1) }) }
function hymnForm(n, title, ch, vs, amen) {
    $("#he").innerHTML = '<div class="two"><div><label>Hymn number</label><input id="hn" type="number" min="1" value="' + (n || "") + '"' + (n ? " disabled" : "") + '></div><div><label>Title</label><input id="ht" value="' + esc(title) + '"></div></div>' +
        '<label>Chorus (leave empty if none; shown after every verse)</label><textarea id="hc">' + esc(ch) + '</textarea>' +
        '<label>Verses</label><div id="vs">' + vs.map(vHtml).join("") + '</div><button class="btn" id="addv">+ Add verse</button>' +
        '<label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:1rem;color:inherit"><input id="ha" type="checkbox" style="width:auto"' + (amen ? " checked" : "") + '> End with “Amin.”</label>' +
        '<div class="row"><button class="btn p" id="hs">Save hymn</button>' + (n ? '<button class="btn d" id="hd">Delete hymn</button>' : "") + '</div>';
    numberVerses();
    $("#addv").onclick = function () { $("#vs").insertAdjacentHTML("beforeend", vHtml("")); numberVerses() };
    $("#vs").onclick = function (e) { var b = e.target.closest("[data-rm]"); if (b) { b.closest(".v").remove(); numberVerses() } };
    $("#hs").onclick = saveHymn; if (n) $("#hd").onclick = delHymn
}
async function saveHymn() {
    var n = parseInt($("#hn").value, 10), title = $("#ht").value.trim(), ch = $("#hc").value.trim(),
        vs = [].map.call(document.querySelectorAll("#vs textarea"), function (t) { return t.value.trim() }).filter(Boolean);
    if (!n || !title) return toast("Number and title are required", 1); if (!vs.length) return toast("Add at least one verse", 1);
    if (curH == null && HY.some(function (h) { return h.hymn_number === n })) return toast("Hymn " + n + " already exists. Pick it from the list to edit it.", 1);
    var rows = []; if (ch) rows.push({ position: 0, type: "chorus", chorus_follows: false, text: ch });
    vs.forEach(function (t, i) { rows.push({ position: i + 1, type: "verse", chorus_follows: !!ch, text: t }) });
    if ($("#ha").checked) rows.push({ position: vs.length + 1, type: "amen", chorus_follows: false, text: "Amin." });
    rows.forEach(function (r) { r.hymn_number = n; r.language = "yo" });
    var e = (await sb.from("hymns").upsert({ number: n })).error || (await sb.from("hymn_texts").upsert({ hymn_number: n, language: "yo", title: title })).error ||
        (await sb.from("hymn_sections").upsert(rows, { onConflict: "hymn_number,language,position" })).error;
    if (!e) e = (await sb.from("hymn_sections").delete().eq("hymn_number", n).eq("language", "yo").not("position", "in", "(" + rows.map(function (r) { return r.position }).join(",") + ")")).error;
    if (e) return toast(e.message, 1); curH = n; toast("Saved hymn " + n); await loadHymns(); $("#hn").disabled = true
}
async function delHymn() {
    if (!confirm("Delete hymn " + curH + " permanently?")) return;
    var r = await sb.from("hymns").delete().eq("number", curH); if (r.error) return toast(r.error.message, 1);
    toast("Deleted hymn " + curH); curH = null; $("#he").innerHTML = '<p class="mut">Hymn deleted.</p>'; loadHymns()
}

/* ---- programs ---- */
var PR = [], curP = null;
async function loadProg() { var r = await sb.from("programs").select("*").order("kind").order("id"); if (r.error) return toast(r.error.message, 1); PR = r.data; drawProg() }
function pt(p) { return p.kind === "weekly" ? DAYS[p.day] + " · " + String(p.hour).padStart(2, "0") + ":" + String(p.minute).padStart(2, "0") : (p.when_text || "") }
function drawProg() { $("#pl").innerHTML = PR.map(function (p) { return '<button class="it' + (p.id === curP ? " on" : "") + '" data-i="' + p.id + '"><span><b>' + esc(p.name) + '</b><br><span class="mut">' + p.kind + " · " + esc(pt(p)) + (p.live_on ? " · LIVE link on" : "") + "</span></span></button>" }).join("") }
$("#pl").onclick = function (e) { var b = e.target.closest("[data-i]"); if (b) { curP = +b.dataset.i; drawProg(); progForm(PR.find(function (p) { return p.id === curP })) } };
$("#pnew").onclick = function () { curP = null; drawProg(); progForm({ kind: "weekly", name: "", day: 0, hour: 8, minute: 0, when_text: "", live_platform: "", live_url: "", live_on: false }) };
function progForm(p) {
    var tm = p.hour == null ? "" : String(p.hour).padStart(2, "0") + ":" + String(p.minute || 0).padStart(2, "0");
    $("#pe").innerHTML = '<div class="two"><div><label>Type</label><select id="pk">' + ["weekly", "monthly", "annual"].map(function (k) { return '<option' + (k === p.kind ? " selected" : "") + ">" + k + "</option>" }).join("") + '</select></div><div><label>Name</label><input id="pn" value="' + esc(p.name) + '"></div></div>' +
        '<div id="pw1" class="two"><div><label>Day</label><select id="pd">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === p.day ? " selected" : "") + ">" + d + "</option>" }).join("") + '</select></div><div><label>Time</label><input id="ptm" type="time" value="' + tm + '"></div></div>' +
        '<div id="pw2"><label>When (e.g. First Sunday, October)</label><input id="pwt" value="' + esc(p.when_text || "") + '"></div>' +
        '<label>Live stream platform</label><select id="pp">' + ["", "YouTube", "Facebook", "TikTok"].map(function (k) { return '<option value="' + k + '"' + (k === (p.live_platform || "") ? " selected" : "") + ">" + (k || "None") + "</option>" }).join("") + '</select>' +
        '<label>Live stream link</label><input id="pu" value="' + esc(p.live_url || "") + '" placeholder="https://…">' +
        '<label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:1rem;color:inherit"><input id="po" type="checkbox" style="width:auto"' + (p.live_on ? " checked" : "") + '> Show the “Watch live” button on the site</label>' +
        '<div class="row"><button class="btn p" id="ps">Save</button>' + (curP ? '<button class="btn d" id="pdl">Delete</button>' : "") + "</div>";
    var sw = function () { var w = $("#pk").value === "weekly"; $("#pw1").hidden = !w; $("#pw2").hidden = w }; $("#pk").onchange = sw; sw();
    $("#ps").onclick = saveProg; if (curP) $("#pdl").onclick = function () { delRow("programs", curP, loadProg, "#pe") }
}
async function saveProg() {
    var k = $("#pk").value, w = k === "weekly", tm = ($("#ptm").value || "").split(":"), name = $("#pn").value.trim();
    if (!name) return toast("Name is required", 1);
    var o = {
        kind: k, name: name, day: w ? +$("#pd").value : null, hour: w ? +tm[0] || 0 : null, minute: w ? +tm[1] || 0 : null, when_text: w ? null : $("#pwt").value.trim(),
        live_platform: $("#pp").value || null, live_url: $("#pu").value.trim() || null, live_on: $("#po").checked
    };
    if (o.live_on && !o.live_url) return toast("Paste the stream link or untick the live button", 1);
    var r = curP ? await sb.from("programs").update(o).eq("id", curP) : await sb.from("programs").insert(o);
    if (r.error) return toast(r.error.message, 1); toast("Saved"); await loadProg()
}

/* ---- history ---- */
var HS = [], curZ = null;
async function loadHist() { var r = await sb.from("history").select("*").order("sort_order"); if (r.error) return toast(r.error.message, 1); HS = r.data; drawHist() }
function drawHist() { $("#zl").innerHTML = HS.map(function (h) { return '<button class="it' + (h.id === curZ ? " on" : "") + '" data-z="' + h.id + '"><span class="n">' + h.sort_order + "</span><span>" + esc(h.title) + "</span></button>" }).join("") }
$("#zl").onclick = function (e) { var b = e.target.closest("[data-z]"); if (b) { curZ = +b.dataset.z; drawHist(); histForm(HS.find(function (h) { return h.id === curZ })) } };
$("#znew").onclick = function () { curZ = null; drawHist(); histForm({ sort_order: HS.length + 1, year_label: "", title: "", body: "" }) };
function histForm(h) {
    $("#ze").innerHTML = '<div class="two"><div><label>Order</label><input id="zo" type="number" value="' + h.sort_order + '"></div><div><label>Year or period</label><input id="zy" value="' + esc(h.year_label || "") + '"></div></div>' +
        '<label>Title</label><input id="zt" value="' + esc(h.title) + '"><label>Text</label><textarea id="zb" style="min-height:200px">' + esc(h.body) + "</textarea>" +
        '<div class="row"><button class="btn p" id="zs">Save</button>' + (curZ ? '<button class="btn d" id="zd">Delete</button>' : "") + "</div>";
    $("#zs").onclick = async function () {
        var o = { sort_order: +$("#zo").value || 0, year_label: $("#zy").value.trim(), title: $("#zt").value.trim(), body: $("#zb").value.trim() };
        if (!o.title || !o.body) return toast("Title and text are required", 1);
        var r = curZ ? await sb.from("history").update(o).eq("id", curZ) : await sb.from("history").insert(o);
        if (r.error) return toast(r.error.message, 1); toast("Saved"); await loadHist()
    };
    if (curZ) $("#zd").onclick = function () { delRow("history", curZ, loadHist, "#ze") }
}
async function delRow(t, id, reload, pane) {
    if (!confirm("Delete this permanently?")) return;
    var r = await sb.from(t).delete().eq("id", id); if (r.error) return toast(r.error.message, 1);
    $(pane).innerHTML = '<p class="mut">Deleted.</p>'; toast("Deleted"); reload()
}