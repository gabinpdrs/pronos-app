import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Resultats() {
  const { session, profil } = useAuth()
  const [classement, setClassement] = useState([])
  const [termines, setTermines] = useState([])
  const [mesParis, setMesParis] = useState({})
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)

    const { data: clt } = await supabase
      .from('classement')
      .select('*')
      .order('jetons', { ascending: false })

    const { data: matchs } = await supabase
      .from('matches')
      .select('id, date_match, poule, score_domicile, score_exterieur, dom:equipe_domicile(nom), ext:equipe_exterieur(nom)')
      .not('score_domicile', 'is', null)
      .order('date_match', { ascending: false })

    const { data: paris } = await supabase
      .from('paris')
      .select('*')
      .eq('user_id', session.user.id)
      .neq('statut', 'en_attente')

    const parMatch = {}
    ;(paris ?? []).forEach((p) => { parMatch[p.match_id] = p })

    setClassement(clt ?? [])
    setTermines(matchs ?? [])
    setMesParis(parMatch)
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>🏆 Résultats</h1>
          <p>Classement & matchs joués</p>
        </div>
        <div className="solde">🪙 {profil?.jetons ?? 0}</div>
      </header>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          {/* ---------- CLASSEMENT COMPLET ---------- */}
          <div className="section-titre">📊 Classement complet</div>
          <div className="card" style={{ padding: '4px 10px' }}>
            {classement.length === 0 ? (
              <p className="muted">Aucun joueur pour le moment.</p>
            ) : (
              classement.map((j, i) => (
                <div className="rang" key={j.user_id}>
                  <span className={`rang-pos ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="rang-nom">
                    {j.prenom}
                    {j.prenom === profil?.prenom && <span className="badge-toi">toi</span>}
                  </span>
                  <span className="rang-pts">🪙 {j.jetons}</span>
                </div>
              ))
            )}
          </div>

          {/* ---------- MATCHS TERMINÉS ---------- */}
          <div className="section-titre">✅ Matchs terminés</div>
          <div className="card">
            {termines.length === 0 ? (
              <p className="muted">Aucun match terminé pour l'instant.</p>
            ) : (
              termines.map((m) => {
                const p = mesParis[m.id]
                return (
                  <div className="resultat-ligne" key={m.id}>
                    <div>
                      {m.poule && <span className="poule-badge">{m.poule}</span>}
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{m.dom?.nom} - {m.ext?.nom}</div>
                      {p ? (
                        p.statut === 'gagne'
                          ? <span className="tag-gagne">✅ Gagné +{p.gain} 🪙</span>
                          : <span className="tag-perdu">❌ Perdu -{p.mise} 🪙</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>Pas de pari</span>
                      )}
                    </div>
                    <span className="score-final">{m.score_domicile} - {m.score_exterieur}</span>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
