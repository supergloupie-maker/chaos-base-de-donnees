/* ═══════════════════════════════════════════════════════════════
   CONFIGURATION DE LA CARTE — le seul fichier à modifier pour :
   • brancher Supabase (url + clé « anon / publishable »)
   • changer de source de tuiles (ex. une carte plus haute résolution)
   • modifier les catégories de repères
   ═══════════════════════════════════════════════════════════════ */
window.CHAOS_MAP_CONFIG = {

  /* ── Supabase ───────────────────────────────────────────────
     Laisser vide = « mode local » (données propres au navigateur, non partagées).
     Ne mettre ICI que l'URL du projet et la clé publique (anon / publishable).
     La clé secrète (service_role / secret) ne doit JAMAIS apparaître dans ce site. */
  supabase: {
    url: '',        // ex. 'https://abcdxyz.supabase.co'
    anonKey: ''     // ex. 'eyJhbGciOi…' (clé publique anon)
  },

  /* Les identifiants (ex. « vander.shinozaki#0001 ») sont convertis en adresse
     technique « vander.shinozaki-0001@<domaine> » pour Supabase Auth. */
  authDomain: 'chaos.local',

  /* ── Source des tuiles ──────────────────────────────────────
     Pour passer à une carte plus précise plus tard : changer urlTemplate,
     maxNativeZoom (et tileSize si besoin). Les repères restent à la bonne place
     car ils sont enregistrés dans un repère de référence fixe (referenceSize). */
  tiles: {
    urlTemplate: 'assets/map/satelite/{z}/{x}-{y}.webp',
    /* Alternative sans hébergement des tuiles (site de l'auteur de la source) :
       'https://viruxe.github.io/gtav-map-tiles/satelite/{z}/{x}-{y}.webp' */
    tileSize: 256,
    minNativeZoom: 0,
    maxNativeZoom: 5,        // niveau le plus détaillé réellement fourni (8192 × 8192 px)
    attribution: 'Carte GTA V © Rockstar Games · tuiles VIRUXE/gtav-map-tiles'
  },

  /* Repère de référence des coordonnées x / y enregistrées en base (0 → 8192).
     Ne pas changer, même si la source de tuiles change. */
  referenceSize: 8192,

  /* Rôles autorisés (noms exacts de la table profiles) */
  rolesEcriture: ['administrateur', 'conseil', 'membre'],
  rolesSuppression: ['administrateur'],

  /* ── Catégories de repères ── */
  categories: [
    { id: 'base',         label: 'Base / QG',          icon: 'House',         color: '#e11d2e' },
    { id: 'entreprise',   label: 'Entreprise',         icon: 'Store',         color: '#f59e0b' },
    { id: 'territoire',   label: 'Groupe / Territoire',icon: 'Users',         color: '#8b5cf6' },
    { id: 'rdv',          label: 'Point de rendez-vous',icon: 'Flag',         color: '#3b82f6' },
    { id: 'surveillance', label: 'Surveillance',       icon: 'Eye',           color: '#14b8a6' },
    { id: 'danger',       label: 'Danger / Police',    icon: 'Siren',         color: '#f97316' },
    { id: 'autre',        label: 'Autre',              icon: 'MapPin',        color: '#9ca3af' }
  ],

  /* Icônes proposées dans le formulaire (noms Lucide présents dans icons.js) */
  icons: ['MapPin','House','Building2','Store','Warehouse','Users','Flag','Eye','Siren','Shield','Skull','Swords','Crosshair','Car','Package','Briefcase','Radio','Landmark','Star','TriangleAlert'],

  colors: ['#e11d2e','#f97316','#f59e0b','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#f5f5f5','#9ca3af']
};
