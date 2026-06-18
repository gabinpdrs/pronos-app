import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Classement() {
  const { profil } = useAuth()
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)
    // On lit la "vue" classement (calculée automatiquement côté Supabase)
    const { data } = await supabase
      .from('classement')
      .select('*')
      .order('points_total', { ascending: false })
    setLignes(data ?? [])
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const medaille = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1)

  return (
    <div className="container">
      <h1>🏆 Classement général</h1>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {lignes.map((l, i) => (
            <div className="rang" key={l.user_id}>
              <span className="position">{medaille(i)}</span>
              <span style={{ flex: 1 }}>
                {l.prenom}
                {l.prenom === profil?.prenom && <span className="badge" style={{ marginLeft: 8 }}>toi</span>}
                <br />
                <span className="muted">{l.nb_pronos} prono(s) compté(s)</span>
              </span>
              <span className="points">{l.points_total} pts</span>
            </div>
          ))}
          {lignes.length === 0 && <div className="rang"><span className="muted">Pas encore de points.</span></div>}
        </div>
      )}

      <div className="card">
        <h3>Barème</h3>
        <p className="muted">🎯 Score exact : <strong>3 pts</strong></p>
        <p className="muted">✅ Bon vainqueur / nul : <strong>1 pt</strong></p>
        <p className="muted">❌ Sinon : <strong>0 pt</strong></p>
      </div>
    </div>
  )
}
