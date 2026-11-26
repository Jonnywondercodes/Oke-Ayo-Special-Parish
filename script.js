var $ = function (s) { return document.querySelector(s) };
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var WEEK = [{ n: "Sunday Service", d: 0, h: 8, m: 0, live: { p: "YouTube", u: "https://www.youtube.com" } },
{ n: "Wednesday Service", d: 3, h: 17, m: 30, live: null }, { n: "Friday Prayer", d: 5, h: 18, m: 0, live: { p: "Facebook", u: "https://www.facebook.com" } }];
var MONTH = [["First Sunday", "Thanksgiving Service"], ["Second Saturday", "Youth Programme"], ["Last Friday", "Night Vigil"]];
var YEAR = [["March", "Anniversary Celebration"], ["August", "Convention"], ["October", "Harvest Thanksgiving"], ["December", "Carol and Crossover Service"]];
var HIST = [["Year", "How the church began", "Sample paragraph about the founding of the church."], ["Year", "Growth of the parish", "Sample paragraph about key moments and leaders."], ["Year", "Today", "Sample paragraph about the church now."]];

var HYMNS = [];

function plain(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() }
function nextOf(p) { var n = new Date(), t = new Date(n); t.setHours(p.h, p.m, 0, 0); t.setDate(n.getDate() + ((p.d - n.getDay() + 7) % 7)); if (t < n) t.setDate(t.getDate() + 7); return t }
function when(t) { var ms = t - new Date(), m = Math.round(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? "in " + d + "d " + h + "h" : h ? "in " + h + "h " + (m % 60) + "m" : "in " + m + "m" }
function time(p) { var h = p.h % 12 || 12; return h + ":" + String(p.m).padStart(2, "0") + (p.h < 12 ? " AM" : " PM") }
function liveHtml(p) { return p.live ? '<a class="btn" target="_blank" rel="noopener" href="' + p.live.u + '">▶ Watch on ' + p.live.p + '</a>' : '<span class="na">Not available for stream.</span>' }
function nextCard() {
    var best = WEEK.map(function (p) { return { p: p, t: nextOf(p) } }).sort(function (a, b) { return a.t - b.t })[0], p = best.p;
    return '<div class="card next"><span class="tag">Next program</span><div class="big">' + p.n + '</div><div>' + DAYS[p.d] + ' · ' + time(p) + ' · <b>' + when(best.t) + '</b></div><div style="margin-top:8px">' + liveHtml(p) + '</div></div>'
}

function fillStatic() {
    $("#home-next").innerHTML = nextCard(); $("#next-big").innerHTML = nextCard() + '<h2>Coming up this week</h2><div class="card">' + WEEK.slice().sort(function (a, b) { return nextOf(a) - nextOf(b) }).map(rowW).join("") + '</div>';
    $("#wk").innerHTML = WEEK.slice().sort(function (a, b) { return a.d - b.d }).map(rowW).join("");
    $("#mo").innerHTML = MONTH.map(function (r) { return '<div class="row"><b>' + r[1] + '</b><span class="mut">' + r[0] + ' of every month</span></div>' }).join("");
    $("#an").innerHTML = YEAR.map(function (r) { return '<div class="row"><b>' + r[1] + '</b><span class="mut">' + r[0] + '</span></div>' }).join("");
    $("#tl").innerHTML = HIST.map(function (h) { return '<div class="card"><span class="lab">' + h[0] + '</span><h3 style="margin:.2em 0">' + h[1] + '</h3><p>' + h[2] + '</p><div class="ph">Photo placeholder</div></div>' }).join("")
}
function rowW(p) { return '<div class="row"><span><b>' + p.n + '</b><br><span class="mut">' + DAYS[p.d] + ' · ' + time(p) + '</span></span>' + liveHtml(p) + '</div>' }

function listHymns() {
    var q = plain($("#q").value.trim()), r = HYMNS.filter(function (h) { return !q || String(h.n) === q || plain(h.t).indexOf(q) > -1 || plain(h.v.join(" ") + h.c).indexOf(q) > -1 });
    $("#count").textContent = r.length + " hymn" + (r.length == 1 ? "" : "s") + " · " + HYMNS.length + " in this preview (about 500 planned)";
    $("#hy-grid").innerHTML = r.length ? r.map(function (h) { return '<a class="card hy" href="#hymn-' + h.n + '"><span class="num">' + h.n + '</span><b>' + h.t + '</b></a>' }).join("") : '<p class="na">No hymns match your search yet. More are being added.</p>'
}
function showHymn(n) {
    var i = HYMNS.findIndex(function (h) { return h.n == n }), h = HYMNS[i];
    if (!h) { location.hash = "hymns"; return }
    var body = h.v.map(function (v, k) { var amen = v === "Amin."; return '<p class="st">' + (amen ? "" : "<span class=lab>Verse " + (k + 1) + "</span>") + v + '</p>' + (h.c && !amen ? '<p class="st ch"><span class="lab">Chorus</span>' + h.c + '</p>' : "") }).join("");
    var pv = HYMNS[i - 1], nx = HYMNS[i + 1];
    $("#hy-view").innerHTML = '<a href="#hymns">← All hymns</a><h1><span class="mut">No. ' + h.n + '</span><br>' + h.t + '</h1><div class="tools"><button class="btn ghost" data-fs="-.1">A−</button><button class="btn ghost" data-fs=".1">A+</button></div>' + body + '<div class="tools">' + (pv ? '<a class="btn ghost" href="#hymn-' + pv.n + '">← ' + pv.n + '</a>' : "") + (nx ? '<a class="btn ghost" href="#hymn-' + nx.n + '">' + nx.n + ' →</a>' : "") + '</div>'
}

function route() {
    var h = location.hash.slice(1) || "home", m = /^hymn-(\d+)$/.exec(h), v = m ? "hymns" : h;
    if (!$("#v-" + v)) v = "home";
    document.querySelectorAll(".view").forEach(function (s) { s.classList.toggle("on", s.id === "v-" + v) });
    $("#hy-list").hidden = !!m; $("#hy-view").hidden = !m; if (m) showHymn(m[1]);
    document.querySelectorAll("nav a[data-v]").forEach(function (a) { a.classList.toggle("on", a.dataset.v === v) });
    $("#dd").classList.toggle("on", ["next", "weekly", "monthly", "annual"].indexOf(v) > -1);
    $("#nav").classList.remove("open"); document.querySelector(".has").classList.remove("open"); window.scrollTo(0, 0)
}

$("#q").addEventListener("input", listHymns);
$("#menu").onclick = function () { $("#nav").classList.toggle("open") };
$("#dd").onclick = function (e) { e.stopPropagation(); document.querySelector(".has").classList.toggle("open") };
document.addEventListener("click", function (e) {
    if (!e.target.closest(".has")) document.querySelector(".has").classList.remove("open");
    var b = e.target.closest("[data-fs]"); if (b) { var s = document.documentElement.style, c = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fs")) || 1.15; s.setProperty("--fs", Math.min(2.4, Math.max(.9, c + parseFloat(b.dataset.fs))) + "rem") }
});
$("#theme").onclick = function () { var r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches; r.dataset.theme = dark ? "light" : "dark" };
addEventListener("hashchange", route);
fillStatic(); listHymns(); route(); setInterval(fillStatic, 6e4);

loadData().then(function (d) { if (d) { HYMNS = d.HYMNS; WEEK = d.WEEK; MONTH = d.MONTH; YEAR = d.YEAR; HIST = d.HIST; fillStatic(); listHymns(); route() } }).catch(function (e) { console.warn("Using sample data:", e) });