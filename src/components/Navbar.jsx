import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Barre de navigation en bas (style application mobile)
export default function Navbar() {
  const { profil } = useAuth()
  const classe = ({ isActive }) => (isActive ? 'actif' : '')

  return (
    <nav className="navbar">
      <NavLink to="/" className={classe} end>
        <span className="ico">🏠</span>
        Accueil
      </NavLink>
      <NavLink to="/paris" className={classe}>
        <span className="ico">🎲</span>
        Paris
      </NavLink>
      <NavLink to="/resultats" className={classe}>
        <span className="ico">🏆</span>
        Résultats
      </NavLink>
      <NavLink to="/tableau" className={classe}>
        <span className="ico">📊</span>
        Tableau
      </NavLink>
      {/* Admin : seulement pour les administrateurs */}
      {profil?.is_admin && (
        <NavLink to="/admin" className={classe}>
          <span className="ico">🛠️</span>
          Admin
        </NavLink>
      )}
    </nav>
  )
}
