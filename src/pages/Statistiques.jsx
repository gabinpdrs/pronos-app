import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Statistiques() {
  const [matchs, setMatchs] = useState([])
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)
    // On récupère les matchs avec les stats complètes des 2 équipes
    const { data } = await supabase
      .from('matches')
      .select(`
        id, date_match,
        dom:equipe_domicile(*),
        ext:equipe_exterieur(*)
      `)
      .order('date_match', { ascending: true })
    setMatchs(data ?? [])
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  // Affiche le bloc de stats d'une équipe
  function StatsEquipe({ equipe }) {
    if (!equipe) return null
    return (
      <div style={{ flex: 1 }}>
        <h3>{equipe.nom}</h3>
        <p className="muted">Joués : {equipe.matchs_joues}</p>
        <p className="muted">V : {equipe.victoires} / N : {equipe.nuls} / D : {equipe.defaites}</p>
        <p className="muted">Buts : {equipe.buts_pour} pour / {equipe.buts_contre} contre</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>📊 Statistiques des équipes</h1>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : matchs.length === 0 ? (
        <div className="card"><p className="muted">Aucun match à venir.</p></div>
      ) : (
        matchs.map((m) => (
          <div className="card" key={m.id}>
            <div className="muted">{new Date(m.date_match).toLocaleDateString('fr-FR')}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <StatsEquipe equipe={m.dom} />
              <div style={{ alignSelf: 'center', fontWeight: 700 }}>VS</div>
              <StatsEquipe equipe={m.ext} />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
