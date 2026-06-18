import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Matchs() {
  const { profil, deconnexion, session } = useAuth()
  const [matchs, setMatchs] = useState([])
  const [pronos, setPronos] = useState({})   // { match_id: {score_domicile, score_exterieur} }
  const [chargement, setChargement] = useState(true)
  const [messages, setMessages] = useState({})

  // Charge les matchs + les pronostics déjà saisis par le joueur
  async function charger() {
    setChargement(true)

    const { data: lesMatchs } = await supabase
      .from('matches')
      .select('*, dom:equipe_domicile(nom), ext:equipe_exterieur(nom)')
      .order('date_match', { ascending: true })

    const { data: mesPronos } = await supabase
      .from('pronostics')
      .select('*')
      .eq('user_id', session.user.id)

    // On range les pronostics par match pour les retrouver facilement
    const parMatch = {}
    ;(mesPronos ?? []).forEach((p) => {
      parMatch[p.match_id] = {
        score_domicile: p.score_domicile,
        score_exterieur: p.score_exterieur,
      }
    })

    setMatchs(lesMatchs ?? [])
    setPronos(parMatch)
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  // Met à jour un champ de score localement (avant l'enregistrement)
  function changerScore(matchId, cote, valeur) {
    setPronos((prec) => ({
      ...prec,
      [matchId]: { ...prec[matchId], [cote]: valeur },
    }))
  }

  // Enregistre (ou met à jour) le pronostic d'un match
  async function enregistrer(matchId) {
    const p = pronos[matchId] || {}
    const dom = parseInt(p.score_domicile, 10)
    const ext = parseInt(p.score_exterieur, 10)

    if (Number.isNaN(dom) || Number.isNaN(ext)) {
      setMessages((m) => ({ ...m, [matchId]: { type: 'erreur', texte: 'Entre les deux scores.' } }))
      return
    }

    // upsert = insère si absent, sinon met à jour (grâce à la contrainte unique user+match)
    const { error } = await supabase.from('pronostics').upsert(
      {
        user_id: session.user.id,
        match_id: matchId,
        score_domicile: dom,
        score_exterieur: ext,
      },
      { onConflict: 'user_id,match_id' }
    )

    if (error) {
      setMessages((m) => ({ ...m, [matchId]: { type: 'erreur', texte: error.message } }))
    } else {
      setMessages((m) => ({ ...m, [matchId]: { type: 'succes', texte: '✅ Pronostic enregistré !' } }))
    }
  }

  if (chargement) {
    return <div className="container"><p className="muted">Chargement des matchs...</p></div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🎯 Matchs</h1>
        <button className="secondaire" style={{ width: 'auto', marginTop: 0 }} onClick={deconnexion}>
          Déconnexion
        </button>
      </div>
      <p className="muted">Bonjour {profil?.prenom} 👋 — fais tes pronostics !</p>

      {matchs.length === 0 && (
        <div className="card"><p className="muted">Aucun match pour le moment.</p></div>
      )}

      {matchs.map((m) => {
        // Un match est "terminé" quand le score officiel a été saisi
        const termine = m.score_domicile !== null && m.score_exterieur !== null
        const p = pronos[m.id] || {}
        const msg = messages[m.id]

        return (
          <div className="card" key={m.id}>
            <div className="muted">{new Date(m.date_match).toLocaleString('fr-FR')}</div>
            <h3>{m.dom?.nom} 🆚 {m.ext?.nom}</h3>

            {termine ? (
              <>
                <p>
                  Score final : <strong>{m.score_domicile} - {m.score_exterieur}</strong>{' '}
                  <span className="badge">terminé</span>
                </p>
                <p className="muted">
                  Ton prono : {p.score_domicile ?? '-'} - {p.score_exterieur ?? '-'}
                </p>
              </>
            ) : (
              <>
                <div className="ligne-score">
                  <input
                    type="number" min="0" placeholder="0"
                    value={p.score_domicile ?? ''}
                    onChange={(e) => changerScore(m.id, 'score_domicile', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number" min="0" placeholder="0"
                    value={p.score_exterieur ?? ''}
                    onChange={(e) => changerScore(m.id, 'score_exterieur', e.target.value)}
                  />
                </div>
                <button onClick={() => enregistrer(m.id)}>Enregistrer mon prono</button>
                {msg && (
                  <p className={msg.type === 'erreur' ? 'message-erreur' : 'message-succes'}>
                    {msg.texte}
                  </p>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
