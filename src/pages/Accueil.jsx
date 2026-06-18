import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

// Forme récente (ex : "VVNDV") en pastilles colorées
function FormeMini({ texte }) {
  if (!texte) return null
  return (
    <div className="forme">
      {texte.split('').map((r, i) => (
        <span className={`forme-pastille forme-${r}`} key={i}>{r}</span>
      ))}
    </div>
  )
}

export default function Accueil() {
  const { session, profil, deconnexion, rafraichirProfil } = useAuth()
  const [classement, setClassement] = useState([])
  const [prochains, setProchains] = useState([])
  const [chargement, setChargement] = useState(true)
  const [photoMsg, setPhotoMsg] = useState('')
  const navigate = useNavigate()

  async function charger() {
    setChargement(true)
    const { data: clt } = await supabase
      .from('classement')
      .select('*')
      .order('jetons', { ascending: false })

    const { data: matchs } = await supabase
      .from('matches')
      .select('id, date_match, poule, score_domicile, cote_domicile, cote_nul, cote_exterieur, dom:equipe_domicile(nom, forme), ext:equipe_exterieur(nom, forme)')
      .order('date_match', { ascending: true })

    const aVenir = (matchs ?? []).filter((m) => m.score_domicile === null)
    setClassement(clt ?? [])
    setProchains(aVenir.slice(0, 4))
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  // Envoi d'une photo de profil
  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoMsg('Envoi de la photo...')
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const chemin = `${session.user.id}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(chemin, file, { upsert: true, contentType: file.type })
    if (upErr) { setPhotoMsg('Erreur : ' + upErr.message); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(chemin)
    const url = `${data.publicUrl}?t=${Date.now()}` // anti-cache

    const { error: rpcErr } = await supabase.rpc('set_photo', { p_url: url })
    if (rpcErr) { setPhotoMsg('Erreur : ' + rpcErr.message); return }

    await rafraichirProfil()
    await charger()
    setPhotoMsg('✅ Photo mise à jour !')
  }

  const top3 = classement.slice(0, 3)
  const coupe = ['🥇', '🥈', '🥉']
  const initiale = (nom) => (nom ? nom.charAt(0).toUpperCase() : '?')

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-user">
          <label className="header-avatar" title="Changer ma photo">
            {profil?.photo_url
              ? <img className="avatar-img" src={profil.photo_url} alt="moi" />
              : initiale(profil?.prenom)}
            <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          </label>
          <div>
            <h1>⚽ Pronos<span style={{ color: '#ffe2e8' }}>Cup</span></h1>
            <p>Salut {profil?.prenom} 👋</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="solde">🪙 {profil?.jetons ?? 0}</div>
          <button className="btn-deco" onClick={deconnexion}>Déco</button>
        </div>
      </header>

      {photoMsg && <p className="message-succes">{photoMsg}</p>}

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          <div className="section-titre">🏆 Le podium</div>
          <div className="card">
            {top3.length === 0 ? (
              <p className="muted">Pas encore de classement.</p>
            ) : (
              <div className="podium">
                {top3.map((j, i) => (
                  <div className={`podium-place place-${i + 1}`} key={j.user_id}>
                    <div className="podium-avatar">
                      {j.photo_url
                        ? <img className="avatar-img" src={j.photo_url} alt={j.prenom} />
                        : initiale(j.prenom)}
                    </div>
                    <div className="podium-nom">{j.prenom}</div>
                    <div className="podium-pts">🪙 {j.jetons}</div>
                    <div className="podium-socle">{coupe[i]}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
              👆 Touche ta photo en haut à gauche pour la changer
            </p>
          </div>

          <div className="section-titre">🎲 Prochains matchs</div>
          {prochains.length === 0 ? (
            <div className="card"><p className="muted">Aucun match à venir.</p></div>
          ) : (
            prochains.map((m) => (
              <div className="card" key={m.id} onClick={() => navigate('/paris')} style={{ cursor: 'pointer' }}>
                {m.poule && <span className="poule-badge">{m.poule}</span>}
                <div className="match-date">📅 {new Date(m.date_match).toLocaleString('fr-FR')}</div>
                <div className="match-equipes">
                  <div className="equipe">
                    <div className="equipe-nom">{m.dom?.nom}</div>
                    <FormeMini texte={m.dom?.forme} />
                  </div>
                  <div className="vs">VS</div>
                  <div className="equipe">
                    <div className="equipe-nom">{m.ext?.nom}</div>
                    <FormeMini texte={m.ext?.forme} />
                  </div>
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
