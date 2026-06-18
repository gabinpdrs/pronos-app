import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, prenomVersEmail } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [prenom, setPrenom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const navigate = useNavigate()
  const { session, profil } = useAuth()

  // Si déjà connecté, on quitte la page de login
  useEffect(() => {
    if (session && profil) {
      if (profil.must_change_password) navigate('/changer-mot-de-passe')
      else navigate('/')
    }
  }, [session, profil, navigate])

  async function seConnecter(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)

    // Le login = prénom, transformé en email pour Supabase
    const email = prenomVersEmail(prenom)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    })

    setEnCours(false)

    if (error) {
      setErreur("Prénom ou mot de passe incorrect.")
      return
    }
    // La redirection se fait automatiquement via le useEffect ci-dessus
  }

  return (
    <div className="centre">
      <div className="logo-titre">
        <h1>⚽ Pronos entre amis</h1>
      </div>
      <div className="card">
        <h2>Connexion</h2>
        <form onSubmit={seConnecter}>
          <label>Prénom (identifiant)</label>
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Ex : Lucas"
            required
          />

          <label>Mot de passe</label>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Première fois : Prénom + 1 (ex: Lucas1)"
            required
          />

          {erreur && <p className="message-erreur">{erreur}</p>}

          <button type="submit" disabled={enCours}>
            {enCours ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          Première connexion : mot de passe = ton prénom suivi de 1
          (ex : <strong>Lucas1</strong>). Tu devras le changer ensuite.
        </p>
      </div>
    </div>
  )
}
