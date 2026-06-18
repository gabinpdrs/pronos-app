import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { estVerrouille } from '../lib/forme'

// Forme récente (ex : "VVNDV") en pastilles colorées
function Forme({ texte }) {
  if (!texte) return <div className="forme-vide">— pas de stats</div>
  return (
    <div className="forme">
      {texte.split('').map((r, i) => (
        <span className={`forme-pastille forme-${r}`} key={i}>{r}</span>
      ))}
    </div>
  )
}

// Libellé lisible d'un choix 1 / N / 2
function libelleChoix(choix, dom, ext) {
  if (choix === '1') return dom
  if (choix === '2') return ext
  return 'Match nul'
}

export default function Pronos() {
  const { session, profil, rafraichirProfil } = useAuth()
  const [matchs, setMatchs] = useState([])
  const [coupon, setCoupon] = useState({})       // { matchId: {type, choix, cote, mise, scoreDom, scoreExt, dom, ext} }
  const [verrouilles, setVerrouilles] = useState({})
  const [typeActif, setTypeActif] = useState({}) // { matchId: 'vainqueur'|'score'|'combine' }
  const [brouillon, setBrouillon] = useState({}) // saisies en cours (score/combine) { matchId: {choix, scoreDom, scoreExt} }
  const [couponOuvert, setCouponOuvert] = useState(false)
  const [message, setMessage] = useState(null)
  const [chargement, setChargement] = useState(true)

  function coteDe(m, choix) {
    if (choix === '1') return Number(m.cote_domicile)
    if (choix === 'N') return Number(m.cote_nul)
    return Number(m.cote_exterieur)
  }
  function coteCombine(m, choix) {
    return Math.round(coteDe(m, choix) * 3 * 100) / 100
  }

  async function charger() {
    setChargement(true)

    const { data: tous } = await supabase
      .from('matches')
      .select('id, date_match, poule, score_domicile, cote_domicile, cote_nul, cote_exterieur, cote_score, dom:equipe_domicile(*), ext:equipe_exterieur(*)')
      .is('score_domicile', null)
      .order('date_match', { ascending: true })

    const { data: mesParis } = await supabase
      .from('paris')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('statut', 'en_attente')

    const aVenir = tous ?? []
    const nouveauCoupon = {}
    const nouveauVerr = {}
    const nouveauType = {}
    ;(mesParis ?? []).forEach((p) => {
      const m = aVenir.find((x) => x.id === p.match_id)
      if (!m) return
      if (estVerrouille(m.date_match)) {
        nouveauVerr[p.match_id] = p
      } else {
        nouveauType[p.match_id] = p.type
        nouveauCoupon[p.match_id] = {
          type: p.type, choix: p.choix, cote: Number(p.cote), mise: p.mise,
          scoreDom: p.score_dom ?? '', scoreExt: p.score_ext ?? '',
          dom: m.dom?.nom, ext: m.ext?.nom,
        }
      }
    })

    setMatchs(aVenir)
    setCoupon(nouveauCoupon)
    setVerrouilles(nouveauVerr)
    setTypeActif(nouveauType)
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  function setType(matchId, type) {
    setTypeActif((p) => ({ ...p, [matchId]: type }))
  }
  function setBrouillonChamp(matchId, champ, valeur) {
    setBrouillon((p) => ({ ...p, [matchId]: { ...p[matchId], [champ]: valeur } }))
  }
  function miseActuelle(matchId) {
    return coupon[matchId]?.mise ?? 50
  }

  // --- Ajout au coupon selon le type ---
  function ajouterVainqueur(m, choix) {
    setCoupon((prec) => {
      const copie = { ...prec }
      if (copie[m.id]?.type === 'vainqueur' && copie[m.id]?.choix === choix) {
        delete copie[m.id] // re-clic = on retire
      } else {
        copie[m.id] = { type: 'vainqueur', choix, cote: coteDe(m, choix), mise: miseActuelle(m.id), scoreDom: '', scoreExt: '', dom: m.dom?.nom, ext: m.ext?.nom }
      }
      return copie
    })
  }
  function ajouterScore(m) {
    const b = brouillon[m.id] || {}
    const sd = parseInt(b.scoreDom, 10), se = parseInt(b.scoreExt, 10)
    if (Number.isNaN(sd) || Number.isNaN(se)) { setMessage({ type: 'erreur', texte: 'Entre un score complet.' }); return }
    setMessage(null)
    setCoupon((prec) => ({ ...prec, [m.id]: { type: 'score', choix: null, cote: Number(m.cote_score), mise: miseActuelle(m.id), scoreDom: sd, scoreExt: se, dom: m.dom?.nom, ext: m.ext?.nom } }))
  }
  function ajouterCombine(m) {
    const b = brouillon[m.id] || {}
    const sd = parseInt(b.scoreDom, 10), se = parseInt(b.scoreExt, 10)
    if (!b.choix) { setMessage({ type: 'erreur', texte: 'Choisis l\'équipe gagnante.' }); return }
    if (Number.isNaN(sd) || Number.isNaN(se)) { setMessage({ type: 'erreur', texte: 'Entre un score complet.' }); return }
    const resScore = sd > se ? '1' : sd === se ? 'N' : '2'
    if (resScore !== b.choix) { setMessage({ type: 'erreur', texte: 'Le score doit correspondre à l\'équipe gagnante choisie.' }); return }
    setMessage(null)
    setCoupon((prec) => ({ ...prec, [m.id]: { type: 'combine', choix: b.choix, cote: coteCombine(m, b.choix), mise: miseActuelle(m.id), scoreDom: sd, scoreExt: se, dom: m.dom?.nom, ext: m.ext?.nom } }))
  }

  function changerMise(matchId, valeur) {
    setCoupon((prec) => ({ ...prec, [matchId]: { ...prec[matchId], mise: valeur } }))
  }
  function retirer(matchId) {
    setCoupon((prec) => { const c = { ...prec }; delete c[matchId]; return c })
  }

  async function validerCoupon() {
    setMessage(null)
    const entrees = Object.entries(coupon)
    if (entrees.length === 0) return
    const erreurs = []
    for (const [matchId, sel] of entrees) {
      const mise = parseInt(sel.mise, 10)
      if (Number.isNaN(mise) || mise <= 0) { erreurs.push(`Mise invalide (${sel.dom}-${sel.ext})`); continue }
      const sd = sel.scoreDom === '' || sel.scoreDom == null ? null : parseInt(sel.scoreDom, 10)
      const se = sel.scoreExt === '' || sel.scoreExt == null ? null : parseInt(sel.scoreExt, 10)
      const { error } = await supabase.rpc('placer_pari', {
        p_match_id: Number(matchId), p_type: sel.type, p_choix: sel.choix ?? null,
        p_mise: mise, p_score_dom: sd, p_score_ext: se,
      })
      if (error) erreurs.push(`${sel.dom}-${sel.ext} : ${error.message}`)
    }
    await rafraichirProfil()
    await charger()
    setCouponOuvert(false)
    setMessage(erreurs.length > 0
      ? { type: 'erreur', texte: erreurs.join(' | ') }
      : { type: 'succes', texte: '✅ Coupon validé ! Bonne chance 🍀' })
  }

  const nbCoupon = Object.keys(coupon).length
  const totalMise = Object.values(coupon).reduce((s, x) => s + (parseInt(x.mise, 10) || 0), 0)
  const totalGain = Object.values(coupon).reduce((s, x) => s + Math.round((parseInt(x.mise, 10) || 0) * x.cote), 0)

  if (chargement) {
    return <div className="container"><header className="app-header"><h1>🎲 Paris</h1></header><p className="muted">Chargement...</p></div>
  }

  const TYPES = [
    { cle: 'vainqueur', label: 'Vainqueur' },
    { cle: 'score', label: 'Score exact' },
    { cle: 'combine', label: 'Combiné' },
  ]

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>🎲 Paris</h1>
          <p>Vainqueur • Score exact • Combiné</p>
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
        const type = typeActif[m.id] || 'vainqueur'
        const sel = coupon[m.id]
        const b = brouillon[m.id] || {}
        const pariVerr = verrouilles[m.id]

        return (
          <div className="card" key={m.id}>
            {m.poule && <span className="poule-badge">{m.poule}</span>}
            <div className="match-date">📅 {new Date(m.date_match).toLocaleString('fr-FR')}</div>

            <div className="match-equipes">
              <div className="equipe">
                <div className="equipe-nom">{m.dom?.nom}</div>
                <Forme texte={m.dom?.forme} />
              </div>
              <div className="vs">VS</div>
              <div className="equipe">
                <div className="equipe-nom">{m.ext?.nom}</div>
                <Forme texte={m.ext?.forme} />
              </div>
            </div>

            {verrouille ? (
              <>
                <div className="statut-verrouille">🔒 Paris fermés (moins de 2h avant le match)</div>
                {pariVerr && (
                  <div className="mon-pari">
                    Ton pari : {pariVerr.type === 'score'
                      ? `Score exact ${pariVerr.score_dom}-${pariVerr.score_ext}`
                      : pariVerr.type === 'combine'
                        ? `${libelleChoix(pariVerr.choix, m.dom?.nom, m.ext?.nom)} + ${pariVerr.score_dom}-${pariVerr.score_ext}`
                        : `${libelleChoix(pariVerr.choix, m.dom?.nom, m.ext?.nom)}`}
                    {' '}(cote {Number(pariVerr.cote).toFixed(2)}) — {pariVerr.mise} 🪙
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Onglets de type de pari */}
                <div className="type-tabs">
                  {TYPES.map((t) => (
                    <button key={t.cle} className={`type-tab ${type === t.cle ? 'actif' : ''}`} onClick={() => setType(m.id, t.cle)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Marché : VAINQUEUR */}
                {type === 'vainqueur' && (
                  <div className="marche cotes">
                    {['1', 'N', '2'].map((c) => (
                      <button key={c}
                        className={`cote-btn ${sel?.type === 'vainqueur' && sel?.choix === c ? 'choisi' : ''}`}
                        onClick={() => ajouterVainqueur(m, c)}>
                        <span className="label">{c === '1' ? m.dom?.nom : c === '2' ? m.ext?.nom : 'Nul'}</span>
                        <span className="valeur">{coteDe(m, c).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Marché : SCORE EXACT */}
                {type === 'score' && (
                  <div className="marche">
                    <div className="saisie-score">
                      <input type="number" min="0" placeholder="0" value={b.scoreDom ?? ''} onChange={(e) => setBrouillonChamp(m.id, 'scoreDom', e.target.value)} />
                      <span className="tiret">-</span>
                      <input type="number" min="0" placeholder="0" value={b.scoreExt ?? ''} onChange={(e) => setBrouillonChamp(m.id, 'scoreExt', e.target.value)} />
                    </div>
                    <div className="cote-info">Cote score exact : <strong>{Number(m.cote_score).toFixed(2)}</strong></div>
                    <button className="btn-ajouter" onClick={() => ajouterScore(m)}>Ajouter au coupon</button>
                  </div>
                )}

                {/* Marché : COMBINÉ (équipe + score) */}
                {type === 'combine' && (
                  <div className="marche">
                    <div className="choix-mini">
                      {['1', 'N', '2'].map((c) => (
                        <button key={c} className={b.choix === c ? 'actif' : ''} onClick={() => setBrouillonChamp(m.id, 'choix', c)}>
                          {c === '1' ? m.dom?.nom : c === '2' ? m.ext?.nom : 'Nul'}
                        </button>
                      ))}
                    </div>
                    <div className="saisie-score">
                      <input type="number" min="0" placeholder="0" value={b.scoreDom ?? ''} onChange={(e) => setBrouillonChamp(m.id, 'scoreDom', e.target.value)} />
                      <span className="tiret">-</span>
                      <input type="number" min="0" placeholder="0" value={b.scoreExt ?? ''} onChange={(e) => setBrouillonChamp(m.id, 'scoreExt', e.target.value)} />
                    </div>
                    <div className="cote-info">Cote combiné : <strong>{b.choix ? coteCombine(m, b.choix).toFixed(2) : '—'}</strong></div>
                    <button className="btn-ajouter" onClick={() => ajouterCombine(m)}>Ajouter au coupon</button>
                  </div>
                )}

                {sel && <div className="dans-coupon">✓ Ajouté au coupon</div>}
              </>
            )}
          </div>
        )
      })}

      {/* Coupon */}
      {nbCoupon > 0 && !couponOuvert && (
        <button className="coupon-bouton" onClick={() => setCouponOuvert(true)}>🧾 Coupon ({nbCoupon})</button>
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
                {sel.type === 'score'
                  ? `Score exact : ${sel.scoreDom}-${sel.scoreExt}`
                  : sel.type === 'combine'
                    ? `Combiné : ${libelleChoix(sel.choix, sel.dom, sel.ext)} + ${sel.scoreDom}-${sel.scoreExt}`
                    : `Vainqueur : ${libelleChoix(sel.choix, sel.dom, sel.ext)}`}
                {' '}• cote {Number(sel.cote).toFixed(2)}
              </div>
              <div className="coupon-mise">
                <span className="muted">Mise :</span>
                <input type="number" min="1" value={sel.mise} onChange={(e) => changerMise(matchId, e.target.value)} />
                <span className="muted">🪙</span>
                <button className="coupon-retirer" onClick={() => retirer(matchId)} style={{ marginLeft: 'auto' }}>Retirer</button>
              </div>
              <div className="coupon-gain">Gain potentiel : {Math.round((parseInt(sel.mise, 10) || 0) * sel.cote)} 🪙</div>
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
