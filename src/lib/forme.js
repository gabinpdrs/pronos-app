// Calcule la "forme récente" d'une équipe à partir des matchs déjà terminés.
// Renvoie un tableau des 5 derniers résultats : 'V' (victoire), 'N' (nul), 'D' (défaite).
// matchsTermines = liste de matchs avec les équipes intégrées (m.dom, m.ext) et les scores.
export function calculerForme(matchsTermines, idEquipe) {
  return matchsTermines
    .filter((m) => m.dom?.id === idEquipe || m.ext?.id === idEquipe)
    .sort((a, b) => new Date(b.date_match) - new Date(a.date_match))
    .slice(0, 5)
    .map((m) => {
      const estDomicile = m.dom.id === idEquipe
      const butsPour = estDomicile ? m.score_domicile : m.score_exterieur
      const butsContre = estDomicile ? m.score_exterieur : m.score_domicile
      if (butsPour > butsContre) return 'V'
      if (butsPour < butsContre) return 'D'
      return 'N'
    })
}

// Indique si un match est verrouillé : on ne peut plus pronostiquer
// à partir de 2h avant le coup d'envoi (et donc aussi pendant/après le match).
export function estVerrouille(dateMatch) {
  const maintenant = new Date()
  const debut = new Date(dateMatch)
  const heuresRestantes = (debut - maintenant) / (1000 * 60 * 60)
  return heuresRestantes < 2
}
