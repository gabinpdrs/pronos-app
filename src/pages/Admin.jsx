import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const [matchs, setMatchs] = useState([])
  const [joueurs, setJoueurs] = useState([])
  const [scores, setScores] = useState({})  // { matchId: { dom, ext } }
  const [tab, setTab] = useState({})         // { matchId: teamId } qui passe aux t.a.b (matchs du tableau)
  const [ajout, setAjout] = useState({})     // { userId: montant }
  const [msg, setMsg] = useState(null)
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)
    const { data: m } = await supabase
      .from('matches')
      .select('id, date_match, poule, tour, cote_domicile, cote_nul, cote_exterieur, cote_score, dom:equipe_domicile(id,nom), ext:equipe_exterieur(id,nom)')
      .is('score_domicile', null)
      .order('date_match', { ascending: true })
    const { data: j } = await supabase.from('profiles').select('id, prenom, jetons').order('prenom')
    setMatchs(m ?? [])
    setJoueurs(j ?? [])
    setChargement(false)
  }

  async function recalculerCotes() {
    setMsg(null)
    const { data, error } = await supabase.rpc('recalculer_cotes')
    if (error) { setMsg({ type: 'erreur', texte: error.message }); return }
    setMsg({ type: 'succes', texte: `✅ Cotes recalculées (${data ?? 0} match(s)).` })
    await charger()
  }
  useEffect(() => { charger() }, [])

  function setScore(id, cote, val) {
    setScores((p) => ({ ...p, [id]: { ...p[id], [cote]: val } }))
  }

  async function validerScore(matchId) {
    setMsg(null)
    const m = matchs.find((x) => x.id === matchId)
    const s = scores[matchId] || {}
    const d = parseInt(s.dom, 10), e = parseInt(s.ext, 10)
    if (Number.isNaN(d) || Number.isNaN(e)) { setMsg({ type: 'erreur', texte: 'Entre les deux scores.' }); return }

    const maj = { score_domicile: d, score_exterieur: e }
    // Match du tableau + égalité : il faut un vainqueur (tirs au but)
    if (m?.tour && d === e) {
      const pw = parseInt(tab[matchId], 10)
      if (Number.isNaN(pw)) { setMsg({ type: 'erreur', texte: 'Match nul : choisis qui passe aux tirs au but.' }); return }
      maj.gagnant_penalty = pw
    }

    const { error } = await supabase.from('matches').update(maj).eq('id', matchId)
    if (error) { setMsg({ type: 'erreur', texte: error.message }); return }
    setMsg({ type: 'succes', texte: '✅ Score enregistré ! Les paris sont réglés.' })
    await charger()
  }

  async function ajuster(userId, signe) {
    setMsg(null)
    const v = parseInt(ajout[userId], 10)
    if (Number.isNaN(v) || v <= 0) { setMsg({ type: 'erreur', texte: 'Entre un nombre de jetons.' }); return }
    const { error } = await supabase.rpc('ajuster_jetons', { p_user_id: userId, p_montant: signe * v })
    if (error) { setMsg({ type: 'erreur', texte: error.message }); return }
    setAjout((a) => ({ ...a, [userId]: '' }))
    setMsg({ type: 'succes', texte: '✅ Jetons mis à jour.' })
    await charger()
  }

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🛠️ Admin</h1><p>Saisir les scores & gérer les jetons</p></div>
      </header>

      {msg && <p className={msg.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{msg.texte}</p>}

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          {/* Recalcul automatique des cotes */}
          <div className="section-titre">🎲 Cotes</div>
          <div className="card">
            <p className="muted" style={{ marginTop: 0 }}>
              Recalcule automatiquement les cotes de tous les matchs (selon la forme des équipes).
              Les paris déjà posés sont mis à jour, sauf à moins de 2h du match.
            </p>
            <button onClick={recalculerCotes}>🎲 Recalculer toutes les cotes</button>
          </div>

          {/* Saisie des scores */}
          <div className="section-titre">⚽ Saisir un score</div>
          {matchs.length === 0 ? (
            <div className="card"><p className="muted">Aucun match à régler.</p></div>
          ) : (
            matchs.map((m) => (
              <div className="card" key={m.id}>
                {m.poule && <span className="poule-badge">{m.poule}</span>}
                {m.tour && <span className="poule-badge">🏆 {m.tour}</span>}
                <div className="match-date">📅 {new Date(m.date_match).toLocaleString('fr-FR')}</div>
                <div className="match-equipes">
                  <div className="equipe"><div className="equipe-nom">{m.dom?.nom}</div></div>
                  <div className="vs">VS</div>
                  <div className="equipe"><div className="equipe-nom">{m.ext?.nom}</div></div>
                </div>
                <div className="ligne-score">
                  <input type="number" min="0" placeholder="0" value={scores[m.id]?.dom ?? ''} onChange={(e) => setScore(m.id, 'dom', e.target.value)} />
                  <span className="tiret">-</span>
                  <input type="number" min="0" placeholder="0" value={scores[m.id]?.ext ?? ''} onChange={(e) => setScore(m.id, 'ext', e.target.value)} />
                </div>
                {m.tour && scores[m.id]?.dom !== undefined && scores[m.id]?.dom !== '' && scores[m.id]?.dom === scores[m.id]?.ext && (
                  <div style={{ marginBottom: 8 }}>
                    <p className="muted" style={{ margin: '0 0 4px' }}>Égalité → qui passe aux tirs au but ?</p>
                    <select value={tab[m.id] ?? ''} onChange={(e) => setTab((t) => ({ ...t, [m.id]: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">— choisir —</option>
                      <option value={m.dom?.id}>{m.dom?.nom}</option>
                      <option value={m.ext?.id}>{m.ext?.nom}</option>
                    </select>
                  </div>
                )}
                <button onClick={() => validerScore(m.id)}>Valider le score</button>
              </div>
            ))
          )}

          {/* Gestion des jetons */}
          <div className="section-titre">🪙 Jetons des joueurs</div>
          <div className="card">
            {joueurs.map((j) => (
              <div className="rang" key={j.id}>
                <span className="rang-nom">{j.prenom}</span>
                <span className="rang-pts">🪙 {j.jetons}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" min="1" placeholder="100" style={{ width: 70 }}
                    value={ajout[j.id] ?? ''} onChange={(e) => setAjout((a) => ({ ...a, [j.id]: e.target.value }))} />
                  <button className="btn-mini" onClick={() => ajuster(j.id, 1)}>＋</button>
                  <button className="btn-mini rouge" onClick={() => ajuster(j.id, -1)}>－</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
