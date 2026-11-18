# Projet Chaos — Base de données

Site statique (HTML/JS), aucun build.

## Contenu
- `index.html` : l'application (connexion, base, calendrier, documents, administration)
- `assets/js/shell.js` : habillage rouge/noir (connexion, menu, accueil) · `assets/theme.css` · `assets/tailwind.css` (CSS compilé)
- `carte.html` : la carte tactique seule (dans l'application, elle est intégrée directement : page **Carte** + aperçu de l'accueil)
- `assets/map/` : `config.js` (réglages), `map.js`, `map.css`, tuiles chargées depuis https://viruxe.github.io/gtav-map-tiles (source VIRUXE/gtav-map-tiles, zooms 0 à 5)
- `supabase/carte.sql` : tables, rôles et règles de sécurité de la carte
- `vendor/` : Leaflet, Leaflet-Draw, markercluster, supabase-js, Lucide (en local)
- `vercel.json` : cache long pour les tuiles

## Tester la carte en local
Dans ce dossier : `python3 -m http.server 8000` puis ouvrir http://localhost:8000/carte.html
(sans Supabase configuré, la carte fonctionne en **mode local** : repères enregistrés dans ce navigateur uniquement).

## Brancher Supabase (repères partagés)
1. supabase.com → New project.
2. SQL Editor → coller le contenu de `supabase/carte.sql` → Run.
3. Authentication → Providers → Email : **désactiver « Confirm email »**.
4. Authentication → Users → Add user : e-mail `identifiant@chaos.local` (ex. `vander.shinozaki-0001@chaos.local`, le « # » devient « - ») + mot de passe.
5. SQL Editor : `update public.profiles set role='administrateur' where identifiant='vander.shinozaki-0001';`
6. Project Settings → API : copier l'URL et la clé **anon / publishable** dans `assets/map/config.js`.
   Ne jamais mettre la clé secrète / service_role dans le site.
Rôles : administrateur, conseil, membre peuvent ajouter/modifier ; seul l'administrateur supprime ; recrue = lecture.

## Mettre en ligne (Vercel)
Dépôt GitHub → Vercel « Add New → Project » → Deploy (aucun réglage). Les tuiles font 22 Mo / 1365 fichiers :
envoyer le dossier avec GitHub Desktop ou `git push` (l'envoi par navigateur est limité en nombre de fichiers).
Alternative sans tuiles dans le dépôt : dans `config.js`, mettre `https://viruxe.github.io/gtav-map-tiles/satelite/{z}/{x}-{y}.webp`.

## Limites connues
- Résolution maximale = zoom 5 (8192×8192), plafond de la source ; rien n'est agrandi artificiellement.
- Le reste de l'application (fiches, agenda, comptes) est encore enregistré dans le navigateur : étape suivante.

## Connexion de base
Compte administrateur local : identifiant `admis 0604`. Aucun mot de passe n'est stocké dans le code : il est choisi à la toute première connexion (8 caractères minimum).

## Régénérer le CSS (seulement si vous ajoutez de nouvelles classes Tailwind)
`npx tailwindcss@3.4.17 -c tw.config.js -i tw.in.css -o assets/tailwind.css --minify`
(`tw.config.js` : content = index.html et assets/js/shell.js ; `tw.in.css` : les 3 lignes @tailwind base/components/utilities)
