/* ═══════════════════════════════════════════════════════════════════════
   CHAOS — Habillage de l'application (connexion, menu, accueil, carte)
   Chargé après le script principal : remplace les anciennes mises en page.
   ═══════════════════════════════════════════════════════════════════════ */

/* ---------- Identifiants : « admis 0604 » = « admis#0604 » = « ADMIS-0604 » ---------- */
const normId = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* Profil de base : administrateur (créé s'il n'existe pas déjà dans ce navigateur) */
(function ensureBaseAdmin() {
  if (!state.accounts.some((a) => normId(a.identifiant) === 'admis-0604')) {
    state.accounts.push({ id: 'acc-base', nom: 'Admis 0604', identifiant: 'admis 0604', motDePasse: '', roleId: 'admin', statut: 'actif', dateInscription: '18/11/2026', extraValidateRegistrations: false });
  }
})();

/* ---------- Heure relative ---------- */
function relTime(l) {
  const t = parseInt(String(l.id || '').replace(/\D/g, ''), 10);
  if (!t) return esc(l.date || '');
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "À l'instant";
  if (m < 60) return 'Il y a ' + m + ' min';
  if (m < 1440) return 'Il y a ' + Math.round(m / 60) + ' h';
  return esc(l.date || '');
}

/* ---------- Connexion ---------- */
renderLogin = function () {
  return `<div class="login">
    <div class="sky"></div>
    <div class="box">
      <img src="${state.logo || 'assets/logo.png'}" alt="Logo Chaos"/>
      <h1>Base de données <em>Le Chaos</em></h1>
      <div class="sub">Accès réservé</div>
      <label for="loginInput">Identifiant</label>
      <input id="loginInput" type="text" autocomplete="username" placeholder="prenom.nom#0000"/>
      <label for="loginPwd">Mot de passe</label>
      <input id="loginPwd" type="password" autocomplete="current-password" placeholder="••••••••"/>
      <div id="loginError" style="margin-top:12px"></div>
      <button id="loginBtn" class="go">${icon('key-round', 'w-5 h-5')} Accéder au système</button>
    </div>
  </div>`;
};

/* ---------- Navigation (menu de la maquette) ---------- */
const MENU = [['home', 'home', 'Accueil'], ['map', 'map-pin', 'Carte'], ['events', 'calendar-days', 'Calendrier'], ['db', 'database', 'Base de Données'], ['docs', 'file-text', 'Document'], ['fav', 'star', 'Favoris'], ['admin', 'settings', 'Paramètre']];
const OTHER_CAT = ['documents', 'favorites'];
function shellGo(id) {
  state.userMenu = false;
  if (id === 'db') { if (OTHER_CAT.includes(state.selectedCategory)) state.selectedCategory = 'members'; return navGo(state.selectedCategory); }
  if (id === 'docs') return navGo('documents');
  if (id === 'fav') return navGo('favorites');
  navGo(id);
}
function menuOn(id) {
  if (['home', 'map', 'events', 'admin'].includes(id)) return state.activeNav === id;
  const db = state.activeNav === 'database';
  if (id === 'docs') return db && state.selectedCategory === 'documents';
  if (id === 'fav') return db && state.selectedCategory === 'favorites';
  return db && !OTHER_CAT.includes(state.selectedCategory);
}
function toggleUserMenu() { state.userMenu = !state.userMenu; render(); }
document.addEventListener('click', (e) => { if (state.userMenu && !e.target.closest('.acct')) { state.userMenu = false; render(); } });

