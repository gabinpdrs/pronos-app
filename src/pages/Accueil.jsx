import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Accueil() {
  const { profil, deconnexion } = useAuth()
  const [classement, setClassement] = useState([])
  const [prochains, setProchains] = useState([])
  const [chargement, setChargement] = useState(true)
  const navigate = useNavigate()

  async function charger() {
    setChargement(true)

    const { data: clt } = await supabase
      .from('classement')
      .select('*')
      .order('jetons', { ascending: false })

    const { data: matchs } = await supabase
      .from('matches')
      .select('id, date_match, poule, score_domicile, cote_domicile, cote_nul, cote_exterieur, dom:equipe_domicile(nom), ext:equipe_exterieur(nom)')
      .order('date_match', { ascending: true })

    const aVenir = (matchs ?? []).filter((m) => m.score_domicile === null)

    setClassement(clt ?? [])
    setProchains(aVenir.slice(0, 4))
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const top3 = classement.slice(0, 3)
  const coupe = ['🥇', '🥈', '🥉']
  const initiale = (nom) => (nom ? nom.charAt(0).toUpperCase() : '?')

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>⚽ Pronos<span style={{ color: 'var(--accent-2)' }}>Cup</span></h1>
          <p>Salut {profil?.prenom} 👋</p>
          <button className="btn-deco" onClick={deconnexion}>Déconnexion</button>
        </div>
        <div className="solde">🪙 {profil?.jetons ?? 0}</div>
      </header>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          {/* ---------- PODIUM ---------- */}
          <div className="section-titre">🏆 Le podium</div>
          <div className="card">
            {top3.length === 0 ? (
              <p className="muted">Pas encore de classement.</p>
            ) : (
              <div className="podium">
                {top3.map((j, i) => (
                  <div className={`podium-place place-${i + 1}`} key={j.user_id}>
                    <div className="podium-avatar">{initiale(j.prenom)}</div>
                    <div className="podium-nom">{j.prenom}</div>
                    <div className="podium-pts">🪙 {j.jetons}</div>
                    <div className="podium-socle">{coupe[i]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- PROCHAINS MATCHS ---------- */}
          <div className="section-titre">🎲 Prochains matchs</div>
          {prochains.length === 0 ? (
            <div className="card"><p className="muted">Aucun match à venir.</p></div>
          ) : (
            prochains.map((m) => (
              <div className="card" key={m.id} onClick={() => navigate('/paris')} style={{ cursor: 'pointer' }}>
                {m.poule && <span className="poule-badge">{m.poule}</span>}
                <div className="match-date">📅 {new Date(m.date_match).toLocaleString('fr-FR')}</div>
                <div className="match-equipes">
                  <div className="equipe"><div className="equipe-nom">{m.dom?.nom}</div></div>
                  <div className="vs">VS</div>
                  <div className="equipe"><div className="equipe-nom">{m.ext?.nom}</div></div>
                </div>
                <div className="cotes">
                  <div className="cote-btn"><span className="label">1</span><span className="valeur">{Number(m.cote_domicile).toFixed(2)}</span></div>
                  <div className="cote-btn"><span className="label">N</span><span className="valeur">{Number(m.cote_nul).toFixed(2)}</span></div>
                  <div className="cote-btn"><span className="label">2</span><span className="valeur">{Number(m.cote_exterieur).toFixed(2)}</span></div>
                </div>
              </div>
            ))
          )}

          {prochains.length > 0 && (
            <button onClick={() => navigate('/paris')}>Parier maintenant →</button>
          )}
        </>
      )}
    </div>
  )
}
