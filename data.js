// Loads hymns, programs and history from Supabase. If config.js is empty or anything fails,
// the site quietly keeps its built-in sample data.
async function loadData() {
  const c = window.APP_CONFIG || {};
  if (!c.url || !c.key || !window.supabase) return null;
  const sb = window.supabase.createClient(c.url, c.key);
  const [t, s, p, y] = await Promise.all([
    sb.from("hymn_texts").select("hymn_number,title").eq("language", "yo").order("hymn_number"),
    sb.from("hymn_sections").select("hymn_number,position,type,text").eq("language", "yo").order("position"),
    sb.from("programs").select("*").order("id"),
    sb.from("history").select("*").order("sort_order")
  ]);
  const bad = [t, s, p, y].find(function (r) { return r.error; });
  if (bad) throw bad.error;

  const HYMNS = t.data.map(function (h) {
    const rows = s.data.filter(function (r) { return r.hymn_number === h.hymn_number; });
    const ch = rows.find(function (r) { return r.type === "chorus"; });
    return {
      n: h.hymn_number, t: h.title, c: ch ? ch.text : "",
      v: rows.filter(function (r) { return r.type !== "chorus"; }).map(function (r) { return r.text; })
    };
  }).filter(function (h) { return h.v.length; });

  const of = function (k) { return p.data.filter(function (r) { return r.kind === k; }); };
  return {
    HYMNS: HYMNS,
    WEEK: of("weekly").map(function (r) {
      return { n: r.name, d: r.day, h: r.hour, m: r.minute,
        live: r.live_on && r.live_url ? { p: r.live_platform, u: r.live_url } : null };
    }),
    MONTH: of("monthly").map(function (r) { return [r.when_text, r.name]; }),
    YEAR: of("annual").map(function (r) { return [r.when_text, r.name]; }),
    HIST: y.data.map(function (r) { return [r.year_label || "", r.title, r.body]; })
  };
}