/* ---------- Mise en page ---------- */
renderLayout = function (content) {
  const u = user(), r = role();
  const admin = canManageRoles() || canValidateReg();
  const items = MENU.filter(([id]) => id !== 'admin' || admin);
  const home = state.activeNav === 'home';
  const logo = state.logo || 'assets/logo.png';
  return `<div class="shell">
  <aside class="sb ${state.sideOpen ? 'open' : ''}">
    <label class="logo" title="Cliquer pour changer le logo"><img src="${logo}" alt="Logo"/><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden" onchange="setLogo(this)"/></label>
    <div class="brand"><b>Base de Données</b><span>Le Chaos</span></div>
    <nav>${items.map(([id, ic, l]) => `<button class="nv ${menuOn(id) ? 'on' : ''}" onclick="shellGo('${id}')">${icon(ic, 'w-5 h-5')}<span>${l}</span></button>`).join('')}</nav>
    <div class="foot"><b>Groupe Chaos</b><span>Los Santos</span><i></i></div>
  </aside>
  ${state.sideOpen ? '<div class="fixed inset-0 bg-black/60 z-30 md:hidden" onclick="state.sideOpen=false;render()"></div>' : ''}
  <div class="main">
    ${home ? `<div class="sky"></div>` : ''}
    <header class="tb ${home ? '' : 'solid'}">
      <button class="burger" aria-label="Menu" onclick="state.sideOpen=true;render()">${icon('menu', 'w-5 h-5')}</button>
      <div class="search">${icon('search')}<input id="gsearch" value="${esc(state.searchQuery)}" onkeydown="if(event.key==='Enter')globalSearch(this.value)" placeholder="Rechercher dans la Base de données…" autocomplete="off"/></div>
      <div class="acct">
        <button onclick="toggleUserMenu()" aria-haspopup="true" aria-expanded="${!!state.userMenu}">
          <span class="av">${icon('user', 'w-5 h-5')}</span>
          <span class="who"><div class="nm">${esc(u?.nom || '')}</div><div class="gr">${esc(r.nom)}</div></span>
          ${icon('chevron-down', 'w-4 h-4')}
        </button>
        ${state.userMenu ? `<div class="menu">
          ${canBackup() ? `<button onclick="exportData()">${icon('download', 'w-4 h-4')} Exporter la sauvegarde</button>
          <label>${icon('upload', 'w-4 h-4')} Importer une sauvegarde<input type="file" accept="application/json" class="hidden" onchange="importData(this)"/></label><hr/>` : ''}
          <button onclick="handleLogout()">${icon('log-out', 'w-4 h-4')} Déconnexion</button>
        </div>` : ''}
      </div>
    </header>
    <main class="content">${content}</main>
  </div>
  ${state.toast ? `<div class="fixed bottom-6 right-6 text-white px-4 py-2.5 rounded-lg shadow-2xl text-sm font-semibold flex items-center gap-2 z-50 toast" style="background:#e11d2e">${icon('check-circle-2', 'w-4 h-4')}${esc(state.toast)}</div>` : ''}
  ${state.modal ? renderModal() : ''}${state.confirmDelete ? renderConfirmDelete() : ''}
  </div>`;
};

