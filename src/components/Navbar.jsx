import { NavLink } from 'react-router-dom'

// Barre de navigation en bas de l'écran (style application mobile)
export default function Navbar() {
  // Donne la classe "actif" au lien de la page en cours
  const classe = ({ isActive }) => (isActive ? 'actif' : '')

  return (
    <nav className="navbar">
      <NavLink to="/" className={classe} end>🎯<br />Matchs</NavLink>
      <NavLink to="/classement" className={classe}>🏆<br />Classement</NavLink>
      <NavLink to="/statistiques" className={classe}>📊<br />Stats</NavLink>
    </nav>
  )
}
