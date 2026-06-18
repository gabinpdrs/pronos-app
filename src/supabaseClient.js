import { createClient } from '@supabase/supabase-js'

// On lit les variables d'environnement définies dans le fichier .env
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Petit garde-fou : si tu oublies le fichier .env, tu verras ce message
  console.error("⚠️ Variables Supabase manquantes. As-tu créé le fichier .env ?")
}

// Ce client sert à parler à Supabase (connexion, base de données...) partout dans l'app
export const supabase = createClient(url, anonKey)

// Astuce : le login se fait avec le prénom. On le transforme en "faux" email
// pour Supabase (qui veut un email). Ex : "Lucas" -> "lucas@pronos.local"
export function prenomVersEmail(prenom) {
  return prenom.trim().toLowerCase() + '@pronos.local'
}
