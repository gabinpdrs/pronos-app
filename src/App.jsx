import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'

import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Matchs from './pages/Matchs'
import Classement from './pages/Classement'
import Statistiques from './pages/Statistiques'

export default function App() {
  const { session, profil } = useAuth()

  // On affiche la barre de navigation seulement quand on est connecté
  // ET que le mot de passe a déjà été changé
  const afficherNavbar = session && profil && !profil.must_change_password

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/changer-mot-de-passe" element={<ChangePassword />} />

        {/* Pages protégées */}
        <Route path="/" element={<ProtectedRoute><Matchs /></ProtectedRoute>} />
        <Route path="/classement" element={<ProtectedRoute><Classement /></ProtectedRoute>} />
        <Route path="/statistiques" element={<ProtectedRoute><Statistiques /></ProtectedRoute>} />
      </Routes>

      {afficherNavbar && <Navbar />}
    </>
  )
}
