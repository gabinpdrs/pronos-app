import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { calculerForme, estVerrouille } from '../lib/forme'

export default function Pronos() {
  const { session, profil, rafraichirProfil } = useAuth()
  const [matchs, setMatchs] = useState([])
  const [termines, setTermines] = useState([])
  const [coupon, setCoupon] = useState({})        // { matchId: {choix, cote, mise, dom, ext} }
  const [verrouilles, setVerrouilles] = useState({}) // paris déjà posés sur matchs verrouillés
  const [couponOuvert, setCouponOuvert] = useState(false)
  const [message, setMessage] = useState(null)
  const [chargement, setChargement] = useState(true)

  // Renvoie la cote d'un match selon le choix 1 / N / 2
  function coteDe(m, choix) {
    if (choix === '1') return Number(m.cote_domicile)
    if (choix === 'N') return Number(m.cote_nul)
    return Number(m.cote_exterieur)
  }

  async function charger() {
    setChargement(true)

    const { data: tous } = await supabase
      .from('matches')
      .select('id, date_match, poule, score_domicile, score_exterieur, cote_domicile, cote_nul, cote_exterieur, dom:equipe_domicile(*), ext:equipe_exterieur(*)')
      .order('date_match', { ascending: true })

    const { data: mesParis } = await supabase
      .from('paris')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('statut', 'en_attente')

    const liste = tous ?? []
    const aVenir = liste.filter((m) => m.score_domicile === null)
    const joues = liste.filter((m) => m.score_domicile !== null)

    // On répartit mes paris : modifiables (coupon) ou verrouillés (lecture seule)
    const nouveauCoupon = {}
    const nouveauVerr = {}
    ;(mesParis ?? []).forEach((p) => {
      const m = aVenir.find((x) => x.id === p.match_id)
      if (!m) return
      if (estVerrouille(m.date_match)) {
        nouveauVerr[p.match_id] = { choix: p.choix, mise: p.mise, cote: Number(p.cote) }
      } else {
        nouveauCoupon[p.match_id] = {
          choix: p.choix, cote: Number(p.cote), mise: p.mise,
          dom: m.dom?.nom, ext: m.ext?.nom,
        }
      }
    })

    setMatchs(aVenir)
    setTermines(joues)
    setCoupon(nouveauCoupon)
    setVerrouilles(nouveauVerr)
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  // Clique sur une cote : ajoute / modifie / retire la sélection
  function choisir(m, choix) {
    setCoupon((prec) => {
      const copie = { ...prec }
      const actuel = copie[m.id]
      if (actuel && actuel.choix === choix) {
        delete copie[m.id] // re-clic sur le même = on retire
      } else {
        copie[m.id] = {
          choix, cote: coteDe(m, choix),
          mise: actuel?.mise ?? 50,
          dom: m.dom?.nom, ext: m.ext?.nom,
        }
      }
      return copie
    })
  }

  function changerMise(matchId, valeur) {
    setCoupon((prec) => ({ ...prec, [matchId]: { ...prec[matchId], mise: valeur } }))
  }

  function retirer(matchId) {
    setCoupon((prec) => {
      const copie = { ...prec }
      delete copie[matchId]
      return copie
    })
  }

  // Valide tout le coupon : un appel "placer_pari" par sélection
  async function validerCoupon() {
    setMessage(null)
    const entrees = Object.entries(coupon)
    if (entrees.length === 0) return

    let erreurs = []
    for (const [matchId, sel] of entrees) {
      const mise = parseInt(sel.mise, 10)
      if (Number.isNaN(mise) || mise <= 0) {
        erreurs.push(`Mise invalide pour ${sel.dom}-${sel.ext}`)
        continue
      }
      const { error } = await supabase.rpc('placer_pari', {
        p_match_id: Number(matchId),
        p_choix: sel.choix,
        p_mise: mise,
      })
      if (error) erreurs.push(`${sel.dom}-${sel.ext} : ${error.message}`)
    }

    await rafraichirProfil()
    await charger()
    setCouponOuvert(false)

    if (erreurs.length > 0) setMessage({ type: 'erreur', texte: erreurs.join(' | ') })
    else setMessage({ type: 'succes', texte: '✅ Coupon validé ! Bonne chance 🍀' })
  }

  // Forme récente d'une équipe
  function Forme({ idEquipe }) {
    const f = calculerForme(termines, idEquipe)
    if (f.length === 0) return <div className="forme-vide">— pas de match joué</div>
    return (
      <div className="forme">
        {f.map((r, i) => <span className={`forme-pastille forme-${r}`} key={i}>{r}</span>)}
      </div>
    )
  }

  const nbCoupon = Object.keys(coupon).length
  const totalMise = Object.values(coupon).reduce((s, x) => s + (parseInt(x.mise, 10) || 0), 0)
  const totalGain = Object.values(coupon).reduce((s, x) => s + Math.round((parseInt(x.mise, 10) || 0) * x.cote), 0)

  if (chargement) {
    return <div className="container"><header className="app-header"><h1>🎲 Paris</h1></header><p className="muted">Chargement...</p></div>
  }

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>🎲 Paris</h1>
          <p>Cotes • verrou 2h avant le match</p>
        </div>
        <div className="solde">🪙 {profil?.jetons ?? 0}</div>
      </header>

      {message && (
        <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>
      )}

      {matchs.length === 0 && (
        <div className="card"><p className="muted">Aucun match à parier pour le moment.</p></div>
      )}

      {matchs.map((m) => {
        const verrouille = estVerrouille(m.date_match)
        const sel = coupon[m.id]
        const monPariVerr = verrouilles[m.id]

        return (
          <div className="card" key={m.id}>
            {m.poule && <span className="poule-badge">{m.poule}</span>}
            <div className="match-date">📅 {new Date(m.date_match).toLocaleString('fr-FR')}</div>

            <div className="match-equipes">
              <div className="equipe">
                <div className="equipe-nom">{m.dom?.nom}</div>
                <Forme idEquipe={m.dom?.id} />
              </div>
              <div className="vs">VS</div>
              <div className="equipe">
                <div className="equipe-nom">{m.ext?.nom}</div>
                <Forme idEquipe={m.ext?.id} />
              </div>
            </div>

            {verrouille ? (
              <>
                <div className="statut-verrouille">🔒 Paris fermés (moins de 2h avant le match)</div>
                {monPariVerr && (
                  <div className="mon-pari">
                    Ton pari : <strong>{monPariVerr.choix}</strong> (cote {monPariVerr.cote.toFixed(2)}) — mise {monPariVerr.mise} 🪙
                  </div>
                )}
              </>
            ) : (
              <div className="cotes">
                {['1', 'N', '2'].map((c) => (
                  <button
                    key={c}
                    className={`cote-btn ${sel?.choix === c ? 'choisi' : ''}`}
                    onClick={() => choisir(m, c)}
                  >
                    <span className="label">{c === '1' ? m.dom?.nom : c === '2' ? m.ext?.nom : 'Nul'}</span>
                    <span className="valeur">{coteDe(m, c).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Bouton flottant + panneau du coupon */}
      {nbCoupon > 0 && !couponOuvert && (
        <button className="coupon-bouton" onClick={() => setCouponOuvert(true)}>
          🧾 Coupon ({nbCoupon})
        </button>
      )}

      {couponOuvert && (
        <div className="coupon-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>🧾 Mon coupon</h3>
            <button className="coupon-retirer" onClick={() => setCouponOuvert(false)}>Fermer ✕</button>
          </div>

          {Object.entries(coupon).map(([matchId, sel]) => (
            <div className="coupon-ligne" key={matchId}>
              <div className="titre">{sel.dom} - {sel.ext}</div>
              <div className="sel">
                Choix : {sel.choix === '1' ? sel.dom : sel.choix === '2' ? sel.ext : 'Match nul'} • cote {sel.cote.toFixed(2)}
              </div>
              <div className="coupon-mise">
                <span className="muted">Mise :</span>
                <input
                  type="number" min="1"
                  value={sel.mise}
                  onChange={(e) => changerMise(matchId, e.target.value)}
                />
                <span className="muted">🪙</span>
                <button className="coupon-retirer" onClick={() => retirer(matchId)} style={{ marginLeft: 'auto' }}>Retirer</button>
              </div>
              <div className="coupon-gain">
                Gain potentiel : {Math.round((parseInt(sel.mise, 10) || 0) * sel.cote)} 🪙
              </div>
            </div>
          ))}

          <div className="coupon-total">
            <span>Total misé : {totalMise} 🪙</span>
            <span style={{ color: 'var(--vert)' }}>Gain : {totalGain} 🪙</span>
          </div>

          <button onClick={validerCoupon} disabled={totalMise > (profil?.jetons ?? 0)}>
            {totalMise > (profil?.jetons ?? 0) ? 'Pas assez de jetons' : 'Valider le coupon'}
          </button>
        </div>
      )}
    </div>
  )
}
