import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Les 5 tours du tableau à élimination (de gauche à droite)
const ROUNDS = [
  { tour: '16es', n: 16, label: '16es' },
  { tour: '8es', n: 8, label: '8es' },
  { tour: 'quarts', n: 4, label: 'Quarts' },
  { tour: 'demies', n: 2, label: 'Demies' },
  { tour: 'finale', n: 1, label: 'Finale' },
]

// Une ligne d'équipe dans une carte de match
function Ligne({ nom, gagnant, score }) {
  return (
    <div className={`tb-equipe ${gagnant ? 'tb-gagne' : ''} ${nom === null ? 'tb-vide' : ''}`}>
      <span className="tb-nom">{nom ?? 'à venir'}</span>
      {score !== null && score !== undefined && <span className="tb-score">{score}</span>}
    </div>
  )
}

export default function Tableau() {
  const [parTourSlot, setParTourSlot] = useState({})
  const [champion, setChampion] = useState(null)
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)
    const { data } = await supabase
      .from('matches')
      .select('id, tour, slot, score_domicile, score_exterieur, vainqueur_id, dom:equipe_domicile(id,nom), ext:equipe_exterieur(id,nom)')
      .not('tour', 'is', null)

    const map = {}
    ;(data ?? []).forEach((m) => { map[`${m.tour}-${m.slot}`] = m })
    setParTourSlot(map)

    const fin = map['finale-1']
    setChampion(fin?.vainqueur_id === fin?.dom?.id ? fin?.dom?.nom : fin?.vainqueur_id === fin?.ext?.id ? fin?.ext?.nom : null)
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  function Carte({ tour, slot }) {
    const m = parTourSlot[`${tour}-${slot}`]
    if (!m) {
      return (
        <div className="tb-match">
          <Ligne nom={null} /><Ligne nom={null} />
        </div>
      )
    }
    const domGagne = m.vainqueur_id && m.vainqueur_id === m.dom?.id
    const extGagne = m.vainqueur_id && m.vainqueur_id === m.ext?.id
    return (
      <div className="tb-match">
        <Ligne nom={m.dom?.nom ?? null} gagnant={domGagne} score={m.score_domicile} />
        <Ligne nom={m.ext?.nom ?? null} gagnant={extGagne} score={m.score_exterieur} />
      </div>
    )
  }

  return (
    <div className="container">
      <style>{`
        .tb-scroll{overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch}
        .tb-grid{display:flex;gap:10px;min-width:780px;align-items:stretch}
        .tb-col{display:flex;flex-direction:column;min-width:122px;flex:1}
        .tb-col-titre{text-align:center;font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px}
        .tb-col-matchs{display:flex;flex-direction:column;justify-content:space-around;flex:1;gap:8px}
        .tb-match{background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
        .tb-equipe{display:flex;justify-content:space-between;gap:6px;padding:6px 8px;font-size:12px;color:#1e293b}
        .tb-equipe+.tb-equipe{border-top:1px solid #e2e8f0}
        .tb-gagne{background:#eff6ff;color:#1d4ed8;font-weight:700}
        .tb-vide .tb-nom{color:#94a3b8;font-style:italic}
        .tb-nom{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tb-score{font-weight:700;min-width:14px;text-align:right}
        .tb-champion-banner{background:#1d4ed8;color:#fff;padding:10px;border-radius:8px;text-align:center;margin-bottom:12px;font-size:15px}
        .tb-trophy{text-align:center;border:2px solid #1d4ed8;border-radius:12px;padding:14px 10px;background:#eff6ff}
        .tb-trophy-ico{font-size:28px}
        .tb-trophy-nom{font-weight:700;color:#1d4ed8;margin-top:4px}
      `}</style>
      <header className="app-header">
        <div><h1>🏆 Tableau</h1><p>Phase finale — Coupe du Monde 2026</p></div>
      </header>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          {champion && (
            <div className="tb-champion-banner">🏆 Champion : <strong>{champion}</strong></div>
          )}
          <div className="tb-scroll">
            <div className="tb-grid">
              {ROUNDS.map((r) => (
                <div className="tb-col" key={r.tour}>
                  <div className="tb-col-titre">{r.label}</div>
                  <div className="tb-col-matchs">
                    {Array.from({ length: r.n }, (_, i) => (
                      <Carte key={i} tour={r.tour} slot={i + 1} />
                    ))}
                  </div>
                </div>
              ))}
              {/* Colonne vainqueur */}
              <div className="tb-col">
                <div className="tb-col-titre">Vainqueur</div>
                <div className="tb-col-matchs" style={{ justifyContent: 'center' }}>
                  <div className="tb-trophy">
                    <div className="tb-trophy-ico">🏆</div>
                    <div className="tb-trophy-nom">{champion ?? '?'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            👉 Les matchs se remplissent tout seuls : dès qu'un résultat est entré, le gagnant monte au tour suivant.
            Glisse vers la droite pour voir la suite du tableau. ➡️
          </p>
        </>
      )}
    </div>
  )
}
