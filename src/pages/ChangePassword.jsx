import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const navigate = useNavigate()
  const { session, rafraichirProfil, deconnexion } = useAuth()

  // Sécurité : si personne n'est connecté, retour au login
  if (!session) {
    navigate('/login')
    return null
  }

  async function valider(e) {
    e.preventDefault()
    setErreur('')

    if (nouveau.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (nouveau !== confirmation) {
      setErreur('Les deux mots de passe ne sont pas identiques.')
      return
    }

    setEnCours(true)

    // 1) On change le mot de passe dans Supabase Auth
    const { error: err1 } = await supabase.auth.updateUser({ password: nouveau })
    if (err1) {
      setEnCours(false)
      setErreur("Erreur lors du changement : " + err1.message)
      return
    }

    // 2) On note dans le profil que le mot de passe a été changé
    //    (via une fonction sécurisée : les joueurs ne peuvent pas modifier
    //     leur profil directement, pour éviter de tricher sur les jetons)
    const { error: err2 } = await supabase.rpc('marquer_mdp_change')

    setEnCours(false)

    if (err2) {
      setErreur("Mot de passe changé mais erreur sur le profil : " + err2.message)
      return
    }

    await rafraichirProfil()
    navigate('/')
  }

  return (
    <div className="container">
      <h1>🔐 Nouveau mot de passe</h1>
      <div className="card">
        <p className="muted">
          C'est ta première connexion. Choisis un nouveau mot de passe
          pour accéder à l'application.
        </p>
        <form onSubmit={valider}>
          <label>Nouveau mot de passe</label>
          <input
            type="password"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            required
          />

          <label>Confirme le mot de passe</label>
          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
          />

          {erreur && <p className="message-erreur">{erreur}</p>}

          <button type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement...' : 'Valider'}
          </button>
        </form>
        <button className="secondaire" onClick={deconnexion}>Se déconnecter</button>
      </div>
    </div>
  )
}