/* ---------- Carte : un seul exemplaire de chaque carte, déplacé d'une page à l'autre ---------- */
const MAPS = {};
function mapStash() {
  let d = document.getElementById('mapStash');
  if (!d) { d = document.createElement('div'); d.id = 'mapStash'; d.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;height:600px;overflow:hidden;visibility:hidden'; document.body.appendChild(d); }
  return d;
}
function stashMaps() { const st = mapStash(); Object.values(MAPS).forEach((m) => st.appendChild(m.el)); }
function attachMaps() {
  ['full', 'mini'].forEach((n) => {
    const slot = document.getElementById('slot-' + n);
    if (!slot || !window.ChaosMap) return;
    let m = MAPS[n];
    if (!m) { m = MAPS[n] = { el: Object.assign(document.createElement('div'), { className: 'maphost' }), inst: null, nav: null }; }
    slot.appendChild(m.el);
    if (!m.inst) {
      m.inst = ChaosMap.mount(m.el, n === 'mini'
        ? { brand: false, mini: true, permissions: () => ({ write: false, remove: false }), initialView: { x: 3900, y: 5600, zoom: 2.5 } }
        : { brand: false, permissions: () => ({ write: canEdit(), remove: canEditAll() }) });
    } else {
      if (m.nav !== state.activeNav && m.inst.reload) m.inst.reload();
      m.inst.invalidate();
    }
    m.nav = state.activeNav;
  });
}
renderMap = function () { return `<div class="mappage"><div id="slot-full" style="position:absolute;inset:0"></div></div>`; };

/* ---------- Accueil ---------- */
renderHome = function () {
  const up = upcoming(), logs = state.logs.slice(0, 3);
  const stat = (ic, n, l, go) => `<button class="stat" onclick="navGo('${go}')">${icon(ic)}<div><b>${n}</b><span>${l}</span></div></button>`;
  return `<div>
  <div class="hello"><div><h2>Bienvenue dans la base de données du <em>Groupe Chaos</em></h2><p>Gérez, consultez et organisez toutes les informations du groupe en un seul endroit.</p></div></div>
  <div class="stats">${stat('users', state.members.length, 'Membres', 'members')}${stat('file-text', state.companies.length, 'Entreprises', 'companies')}${stat('car', state.vehicles.length, 'Véhicules', 'vehicles')}${stat('users', state.groups.length, 'Groupes', 'groups')}</div>
  <div class="grid2">
    <section class="pan" style="min-height:520px">
      <header>${icon('map-pin', 'hi')}<h3>Carte de Los Santos</h3><button class="lk" onclick="navGo('map')">Aller à la page ${icon('arrow-right', 'w-4 h-4')}</button></header>
      <div class="mapslot"><div id="slot-mini" style="position:absolute;inset:0"></div></div>
    </section>
    <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
      <section class="pan">
        <header>${icon('calendar-days', 'hi')}<h3>Prochains événements</h3><button class="lk" onclick="navGo('events')">Voir tout ${icon('arrow-right', 'w-4 h-4')}</button></header>
        ${up.length ? up.slice(0, 3).map((e) => { const d = new Date(e.date + 'T00:00'); return `<div class="ev"><div class="d"><b>${d.getDate()}</b><span>${MOISC[d.getMonth()]}</span></div><div style="min-width:0"><div style="font-size:19px;font-weight:600" class="truncate">${esc(e.titre)}</div><div style="font-size:15px;color:var(--ink-dim)">${e.heure ? esc(e.heure) : ''}${e.lieu ? ' · ' + esc(e.lieu) : ''}</div></div></div>`; }).join('')
          : `<div class="empty">${icon('calendar-days')}<div>Aucun événement prévu pour le moment.</div></div>`}
      </section>
      <section class="pan" style="flex:1">
        <header>${icon('square-pen', 'hi')}<h3>Dernières modifications</h3>${canManageRoles() || canValidateReg() ? `<button class="lk" onclick="state.adminTab='logs';navGo('admin')">Voir plus ${icon('arrow-right', 'w-4 h-4')}</button>` : ''}</header>
        ${logs.length ? logs.map((l) => `<div class="mod"><span class="av">${icon('user', 'w-5 h-5')}</span><div class="tx" title="${esc(l.action)}">${esc(l.action)}</div><div class="tm">${relTime(l)}</div></div>`).join('')
          : `<div class="empty">${icon('square-pen')}<div>Aucune modification pour le moment.</div></div>`}
      </section>
    </div>
  </div></div>`;
};

/* ---------- Démarrage : la bibliothèque Supabase n'est chargée que si elle sert ---------- */
(function start() {
  const c = window.CHAOS_MAP_CONFIG && window.CHAOS_MAP_CONFIG.supabase;
  if (c && c.url && c.anonKey) {
    const sc = document.createElement('script'); sc.src = 'vendor/supabase/supabase.js';
    sc.onload = sc.onerror = () => { render(); window.__chaosReady = true; }; document.head.appendChild(sc);
  } else { render(); window.__chaosReady = true; }
})();
