import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'

import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Accueil from './pages/Accueil'
import Pronos from './pages/Pronos'
import Resultats from './pages/Resultats'
import Admin from './pages/Admin'

export default function App() {
  const { session, profil } = useAuth()

  // Navbar visible seulement une fois connecté et mot de passe changé
  const afficherNavbar = session && profil && !profil.must_change_password

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/changer-mot-de-passe" element={<ChangePassword />} />

        {/* Pages protégées */}
        <Route path="/" element={<ProtectedRoute><Accueil /></ProtectedRoute>} />
        <Route path="/paris" element={<ProtectedRoute><Pronos /></ProtectedRoute>} />
        <Route path="/resultats" element={<ProtectedRoute><Resultats /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute>{profil?.is_admin ? <Admin /> : <Navigate to="/" replace />}</ProtectedRoute>} />
      </Routes>

      {afficherNavbar && <Navbar />}
    </>
  )
}
