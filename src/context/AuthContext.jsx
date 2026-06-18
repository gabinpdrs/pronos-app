import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Ce "contexte" permet d'accéder à l'utilisateur connecté depuis n'importe où
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)   // la session Supabase
  const [profil, setProfil] = useState(null)     // la ligne "profiles" (prénom, etc.)
  const [chargement, setChargement] = useState(true)

  // Va chercher le profil du joueur dans la table "profiles"
  async function chargerProfil(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfil(data ?? null)
  }

  useEffect(() => {
    // 1) Au démarrage : récupère la session existante (si déjà connecté)
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await chargerProfil(data.session.user.id)
      setChargement(false)
    })

    // 2) Écoute les changements (connexion / déconnexion)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) await chargerProfil(newSession.user.id)
      else setProfil(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Déconnexion
  async function deconnexion() {
    await supabase.auth.signOut()
    setProfil(null)
  }

  // Permet de recharger le profil (utile après le changement de mot de passe)
  async function rafraichirProfil() {
    if (session) await chargerProfil(session.user.id)
  }

  const valeur = { session, profil, chargement, deconnexion, rafraichirProfil }

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

// Petit raccourci pour utiliser le contexte : const { session } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
