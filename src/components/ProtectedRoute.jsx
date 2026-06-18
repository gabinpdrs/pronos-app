import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Protège les pages : si pas connecté -> redirige vers /login
// Si le joueur doit changer son mot de passe -> redirige vers /changer-mot-de-passe
export default function ProtectedRoute({ children }) {
  const { session, profil, chargement } = useAuth()

  if (chargement) {
    return <div className="container"><p className="muted">Chargement...</p></div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Première connexion : on force le changement de mot de passe
  if (profil?.must_change_password) {
    return <Navigate to="/changer-mot-de-passe" replace />
  }

  return children
}
