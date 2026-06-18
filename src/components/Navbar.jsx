import { NavLink } from 'react-router-dom'

// Barre de navigation en bas (3 onglets, style application mobile)
export default function Navbar() {
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
    </nav>
  )
}
