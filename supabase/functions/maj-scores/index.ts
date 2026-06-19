// ============================================================
//  Edge Function Supabase : récupère les scores de la Coupe du
//  Monde via football-data.org et met à jour la table matches.
//  Le trigger "regler_paris" s'occupe ensuite des gagnants.
//
//  Secrets à définir (supabase secrets set ...) :
//   - FOOTBALL_API_KEY  (clé gratuite de football-data.org)
//  (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis auto)
// ============================================================

const SUPA = Deno.env.get("SUPABASE_URL")!
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FOOT = Deno.env.get("FOOTBALL_API_KEY")!

// Nos noms (FR) -> noms football-data.org (EN). À ajuster si besoin.
const MAP: Record<string, string> = {
  "France": "France", "Mexique": "Mexico", "Sénégal": "Senegal", "Norvège": "Norway",
  "Argentine": "Argentina", "Croatie": "Croatia", "Japon": "Japan", "Maroc": "Morocco",
  "Brésil": "Brazil", "Allemagne": "Germany", "Corée du Sud": "Korea Republic", "Équateur": "Ecuador",
  "Espagne": "Spain", "Pays-Bas": "Netherlands", "États-Unis": "United States", "Cameroun": "Cameroon",
  "Afrique du Sud": "South Africa", "Tchéquie": "Czechia", "Canada": "Canada",
  "Bosnie-Herzégovine": "Bosnia and Herzegovina", "Qatar": "Qatar", "Suisse": "Switzerland",
  "Haïti": "Haiti", "Écosse": "Scotland", "Paraguay": "Paraguay", "Australie": "Australia", "Turquie": "Türkiye",
  "Curaçao": "Curaçao", "Côte d'Ivoire": "Ivory Coast", "Suède": "Sweden", "Tunisie": "Tunisia",
  "Belgique": "Belgium", "Égypte": "Egypt", "Iran": "Iran", "Nouvelle-Zélande": "New Zealand",
  "Cap-Vert": "Cape Verde", "Arabie Saoudite": "Saudi Arabia", "Uruguay": "Uruguay", "Irak": "Iraq",
  "Algérie": "Algeria", "Autriche": "Austria", "Jordanie": "Jordan", "Portugal": "Portugal",
  "RD Congo": "DR Congo", "Ouzbékistan": "Uzbekistan", "Colombie": "Colombia",
  "Angleterre": "England", "Ghana": "Ghana", "Panama": "Panama",
}
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")

Deno.serve(async () => {
  // 1) Nos matchs pas encore terminés
  const nos = await fetch(
    `${SUPA}/rest/v1/matches?score_domicile=is.null&select=id,dom:equipe_domicile(nom),ext:equipe_exterieur(nom)`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } },
  ).then((r) => r.json())

  // 2) Résultats terminés de la Coupe du Monde
  const fd = await fetch("https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED", {
    headers: { "X-Auth-Token": FOOT },
  }).then((r) => r.json())

  const res = new Map<string, { h: number; a: number }>()
  for (const m of (fd.matches || [])) {
    const sc = m.score?.fullTime
    if (sc && sc.home != null && sc.away != null) {
      res.set(norm(m.homeTeam?.name) + "|" + norm(m.awayTeam?.name), { h: sc.home, a: sc.away })
    }
  }

  let maj = 0
  for (const m of nos) {
    const dom = norm(MAP[m.dom?.nom] || m.dom?.nom)
    const ext = norm(MAP[m.ext?.nom] || m.ext?.nom)
    const r = res.get(dom + "|" + ext)
    if (r) {
      await fetch(`${SUPA}/rest/v1/matches?id=eq.${m.id}`, {
        method: "PATCH",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ score_domicile: r.h, score_exterieur: r.a }),
      })
      maj++
    }
  }
  return new Response(JSON.stringify({ ok: true, matchs_mis_a_jour: maj }), { headers: { "Content-Type": "application/json" } })
})
