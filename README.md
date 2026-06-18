# ⚽ Pronos entre amis

Application de pronostics sportifs pour 5 joueurs.
Stack : **React + Vite**, **Supabase** (base de données + comptes), **Cloudflare Pages** (déploiement).

---

## 🧩 Fonctionnalités

- Connexion par **prénom + mot de passe**
- 1re connexion : mot de passe = `Prénom1` (ex : `Lucas1`), **changement obligatoire**
- Pronostics sur le **score exact** des matchs
- Barème : **3 pts** (score exact), **1 pt** (bon vainqueur/nul), **0 pt** sinon
- **Classement** automatique
- **Statistiques** des équipes
- Interface en français, pensée pour le **mobile**

---

## 📁 Arborescence du projet

```
pronos-app/
├── index.html                  → page HTML de base
├── package.json                → liste des dépendances + commandes
├── vite.config.js              → configuration de Vite
├── .env.example                → modèle des variables d'environnement
├── .env                        → TES vraies clés (à créer, jamais commité)
├── .gitignore
├── README.md                   → ce fichier
├── supabase/
│   └── schema.sql              → tables + sécurité + calcul des points
└── src/
    ├── main.jsx                → point d'entrée React
    ├── App.jsx                 → routes (pages) de l'app
    ├── index.css               → styles (mobile)
    ├── supabaseClient.js       → connexion à Supabase
    ├── context/
    │   └── AuthContext.jsx     → gère l'utilisateur connecté
    ├── components/
    │   ├── Navbar.jsx          → barre de navigation du bas
    │   └── ProtectedRoute.jsx  → protège les pages privées
    └── pages/
        ├── Login.jsx           → connexion
        ├── ChangePassword.jsx  → changement de mot de passe (1re connexion)
        ├── Matchs.jsx          → liste des matchs + saisie des pronos
        ├── Classement.jsx      → classement général
        └── Statistiques.jsx    → stats des équipes
```

---

## 🔑 Variables d'environnement

Crée un fichier nommé **`.env`** à la racine (copie de `.env.example`) :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyXXXXXXXXXXXXXXXXXXXXXX
```

> Tu trouves ces 2 valeurs dans **Supabase > Settings > API**
> (`Project URL` et `anon public key`).

⚠️ Ne mets **jamais** ces clés sur GitHub : le `.gitignore` exclut déjà `.env`.

---

## 🗄️ Étape 1 — Configurer Supabase

1. Va sur https://supabase.com → **New project** (choisis un nom + mot de passe de base de données).
2. Quand le projet est prêt, ouvre **SQL Editor** → **New query**.
3. Copie-colle **tout le contenu de `supabase/schema.sql`** et clique **Run**.
   → Cela crée les tables, la sécurité, le calcul des points, et des données d'exemple.

### Créer les 5 joueurs

Le login étant le prénom, on crée un compte par joueur avec un **faux email** `prenom@pronos.local`.

1. Dans Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Pour chaque joueur, remplis :
   - **Email** : `lucas@pronos.local` (prénom en minuscules)
   - **Password** : `Lucas1` (prénom + 1)
   - ✅ Coche **Auto Confirm User** (sinon il faudrait confirmer un email).
3. Répète pour tes 5 joueurs.

> Grâce au trigger SQL, une ligne `profiles` est créée automatiquement
> avec `prenom = Lucas` et `must_change_password = true`.

### Te donner les droits "admin" (pour saisir les matchs et résultats)

Dans **SQL Editor**, lance (remplace par ton prénom) :

```sql
update public.profiles set is_admin = true where prenom = 'Lucas';
```

> Les admins peuvent ajouter des matchs et saisir les scores finaux.
> Pour l'instant, ça se fait directement dans Supabase (Table Editor) :
> table `matches` → renseigne `score_domicile` et `score_exterieur` →
> les points se calculent **tout seuls** ✨.

---

## 💻 Étape 2 — Lancer le projet en local

Pré-requis : **Node.js** installé (https://nodejs.org, version LTS).

Dans un terminal, à la racine du projet :

```bash
# 1) Installer les dépendances (à faire une seule fois)
npm install

# 2) Lancer le serveur de développement
npm run dev
```

Ouvre l'adresse affichée (en général http://localhost:5173).

Connecte-toi avec un joueur (ex : `Lucas` / `Lucas1`), change le mot de passe,
et tu arrives sur la liste des matchs 🎉.

---

## 🚀 Étape 3 — Déployer sur Cloudflare Pages

### A. Mettre le code sur GitHub

```bash
git init
git add .
git commit -m "Première version pronos-app"
```

Crée un dépôt vide sur GitHub, puis :

```bash
git remote add origin https://github.com/TON-PSEUDO/pronos-app.git
git branch -M main
git push -u origin main
```

### B. Connecter Cloudflare Pages

1. Va sur https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choisis ton dépôt `pronos-app`.
3. Configuration du build :
   - **Framework preset** : `Vite`
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
4. **Environment variables** (très important) → ajoute :
   - `VITE_SUPABASE_URL` = ton URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = ta clé anon
5. Clique **Save and Deploy**.

Au bout de quelques minutes, ton application est en ligne à une adresse
du type `https://pronos-app.pages.dev` 🎉.

> À chaque `git push`, Cloudflare redéploie automatiquement la nouvelle version.

---

## 🧠 Comment marche le calcul des points ?

Tout se passe **dans Supabase**, pas dans React :

1. Un admin saisit le score final d'un match (table `matches`).
2. Un **trigger SQL** (`trg_calculer_points`) se déclenche automatiquement.
3. Il parcourt tous les pronos de ce match et met `points` à 3, 1 ou 0.
4. La **vue `classement`** additionne les points → le classement est à jour.

Avantage : impossible de tricher depuis le navigateur, le calcul est côté serveur.

---

## ❓ Problèmes fréquents

- **"Variables Supabase manquantes"** → tu as oublié de créer le fichier `.env`.
- **"Prénom ou mot de passe incorrect"** → vérifie l'email du joueur dans Supabase
  (`prenom@pronos.local`, tout en minuscules).
- **Le classement est vide** → normal tant qu'aucun match n'a de score final saisi.
- **Erreur de droits en saisissant un match** → ton profil n'est pas `is_admin = true`.
```
