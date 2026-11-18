/* ═══════════════════════════════════════════════════════════════════════
   CHAOS — Carte tactique GTA V (module)
   Leaflet + CRS.Simple · tuiles 256 px · repères et zones dans Supabase
   Utilisation : ChaosMap.mount(element, { config?, permissions?, brand? })
   Configuration par défaut : assets/map/config.js
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const BASE_CFG = window.CHAOS_MAP_CONFIG;
  const ICONS = window.CHAOS_ICONS || {};
  const TEMPLATE = `<!-- ═════════ ZONE CARTE ═════════ -->
  <main id="mapwrap">
    <div id="map" tabindex="0" aria-label="Carte de Los Santos et Blaine County"></div>
    <div id="loadbar" aria-hidden="true"></div>

    <!-- Recherche -->
    <div id="searchbox" role="search">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="searchInput" type="search" autocomplete="off" spellcheck="false"
             placeholder="Rechercher un repère, une zone ou « x, y »…" aria-label="Rechercher sur la carte">
      <ul id="searchResults" hidden></ul>
    </div>

    <!-- Bandeau d'aide (ajout, déplacement, dessin…) -->
    <div id="modeBanner" hidden>
      <span id="modeBannerText"></span>
      <button type="button" id="modeBannerBtn" class="btn sm">Annuler</button>
    </div>

    <!-- Commandes -->
    <div id="ctrlStack">
      <button type="button" class="cbtn" id="zoomIn"  aria-label="Zoom avant"  title="Zoom avant">+</button>
      <button type="button" class="cbtn" id="zoomOut" aria-label="Zoom arrière" title="Zoom arrière">−</button>
      <button type="button" class="cbtn" id="recenter" aria-label="Recentrer la carte" title="Recentrer la carte">
        <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>
    </div>

    <!-- État -->
    <div id="statusbar">
      <span id="coords">x <b id="cx">–</b> · y <b id="cy">–</b> · zoom <b id="cz">–</b></span>
      <span id="syncChip" class="chip" hidden></span>
      <button type="button" id="tileChip" class="chip warn" hidden></button>
    </div>

    <button type="button" id="panelToggle" aria-label="Afficher ou masquer le panneau" aria-expanded="true" title="Panneau">
      <svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>
    </button>
  </main>

  <!-- ═════════ PANNEAU LATÉRAL ═════════ -->
  <aside id="panel" aria-label="Panneau de la carte">
    <header class="ph">
      <div class="brand"><span class="star">✶</span> CHAOS <small>Carte tactique</small></div>
      <div class="session">
        <span id="whoami">Mode local</span>
        <button type="button" id="authBtn" class="btn sm" hidden>Connexion</button>
      </div>
    </header>

    <div class="pbody">
      <button type="button" id="addMarkerBtn" class="btn primary block">
        <svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Ajouter un marqueur
      </button>

      <div class="group" id="drawGroup">
        <div class="glabel">Dessiner</div>
        <div class="row">
          <button type="button" class="btn" data-draw="polyline"  title="Tracer une ligne">Ligne</button>
          <button type="button" class="btn" data-draw="polygon"   title="Dessiner une zone">Zone</button>
          <button type="button" class="btn" data-draw="rectangle" title="Dessiner un rectangle">Rectangle</button>
        </div>
      </div>

      <div class="group">
        <div class="glabel">Légende et filtres
          <span class="links"><a href="#" id="filtAll">Tout</a> · <a href="#" id="filtNone">Aucun</a></span>
        </div>
        <ul id="legend"></ul>
        <label class="check"><input type="checkbox" id="optShapes" checked> Afficher zones et lignes</label>
        <label class="check"><input type="checkbox" id="optCluster" checked> Regrouper les repères proches</label>
      </div>

      <div class="group grow">
        <div class="glabel">Repères <span id="markerCount" class="muted">(0)</span></div>
        <ul id="markerList"></ul>
        <p id="emptyMsg" class="muted" hidden>Aucun repère à afficher.</p>
      </div>
    </div>
  </aside>
<!-- ═════════ FORMULAIRE REPÈRE ═════════ -->
<div class="overlay" id="markerModal" hidden>
  <form class="modal" id="markerForm" autocomplete="off" novalidate>
    <h2 id="markerModalTitle">Nouveau marqueur</h2>
    <p class="sub" id="markerModalSub"></p>

    <label for="mName">Nom</label>
    <input id="mName" type="text" maxlength="80" required placeholder="Ex : QG, point de rendez-vous…">

    <label for="mDesc">Description</label>
    <textarea id="mDesc" rows="3" maxlength="2000" placeholder="Informations utiles (facultatif)"></textarea>

    <label for="mCat">Catégorie</label>
    <select id="mCat"></select>

    <label>Icône</label>
    <div id="mIcons" class="icongrid" role="radiogroup" aria-label="Icône"></div>

    <label>Couleur</label>
    <div id="mColors" class="swatches" role="radiogroup" aria-label="Couleur"></div>

    <p id="mError" class="err" hidden></p>
    <div class="actions">
      <button type="button" class="btn danger" id="mDelete" hidden>Supprimer</button>
      <span class="sp"></span>
      <button type="button" class="btn" id="mCancel">Annuler</button>
      <button type="submit" class="btn primary" id="mSave">Enregistrer</button>
    </div>
  </form>
</div>

<!-- ═════════ FORMULAIRE ZONE / LIGNE ═════════ -->
<div class="overlay" id="shapeModal" hidden>
  <form class="modal" id="shapeForm" autocomplete="off" novalidate>
    <h2 id="shapeModalTitle">Zone</h2>
    <label for="sName">Nom</label>
    <input id="sName" type="text" maxlength="80" placeholder="Ex : territoire, zone de guerre…">
    <label>Couleur</label>
    <div id="sColors" class="swatches" role="radiogroup" aria-label="Couleur"></div>
    <p id="sError" class="err" hidden></p>
    <div class="actions">
      <button type="button" class="btn danger" id="sDelete" hidden>Supprimer</button>
      <button type="button" class="btn" id="sGeom" hidden>Modifier la forme</button>
      <span class="sp"></span>
      <button type="button" class="btn" id="sCancel">Annuler</button>
      <button type="submit" class="btn primary">Enregistrer</button>
    </div>
  </form>
</div>

<!-- ═════════ CONNEXION ═════════ -->
<div class="overlay" id="loginModal" hidden>
  <form class="modal" id="loginForm" autocomplete="on">
    <h2>Connexion</h2>
    <p class="sub">Connectez-vous pour voir et modifier les repères partagés.</p>
    <label for="lId">Identifiant</label>
    <input id="lId" type="text" autocomplete="username" required placeholder="ex : vander.shinozaki#0001">
    <label for="lPw">Mot de passe</label>
    <input id="lPw" type="password" autocomplete="current-password" required>
    <p id="lError" class="err" hidden></p>
    <div class="actions">
      <span class="sp"></span>
      <button type="button" class="btn" id="lCancel">Fermer</button>
      <button type="submit" class="btn primary" id="lSubmit">Se connecter</button>
    </div>
  </form>
</div>

<div id="toasts" aria-live="polite"></div>`;

  function mount(root, opts) {
    opts = opts || {};
    const disposers = [];
    const listen = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); disposers.push(() => target.removeEventListener(ev, fn, o)); };
    root.classList.add('cmap');
    root.classList.toggle('nobrand', opts.brand === false);
    root.classList.toggle('mini', !!opts.mini);
    root.innerHTML = TEMPLATE;
  const CFG = Object.assign({}, BASE_CFG, opts.config || {});
  CFG.tiles = Object.assign({}, BASE_CFG.tiles, (opts.config && opts.config.tiles) || {});
  const ICONS = window.CHAOS_ICONS || {};
  const T = CFG.tiles;
  const $ = (id) => root.querySelector('#' + id);
  const isNarrow = () => root.clientWidth <= 820;

  /* ───────────── Utilitaires ───────────── */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const HEX = /^#[0-9a-fA-F]{6}$/;

  function toast(msg, ok) {
    const el = document.createElement('div');
    el.className = 'toast' + (ok ? ' ok' : '');
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function iconSvg(name) {
    const nodes = ICONS[name] || ICONS.MapPin || [];
    const inner = nodes.map(([tag, attrs]) => '<' + tag + ' ' + Object.entries(attrs).map(([k, v]) => k + '="' + esc(v) + '"').join(' ') + '/>').join('');
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
  }

  const CATS = CFG.categories;
  const catById = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

  /* ───────────── Géométrie / CRS ─────────────
     Unités Leaflet = pixels du niveau de zoom natif le plus élevé.
     Les x / y enregistrés en base sont dans un repère de référence fixe (0 → referenceSize),
     ce qui permet de changer de source de tuiles sans toucher aux repères existants. */
  const NATIVE_MAX = T.maxNativeZoom;
  const UNITS = T.tileSize * Math.pow(2, NATIVE_MAX);
  const REF = CFG.referenceSize;
  const K = UNITS / REF;
  const CRS = L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(1 / Math.pow(2, NATIVE_MAX), 0, 1 / Math.pow(2, NATIVE_MAX), 0)
  });
  const BOUNDS = L.latLngBounds([0, 0], [UNITS, UNITS]);
  const toLL = (x, y) => L.latLng(y * K, x * K);
  const fromLL = (ll) => ({ x: clamp(ll.lng / K, 0, REF), y: clamp(ll.lat / K, 0, REF) });
  const round1 = (n) => Math.round(n * 10) / 10;

  /* ───────────── Carte ─────────────
     zoomSnap 0,5 : les tuiles ne sont jamais agrandies (au pire réduites) ;
     le zoom maximal = niveau natif le plus détaillé de la source, rien n'est inventé. */
  const map = L.map('map', {
    crs: CRS,
    minZoom: T.minNativeZoom,   // reste entier (nécessaire au regroupement) ; la vraie limite « carte entière » est limitZoom
    maxZoom: NATIVE_MAX,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 110,
    zoomControl: false,
    attributionControl: true,
    maxBounds: BOUNDS.pad(0.02),
    maxBoundsViscosity: 1.0,
    inertia: true
  });
  map.attributionControl.setPrefix(false);

  /* Zoom minimal = celui où la carte entière tient dans la zone visible (pas de vide inutile).
     On l'applique via _limitZoom plutôt que via minZoom, car le plugin de regroupement
     (markercluster) exige un minZoom entier pour afficher les repères. */
  let limitZoom = T.minNativeZoom;
  map._limitZoom = function (zoom) {
    const snap = this.options.zoomSnap;
    if (snap) zoom = Math.round(zoom / snap) * snap;
    return Math.max(limitZoom, Math.min(this.getMaxZoom(), zoom));
  };
  function fitZoom() { return Math.max(T.minNativeZoom, map.getBoundsZoom(BOUNDS, false)); }
  function updateMinZoom() { limitZoom = fitZoom(); if (map.getZoom() < limitZoom) map.setZoom(limitZoom, { animate: false }); }
  function recenter(animate) {
    limitZoom = fitZoom();
    const v = opts.initialView;
    if (v) map.setView(toLL(v.x, v.y), Math.max(limitZoom, Math.min(v.zoom, NATIVE_MAX)), { animate: !!animate });
    else map.setView(BOUNDS.getCenter(), limitZoom, { animate: !!animate });
  }
  map.setView(BOUNDS.getCenter(), 0, { animate: false });
  recenter(false);

  /* ───────────── Couche de tuiles ───────────── */
  const ERROR_TILE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#1a0b0d"/>' +
    '<path d="M0 40L40 0M0 100L100 0M0 160L160 0M0 220L220 0M36 256L256 36M96 256L256 96M156 256L256 156M216 256L256 216" stroke="#5a1c22" stroke-width="3"/>' +
    '<text x="128" y="136" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#ff8a94">Tuile indisponible</text></svg>');

  const tileUrl = (z, x, y) => (T.resolve ? T.resolve(z, x, y) : T.urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y));
  const TileClass = T.resolve ? L.TileLayer.extend({ getTileUrl: (c) => T.resolve(c.z, c.x, c.y) }) : L.TileLayer;
  const layer = new TileClass(T.resolve ? '' : T.urlTemplate, {
    tileSize: T.tileSize,
    minZoom: T.minNativeZoom,
    maxZoom: NATIVE_MAX,
    minNativeZoom: T.minNativeZoom,
    maxNativeZoom: NATIVE_MAX,
    noWrap: true,
    bounds: BOUNDS,
    keepBuffer: 4,            // garde / précharge 4 rangées de tuiles autour de l'écran
    updateWhenIdle: false,    // charge pendant le déplacement : pas de trous
    updateWhenZooming: false, // pas de requêtes inutiles pendant l'animation de zoom
    updateInterval: 120,
    errorTileUrl: ERROR_TILE,
    attribution: T.attribution
  }).addTo(map);

  const failed = new Map();
  const tkey = (c) => c.z + '/' + c.x + '-' + c.y;
  function refreshTileChip() {
    const n = failed.size, chip = $('tileChip');
    chip.hidden = n === 0;
    if (n) chip.textContent = '⚠ ' + n + (n > 1 ? ' tuiles indisponibles' : ' tuile indisponible') + ' · Réessayer';
  }
  layer.on('loading', () => $('loadbar').classList.add('on'));
  layer.on('load', () => $('loadbar').classList.remove('on'));
  layer.on('tileerror', (e) => { failed.set(tkey(e.coords), { tile: e.tile, coords: e.coords }); refreshTileChip(); });
  layer.on('tileload', (e) => { if (!/^data:image\/svg/.test(e.tile.getAttribute('src') || '')) { failed.delete(tkey(e.coords)); refreshTileChip(); } });
  layer.on('tileunload', (e) => { failed.delete(tkey(e.coords)); refreshTileChip(); });
  $('tileChip').addEventListener('click', () => {
    const items = Array.from(failed.values());
    items.forEach(({ tile, coords }) => { const u = tileUrl(coords.z, coords.x, coords.y); tile.src = /^data:/.test(u) ? u : u + '?retry=' + Date.now(); });
  });

  /* Préchargement : une rangée de tuiles autour de l'écran, en basse priorité (puis cache du navigateur) */
  const prefetched = new Set();
  let prefetchTimer = null;
  function prefetchRing() {
    const tz = clamp(Math.round(map.getZoom()), T.minNativeZoom, NATIVE_MAX);
    const nw = map.project(map.getBounds().getNorthWest(), tz), se = map.project(map.getBounds().getSouthEast(), tz);
    const n = Math.pow(2, tz), s = T.tileSize;
    const x0 = clamp(Math.floor(nw.x / s) - 1, 0, n - 1), x1 = clamp(Math.floor(se.x / s) + 1, 0, n - 1);
    const y0 = clamp(Math.floor(nw.y / s) - 1, 0, n - 1), y1 = clamp(Math.floor(se.y / s) + 1, 0, n - 1);
    let budget = 40;
    for (let x = x0; x <= x1 && budget > 0; x++) {
      for (let y = y0; y <= y1 && budget > 0; y++) {
        const url = tileUrl(tz, x, y); if (/^data:/.test(url)) continue;
        if (prefetched.has(url)) continue;
        prefetched.add(url); budget--;
        const img = new Image(); img.decoding = 'async'; if ('fetchPriority' in img) img.fetchPriority = 'low'; img.src = url;
      }
    }
    if (prefetched.size > 4000) prefetched.clear();
  }
  map.on('moveend zoomend', () => { clearTimeout(prefetchTimer); prefetchTimer = setTimeout(prefetchRing, 250); });

  /* ───────────── État ───────────── */
  const state = {
    markers: new Map(),   // id -> donnée
    shapes: new Map(),
    hiddenCats: new Set(),
    showShapes: true,
    cluster: true,
    mode: null,           // 'add' | 'draw' | 'edit-shape'
    ghost: null,
    drawHandler: null
  };
  const markerLayers = new Map();  // id -> L.Marker
  const shapeLayers = new Map();   // id -> L.Layer

  /* ───────────── Accès aux données (Supabase ou local) ───────────── */
  const SB_ON = !!(CFG.supabase && CFG.supabase.url && CFG.supabase.anonKey && window.supabase);
  const sb = SB_ON ? window.supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  const session = { user: null, role: null };
  const LOCAL_KEY = 'chaos_map_local_v2';
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || { markers: [], shapes: [] }; } catch (e) { return { markers: [], shapes: [] }; } })();
  const saveLocal = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch (e) { toast('Mémoire du navigateur pleine.'); } };

  const canWrite = () => !SB_ON ? (opts.permissions ? !!opts.permissions().write : true) : !!(session.user && CFG.rolesEcriture.indexOf(session.role) >= 0);
  const canDelete = () => !SB_ON ? (opts.permissions ? !!opts.permissions().remove : true) : !!(session.user && CFG.rolesSuppression.indexOf(session.role) >= 0);

  function explain(error) {
    if (!error) return '';
    const m = (error.message || '') + ' ' + (error.details || '');
    if (/row-level security|permission denied/i.test(m)) return 'Droits insuffisants pour cette action.';
    if (/JWT|expired|not authenticated/i.test(m)) return 'Session expirée : reconnectez-vous.';
    if (/fetch|network|Failed/i.test(m)) return 'Connexion au serveur impossible.';
    return error.message || 'Erreur inconnue.';
  }

  const MARKER_COLS = 'id,name,description,category,icon,color,x,y,created_by,created_at,updated_at';
  const SHAPE_COLS = 'id,kind,name,color,points,created_by,created_at,updated_at';

  const Data = {
    async load() {
      if (!SB_ON) {
        try { const l = JSON.parse(localStorage.getItem(LOCAL_KEY)); if (l) { local.markers = l.markers || []; local.shapes = l.shapes || []; } } catch (e) { /* ok */ }
        return { markers: local.markers.slice(), shapes: local.shapes.slice() };
      }
      const [m, s] = await Promise.all([
        sb.from('map_markers').select(MARKER_COLS).order('created_at'),
        sb.from('map_shapes').select(SHAPE_COLS).order('created_at')
      ]);
      if (m.error) throw m.error;
      if (s.error) throw s.error;
      return { markers: m.data, shapes: s.data };
    },
    async insert(table, row) {
      if (!SB_ON) {
        const now = new Date().toISOString();
        const r = Object.assign({ id: uuid(), created_at: now, updated_at: now, created_by: null }, row);
        local[table === 'map_markers' ? 'markers' : 'shapes'].push(r); saveLocal(); return r;
      }
      const { data, error } = await sb.from(table).insert(row).select(table === 'map_markers' ? MARKER_COLS : SHAPE_COLS).single();
      if (error) throw error;
      return data;
    },
    async update(table, id, patch) {
      if (!SB_ON) {
        const arr = local[table === 'map_markers' ? 'markers' : 'shapes'];
        const r = arr.find((x) => x.id === id); if (!r) throw new Error('Introuvable'); Object.assign(r, patch, { updated_at: new Date().toISOString() }); saveLocal(); return r;
      }
      const { data, error } = await sb.from(table).update(patch).eq('id', id).select(table === 'map_markers' ? MARKER_COLS : SHAPE_COLS);
      if (error) throw error;
      if (!data || !data.length) throw new Error('Droits insuffisants pour cette action.');   // RLS : 0 ligne modifiée
      return data[0];
    },
    async remove(table, id) {
      if (!SB_ON) {
        const key = table === 'map_markers' ? 'markers' : 'shapes';
        local[key] = local[key].filter((x) => x.id !== id); saveLocal(); return;
      }
      const { data, error } = await sb.from(table).delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('Droits insuffisants pour cette action.');
    }
  };

  /* ───────────── Repères sur la carte ───────────── */
  const plainGroup = L.layerGroup();
  const clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true, chunkedLoading: true, animate: false,
    iconCreateFunction: (c) => L.divIcon({ html: '<div class="cl">' + c.getChildCount() + '</div>', className: 'cl-wrap', iconSize: [38, 38] })
  });
  const shapeGroup = L.layerGroup().addTo(map);
  let activeGroup = null;

  function pinIcon(m, ghost) {
    return L.divIcon({
      className: 'pin-wrap',
      html: '<div class="pin' + (ghost ? ' ghost' : '') + '" style="--c:' + esc(HEX.test(m.color) ? m.color : '#e11d2e') + '">' + iconSvg(m.icon) + '</div>',
      iconSize: [32, 32], iconAnchor: [16, 38], popupAnchor: [0, -34]
    });
  }

  function popupContent(m) {
    const cat = catById(m.category);
    const div = document.createElement('div');
    div.className = 'pop';
    div.innerHTML =
      '<h3>' + esc(m.name) + '</h3>' +
      '<div class="cat"><span class="dot" style="--c:' + esc(HEX.test(m.color) ? m.color : '#e11d2e') + ';width:16px;height:16px">' + iconSvg(m.icon) + '</span>' + esc(cat.label) + '</div>' +
      (m.description ? '<p>' + esc(m.description) + '</p>' : '') +
      '<div class="xy">x ' + Math.round(m.x) + ' · y ' + Math.round(m.y) + '</div>' +
      '<div class="row"></div>';
    const row = div.querySelector('.row');
    const mk = (label, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm ' + (cls || ''); b.textContent = label; b.addEventListener('click', fn); row.appendChild(b); };
    mk('Copier x, y', '', () => { const t = Math.round(m.x) + ', ' + Math.round(m.y); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Coordonnées copiées.', true), () => toast(t)); });
    if (canWrite()) {
      mk('Modifier', '', () => { map.closePopup(); openMarkerModal(m); });
      mk('Déplacer', '', () => { map.closePopup(); startMove(m.id); });
    }
    if (canDelete()) mk('Supprimer', 'danger', () => { map.closePopup(); removeMarker(m.id); });
    return div;
  }

  function buildMarker(m) {
    const mk = L.marker(toLL(m.x, m.y), { icon: pinIcon(m), title: m.name, riseOnHover: true, keyboard: true });
    mk.bindPopup(() => popupContent(state.markers.get(m.id) || m), { className: 'chaos-popup', maxWidth: 300, autoPanPadding: [40, 40] });
    mk._cid = m.id;
    return mk;
  }

  function rebuildMarkers() {
    if (activeGroup) { map.removeLayer(activeGroup); activeGroup.clearLayers(); }
    markerLayers.forEach((l) => { l.off(); if (l._map) l.remove(); });   // retire aussi un repère en cours de déplacement
    markerLayers.clear();
    activeGroup = state.cluster ? clusterGroup : plainGroup;
    const list = [];
    state.markers.forEach((m) => {
      if (state.hiddenCats.has(m.category)) return;
      const mk = buildMarker(m); markerLayers.set(m.id, mk); list.push(mk);
    });
    if (state.cluster) clusterGroup.addLayers(list); else list.forEach((l) => plainGroup.addLayer(l));
    map.addLayer(activeGroup);
    renderPanel();
  }

  /* ───────────── Zones et lignes ───────────── */
  function shapeStyle(color) { return { color: HEX.test(color) ? color : '#e11d2e', weight: 3, opacity: 0.95, fillOpacity: 0.18 }; }
  function shapeLatLngs(s) { return s.points.map((p) => toLL(p[0], p[1])); }

  function buildShape(s) {
    let l;
    if (s.kind === 'rectangle' && s.points.length >= 2) l = L.rectangle(L.latLngBounds(toLL(s.points[0][0], s.points[0][1]), toLL(s.points[1][0], s.points[1][1])), shapeStyle(s.color));
    else if (s.kind === 'polygon') l = L.polygon(shapeLatLngs(s), shapeStyle(s.color));
    else l = L.polyline(shapeLatLngs(s), shapeStyle(s.color));
    if (s.name) l.bindTooltip(esc(s.name), { sticky: true });
    l._cid = s.id;
    l.on('click', (e) => { if (state.mode) return; L.DomEvent.stopPropagation(e); openShapeModal(state.shapes.get(s.id) || s); });
    return l;
  }
  function rebuildShapes() {
    shapeGroup.clearLayers(); shapeLayers.clear();
    if (!state.showShapes) return;
    state.shapes.forEach((s) => { try { const l = buildShape(s); shapeLayers.set(s.id, l); shapeGroup.addLayer(l); } catch (e) { /* forme invalide ignorée */ } });
  }
  function pointsFromLayer(l, kind) {
    if (kind === 'rectangle') { const b = l.getBounds(); const a = fromLL(b.getNorthWest()), c = fromLL(b.getSouthEast()); return [[round1(a.x), round1(a.y)], [round1(c.x), round1(c.y)]]; }
    let ll = l.getLatLngs(); if (kind === 'polygon') ll = ll[0];
    return ll.map((p) => { const c = fromLL(p); return [round1(c.x), round1(c.y)]; });
  }

  /* ───────────── Panneau : légende, filtres, liste ───────────── */
  function renderPanel() {
    const counts = {}; state.markers.forEach((m) => { counts[m.category] = (counts[m.category] || 0) + 1; });
    $('legend').innerHTML = CATS.map((c) =>
      '<li data-cat="' + esc(c.id) + '" class="' + (state.hiddenCats.has(c.id) ? 'off' : '') + '" role="checkbox" aria-checked="' + !state.hiddenCats.has(c.id) + '" tabindex="0">' +
      '<span class="dot" style="--c:' + c.color + '">' + iconSvg(c.icon) + '</span><span>' + esc(c.label) + '</span><span class="n">' + (counts[c.id] || 0) + '</span></li>').join('');

    const shown = Array.from(state.markers.values()).filter((m) => !state.hiddenCats.has(m.category)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    $('markerCount').textContent = '(' + shown.length + (shown.length !== state.markers.size ? ' / ' + state.markers.size : '') + ')';
    $('emptyMsg').hidden = shown.length > 0;
    $('markerList').innerHTML = shown.map((m) =>
      '<li data-id="' + esc(m.id) + '"><span class="dot" style="--c:' + esc(HEX.test(m.color) ? m.color : '#e11d2e') + '">' + iconSvg(m.icon) + '</span>' +
      '<span class="tx"><div class="t">' + esc(m.name) + '</div><div class="s">' + esc(catById(m.category).label) + '</div></span></li>').join('');
  }

  $('legend').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-cat]'); if (!li) return;
    const id = li.dataset.cat; state.hiddenCats.has(id) ? state.hiddenCats.delete(id) : state.hiddenCats.add(id); rebuildMarkers();
  });
  $('legend').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } });
  $('filtAll').addEventListener('click', (e) => { e.preventDefault(); state.hiddenCats.clear(); rebuildMarkers(); });
  $('filtNone').addEventListener('click', (e) => { e.preventDefault(); CATS.forEach((c) => state.hiddenCats.add(c.id)); rebuildMarkers(); });
  $('optShapes').addEventListener('change', (e) => { state.showShapes = e.target.checked; rebuildShapes(); });
  $('optCluster').addEventListener('change', (e) => { state.cluster = e.target.checked; rebuildMarkers(); });
  $('markerList').addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) focusMarker(li.dataset.id); });

  function focusMarker(id) {
    const m = state.markers.get(id); if (!m) return;
    if (state.hiddenCats.has(m.category)) { state.hiddenCats.delete(m.category); rebuildMarkers(); }
    if (isNarrow()) setPanel(false);
    map.setView(toLL(m.x, m.y), Math.max(map.getZoom(), NATIVE_MAX - 1), { animate: true });
    const open = () => { const mk = markerLayers.get(id); if (!mk) return; if (state.cluster) clusterGroup.zoomToShowLayer(mk, () => mk.openPopup()); else mk.openPopup(); };
    setTimeout(open, 350);
  }

  /* Panneau rétractable */
  function setPanel(open) {
    root.classList.toggle('collapsed', !open);
    $('panelToggle').setAttribute('aria-expanded', String(open));
    setTimeout(() => { map.invalidateSize({ pan: false }); updateMinZoom(); }, 30);
  }
  $('panelToggle').addEventListener('click', () => setPanel(root.classList.contains('collapsed')));
  if (isNarrow()) root.classList.add('collapsed');

  /* ───────────── Commandes ───────────── */
  $('zoomIn').addEventListener('click', () => map.zoomIn());
  $('zoomOut').addEventListener('click', () => map.zoomOut());
  $('recenter').addEventListener('click', () => recenter(true));
  map.on('mousemove', (e) => { const c = fromLL(e.latlng); $('cx').textContent = Math.round(c.x); $('cy').textContent = Math.round(c.y); });
  map.on('zoom', () => { $('cz').textContent = map.getZoom().toFixed(1); });
  $('cz').textContent = map.getZoom().toFixed(1);
  let resizeT;
  const onResize = () => { root.classList.toggle('narrow', isNarrow()); clearTimeout(resizeT); resizeT = setTimeout(() => { map.invalidateSize({ pan: false }); updateMinZoom(); }, 120); };
  const ro = window.ResizeObserver ? new ResizeObserver(onResize) : null;
  if (ro) { ro.observe(root); disposers.push(() => ro.disconnect()); } else listen(window, 'resize', onResize);
  root.classList.toggle('narrow', isNarrow());

  /* ───────────── Bandeau de mode ───────────── */
  let modeCancel = null;
  function setMode(mode, text, cancel) {
    state.mode = mode; modeCancel = cancel || null;
    root.classList.toggle('mode-add', mode === 'add');
    root.classList.toggle('mode-draw', mode === 'draw');
    $('modeBanner').hidden = !mode; $('modeBannerText').textContent = text || '';
    $('addMarkerBtn').classList.toggle('active', mode === 'add');
  }
  function cancelMode() {
    const f = modeCancel; modeCancel = null;
    if (state.drawHandler) { try { state.drawHandler.disable(); } catch (e) { /* ok */ } state.drawHandler = null; }
    if (state.ghost) { state.ghost.remove(); state.ghost = null; }
    setMode(null); root.querySelectorAll('[data-draw]').forEach((b) => b.classList.remove('active'));
    if (f) f();
  }
  $('modeBannerBtn').addEventListener('click', cancelMode);
  listen(document, 'keydown', (e) => { if (e.key === 'Escape' && state.mode) cancelMode(); });

  /* ───────────── Ajout d'un marqueur ───────────── */
  $('addMarkerBtn').addEventListener('click', () => {
    if (state.mode === 'add') return cancelMode();
    if (!canWrite()) return needLogin('ajouter un marqueur');
    cancelMode();
    if (isNarrow()) setPanel(false);
    setMode('add', 'Touchez ou cliquez sur la carte pour placer le marqueur');
  });
  map.on('click', (e) => {
    if (state.mode !== 'add') return;
    const c = fromLL(e.latlng);
    const draft = { x: round1(c.x), y: round1(c.y) };
    cancelMode();
    openMarkerModal(null, draft);
  });

  function needLogin(what) {
    if (SB_ON && !session.user) { toast('Connectez-vous pour ' + what + '.'); openLogin(); }
    else toast('Votre rôle ne permet pas de ' + what + '.');
  }

  /* ───────────── Formulaire marqueur ───────────── */
  let editing = null;      // marqueur existant en cours de modification
  let draftPos = null;
  let mForm = { icon: 'MapPin', color: '#e11d2e', iconTouched: false, colorTouched: false };

  function fillSelect() { $('mCat').innerHTML = CATS.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.label) + '</option>').join(''); }
  function drawPickers() {
    $('mIcons').innerHTML = CFG.icons.map((n) => '<button type="button" role="radio" data-i="' + esc(n) + '" aria-checked="' + (mForm.icon === n) + '" title="' + esc(n) + '">' + iconSvg(n) + '</button>').join('');
    drawSwatches('mColors', mForm.color);
  }
  function drawSwatches(id, current) {
    const list = CFG.colors.slice(); const custom = HEX.test(current) && list.map((c) => c.toLowerCase()).indexOf(current.toLowerCase()) < 0;
    $(id).innerHTML = list.map((c) => '<button type="button" role="radio" data-c="' + c + '" style="--c:' + c + '" aria-checked="' + (current.toLowerCase() === c.toLowerCase()) + '" aria-label="' + c + '"></button>').join('') +
      '<input type="color" value="' + (HEX.test(current) ? current : '#e11d2e') + '" aria-label="Couleur personnalisée" title="Couleur personnalisée"' + (custom ? ' style="outline:2px solid #fff;border-radius:6px"' : '') + '>';
  }
  $('mIcons').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; mForm.icon = b.dataset.i; mForm.iconTouched = true; drawPickers(); });
  $('mColors').addEventListener('click', (e) => { const b = e.target.closest('button[data-c]'); if (!b) return; mForm.color = b.dataset.c; mForm.colorTouched = true; drawPickers(); });
  $('mColors').addEventListener('input', (e) => { if (e.target.type === 'color') { mForm.color = e.target.value; mForm.colorTouched = true; drawSwatches('mColors', mForm.color); } });
  $('mCat').addEventListener('change', () => {
    const c = catById($('mCat').value);
    if (!mForm.iconTouched) mForm.icon = c.icon;
    if (!mForm.colorTouched) mForm.color = c.color;
    drawPickers();
  });

  function showErr(id, msg) { const el = $(id); el.textContent = msg || ''; el.hidden = !msg; }

  function openMarkerModal(m, pos) {
    if (!canWrite()) return needLogin('modifier les marqueurs');
    editing = m || null; draftPos = pos || null;
    fillSelect();
    const c = m ? catById(m.category) : CATS[0];
    mForm = { icon: m ? m.icon : c.icon, color: m ? m.color : c.color, iconTouched: !!m, colorTouched: !!m };
    $('markerModalTitle').textContent = m ? 'Modifier le marqueur' : 'Nouveau marqueur';
    const at = m || pos; $('markerModalSub').textContent = 'x ' + Math.round(at.x) + ' · y ' + Math.round(at.y);
    $('mName').value = m ? m.name : ''; $('mDesc').value = m ? m.description : ''; $('mCat').value = c.id;
    $('mDelete').hidden = !(m && canDelete());
    showErr('mError', ''); drawPickers();
    if (!m && pos) { state.ghost = L.marker(toLL(pos.x, pos.y), { icon: pinIcon({ icon: mForm.icon, color: mForm.color }, true), interactive: false }).addTo(map); }
    $('markerModal').hidden = false; setTimeout(() => $('mName').focus(), 30);
  }
  function closeMarkerModal() { $('markerModal').hidden = true; if (state.ghost) { state.ghost.remove(); state.ghost = null; } editing = null; draftPos = null; }
  $('mCancel').addEventListener('click', closeMarkerModal);
  $('markerModal').addEventListener('mousedown', (e) => { if (e.target === $('markerModal')) closeMarkerModal(); });
  $('mDelete').addEventListener('click', () => { const id = editing && editing.id; closeMarkerModal(); if (id) removeMarker(id); });

  $('markerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('mName').value.trim();
    if (!name) return showErr('mError', 'Le nom est obligatoire.');
    if (!HEX.test(mForm.color)) return showErr('mError', 'Couleur invalide.');
    const row = { name, description: $('mDesc').value.trim(), category: $('mCat').value, icon: mForm.icon, color: mForm.color };
    $('mSave').disabled = true;
    try {
      if (editing) { const saved = await Data.update('map_markers', editing.id, row); upsertMarker(saved); }
      else { const saved = await Data.insert('map_markers', Object.assign(row, { x: draftPos.x, y: draftPos.y })); upsertMarker(saved); }
      closeMarkerModal(); toast(editing ? 'Marqueur modifié.' : 'Marqueur ajouté.', true);
    } catch (err) { showErr('mError', explain(err)); }
    $('mSave').disabled = false;
  });

  function upsertMarker(m) { state.markers.set(m.id, m); rebuildMarkers(); }
  async function removeMarker(id) {
    const m = state.markers.get(id); if (!m) return;
    if (!canDelete()) return needLogin('supprimer un marqueur');
    if (!confirm('Supprimer le marqueur « ' + m.name + ' » ?')) return;
    try { await Data.remove('map_markers', id); state.markers.delete(id); rebuildMarkers(); toast('Marqueur supprimé.', true); }
    catch (err) { toast(explain(err)); }
  }

  /* Déplacer un marqueur (glisser-déposer) */
  function startMove(id) {
    const m = state.markers.get(id); const mk = markerLayers.get(id); if (!m || !mk) return;
    cancelMode();
    if (state.cluster) clusterGroup.removeLayer(mk); else plainGroup.removeLayer(mk);
    mk.addTo(map); mk.options.draggable = true; mk.dragging && mk.dragging.enable();
    setMode('move', 'Glissez le marqueur « ' + m.name + ' » puis relâchez', () => { mk.dragging && mk.dragging.disable(); rebuildMarkers(); });
    mk.once('dragend', async () => {
      const c = fromLL(mk.getLatLng()); const before = { x: m.x, y: m.y };
      modeCancel = null; mk.dragging.disable(); setMode(null);
      try { const saved = await Data.update('map_markers', id, { x: round1(c.x), y: round1(c.y) }); upsertMarker(saved); toast('Marqueur déplacé.', true); }
      catch (err) { toast(explain(err)); state.markers.set(id, Object.assign(m, before)); rebuildMarkers(); }
    });
  }

  /* ───────────── Dessin de zones / lignes ───────────── */
  L.drawLocal.draw.handlers.polyline.tooltip = { start: 'Cliquez pour commencer la ligne', cont: 'Cliquez pour continuer', end: 'Cliquez sur le dernier point pour terminer' };
  L.drawLocal.draw.handlers.polygon.tooltip = { start: 'Cliquez pour commencer la zone', cont: 'Cliquez pour continuer', end: 'Cliquez sur le premier point pour fermer la zone' };
  L.drawLocal.draw.handlers.rectangle.tooltip = { start: 'Cliquez et glissez pour dessiner' };
  L.drawLocal.draw.handlers.simpleshape.tooltip = { end: 'Relâchez pour terminer' };

  root.querySelectorAll('[data-draw]').forEach((btn) => btn.addEventListener('click', () => {
    const kind = btn.dataset.draw;
    if (state.mode === 'draw' && btn.classList.contains('active')) return cancelMode();
    if (!canWrite()) return needLogin('dessiner');
    cancelMode(); btn.classList.add('active');
    if (isNarrow()) setPanel(false);
    const opt = { shapeOptions: shapeStyle('#e11d2e'), showLength: false, metric: false, feet: false, showArea: false };
    const H = kind === 'polyline' ? L.Draw.Polyline : kind === 'polygon' ? L.Draw.Polygon : L.Draw.Rectangle;
    state.drawHandler = new H(map, opt); state.drawHandler.enable();
    setMode('draw', kind === 'polyline' ? 'Tracez la ligne sur la carte' : kind === 'polygon' ? 'Dessinez la zone sur la carte' : 'Dessinez le rectangle sur la carte');
    state.drawKind = kind;
  }));

  map.on(L.Draw.Event.CREATED, async (e) => {
    const kind = state.drawKind; const layerNew = e.layer; cancelMode();
    try {
      const saved = await Data.insert('map_shapes', { kind, name: '', color: '#e11d2e', points: pointsFromLayer(layerNew, kind) });
      state.shapes.set(saved.id, saved); rebuildShapes(); toast('Forme enregistrée. Cliquez dessus pour la nommer.', true);
    } catch (err) { toast(explain(err)); }
  });

  let editingShape = null; let sColor = '#e11d2e';
  function openShapeModal(s) {
    editingShape = s; sColor = s.color;
    $('shapeModalTitle').textContent = s.kind === 'polyline' ? 'Ligne' : s.kind === 'polygon' ? 'Zone' : 'Rectangle';
    $('sName').value = s.name || ''; $('sName').disabled = !canWrite();
    drawSwatches('sColors', sColor);
    $('sDelete').hidden = !canDelete(); $('sGeom').hidden = !canWrite();
    showErr('sError', ''); $('shapeModal').hidden = false;
  }
  const closeShapeModal = () => { $('shapeModal').hidden = true; editingShape = null; };
  $('sCancel').addEventListener('click', closeShapeModal);
  $('shapeModal').addEventListener('mousedown', (e) => { if (e.target === $('shapeModal')) closeShapeModal(); });
  $('sColors').addEventListener('click', (e) => { const b = e.target.closest('button[data-c]'); if (b) { sColor = b.dataset.c; drawSwatches('sColors', sColor); } });
  $('sColors').addEventListener('input', (e) => { if (e.target.type === 'color') { sColor = e.target.value; drawSwatches('sColors', sColor); } });
  $('shapeForm').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!editingShape) return;
    if (!canWrite()) return showErr('sError', 'Droits insuffisants pour cette action.');
    try { const saved = await Data.update('map_shapes', editingShape.id, { name: $('sName').value.trim(), color: sColor }); state.shapes.set(saved.id, saved); rebuildShapes(); closeShapeModal(); toast('Forme modifiée.', true); }
    catch (err) { showErr('sError', explain(err)); }
  });
  $('sDelete').addEventListener('click', async () => {
    if (!editingShape || !confirm('Supprimer cette forme ?')) return;
    const id = editingShape.id;
    try { await Data.remove('map_shapes', id); state.shapes.delete(id); rebuildShapes(); closeShapeModal(); toast('Forme supprimée.', true); }
    catch (err) { showErr('sError', explain(err)); }
  });
  $('sGeom').addEventListener('click', () => {
    const s = editingShape; const l = s && shapeLayers.get(s.id); closeShapeModal(); if (!l || !l.editing) return;
    cancelMode(); l.editing.enable();
    const btn = $('modeBannerBtn');
    const cleanup = () => { btn.removeEventListener('click', finish, true); btn.textContent = 'Annuler'; };
    const finish = async () => {
      modeCancel = null; cleanup(); l.editing.disable();
      const pts = pointsFromLayer(l, s.kind); setMode(null);
      try { const saved = await Data.update('map_shapes', s.id, { points: pts }); state.shapes.set(saved.id, saved); toast('Forme modifiée.', true); }
      catch (err) { toast(explain(err)); }
      rebuildShapes();
    };
    setMode('edit-shape', 'Déplacez les points de la forme, puis validez', () => { l.editing.disable(); cleanup(); rebuildShapes(); });
    btn.textContent = 'Terminer'; btn.addEventListener('click', finish, true);
  });

  /* ───────────── Recherche ───────────── */
  let results = []; let selIdx = -1;
  function runSearch() {
    const q = norm($('searchInput').value.trim()); const box = $('searchResults');
    if (!q) { box.hidden = true; results = []; return; }
    results = [];
    const mxy = q.match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
    if (mxy) { const x = parseFloat(mxy[1].replace(',', '.')), y = parseFloat(mxy[2].replace(',', '.')); if (x >= 0 && x <= REF && y >= 0 && y <= REF) results.push({ type: 'xy', x, y, title: 'Aller à x ' + Math.round(x) + ', y ' + Math.round(y), sub: 'Coordonnées' }); }
    state.markers.forEach((m) => { const hay = norm(m.name + ' ' + m.description + ' ' + catById(m.category).label); if (hay.indexOf(q) >= 0) results.push({ type: 'marker', id: m.id, m, title: m.name, sub: catById(m.category).label }); });
    state.shapes.forEach((s) => { if (s.name && norm(s.name).indexOf(q) >= 0) results.push({ type: 'shape', id: s.id, title: s.name, sub: s.kind === 'polyline' ? 'Ligne' : 'Zone' }); });
    results = results.slice(0, 8); selIdx = results.length ? 0 : -1;
    box.innerHTML = results.length ? results.map((r, i) => '<li data-i="' + i + '" class="' + (i === 0 ? 'sel' : '') + '">' + (r.m ? '<span class="dot" style="--c:' + esc(HEX.test(r.m.color) ? r.m.color : '#e11d2e') + '">' + iconSvg(r.m.icon) + '</span>' : '') + '<span><div class="t">' + esc(r.title) + '</div><div class="s">' + esc(r.sub) + '</div></span></li>').join('') : '<li class="none">Aucun résultat</li>';
    box.hidden = false;
  }
  function chooseResult(i) {
    const r = results[i]; if (!r) return;
    $('searchResults').hidden = true; $('searchInput').blur();
    if (r.type === 'marker') focusMarker(r.id);
    else if (r.type === 'xy') map.setView(toLL(r.x, r.y), Math.max(map.getZoom(), NATIVE_MAX - 1));
    else { const l = shapeLayers.get(r.id); if (l) map.fitBounds(l.getBounds().pad(0.4), { maxZoom: NATIVE_MAX }); }
  }
  $('searchInput').addEventListener('input', runSearch);
  $('searchInput').addEventListener('focus', runSearch);
  $('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); chooseResult(Math.max(selIdx, 0)); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!results.length) return; selIdx = (selIdx + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      Array.from($('searchResults').children).forEach((li, i) => li.classList.toggle('sel', i === selIdx));
    } else if (e.key === 'Escape') { $('searchResults').hidden = true; $('searchInput').blur(); }
  });
  $('searchResults').addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); chooseResult(+li.dataset.i); } });
  listen(document, 'click', (e) => { if (!e.target.closest('#searchbox')) $('searchResults').hidden = true; });

  /* ───────────── Connexion (Supabase Auth) ───────────── */
  const emailFor = (ident) => ident.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-') + '@' + CFG.authDomain;
  function openLogin() { if (!SB_ON) return; showErr('lError', ''); $('loginModal').hidden = false; setTimeout(() => $('lId').focus(), 30); }
  $('lCancel').addEventListener('click', () => { $('loginModal').hidden = true; });
  $('authBtn').addEventListener('click', async () => {
    if (session.user) { await sb.auth.signOut(); } else openLogin();
  });
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('lSubmit').disabled = true; showErr('lError', '');
    const { error } = await sb.auth.signInWithPassword({ email: emailFor($('lId').value), password: $('lPw').value });
    $('lSubmit').disabled = false;
    if (error) return showErr('lError', /invalid/i.test(error.message) ? 'Identifiant ou mot de passe incorrect.' : explain(error));
    $('lPw').value = ''; $('loginModal').hidden = true;
  });

  function setSync(kind, text) { const c = $('syncChip'); c.hidden = !kind; c.className = 'chip ' + (kind || ''); c.textContent = text || ''; }
  function refreshWho() {
    if (!SB_ON) { $('whoami').textContent = 'Mode local — non partagé'; $('authBtn').hidden = true; setSync('off', 'Mode local (non partagé)'); }
    else if (session.user) { $('whoami').textContent = (session.ident || 'Connecté') + ' · ' + (session.role || 'sans rôle'); $('authBtn').hidden = false; $('authBtn').textContent = 'Déconnexion'; }
    else { $('whoami').textContent = 'Non connecté'; $('authBtn').hidden = false; $('authBtn').textContent = 'Connexion'; setSync('off', 'Hors ligne'); }
    $('addMarkerBtn').disabled = SB_ON && !!session.user && !canWrite();
    $('drawGroup').hidden = SB_ON && session.user && !canWrite();
  }

  /* ───────────── Chargement + temps réel ───────────── */
  let channel = null;
  async function loadAll() {
    try {
      const d = await Data.load();
      state.markers = new Map(d.markers.map((m) => [m.id, m]));
      state.shapes = new Map(d.shapes.map((s) => [s.id, s]));
      rebuildMarkers(); rebuildShapes();
      if (SB_ON) setSync('ok', 'Synchronisé en direct');
    } catch (err) { setSync('warn', 'Synchronisation impossible'); toast(explain(err)); }
  }
  function subscribe() {
    unsubscribe();
    channel = sb.channel('chaos-carte');
    const apply = (table, store, rebuild) => (p) => {
      if (p.eventType === 'DELETE') store.delete(p.old.id); else store.set(p.new.id, p.new);
      rebuild();
    };
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, apply('map_markers', state.markers, rebuildMarkers))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_shapes' }, apply('map_shapes', state.shapes, rebuildShapes))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSync('ok', 'Synchronisé en direct');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSync('warn', 'Temps réel interrompu');
        else if (status === 'CLOSED') setSync('off', 'Hors ligne');
      });
  }
  function unsubscribe() { if (channel) { sb.removeChannel(channel); channel = null; } }

  async function onSession(s) {
    session.user = s ? s.user : null; session.role = null; session.ident = null;
    if (session.user) {
      const { data } = await sb.from('profiles').select('role,identifiant').eq('id', session.user.id).maybeSingle();
      session.role = data && data.role; session.ident = (data && data.identifiant) || (session.user.email || '').split('@')[0];
      refreshWho(); await loadAll(); subscribe();
    } else {
      unsubscribe(); state.markers.clear(); state.shapes.clear(); rebuildMarkers(); rebuildShapes(); refreshWho();
    }
  }

  async function init() {
    fillSelect(); renderPanel(); refreshWho();
    if (!SB_ON) {
      if (CFG.supabase && CFG.supabase.url && !window.supabase) toast('Bibliothèque Supabase introuvable : mode local.');
      await loadAll(); return;
    }
    sb.auth.onAuthStateChange((evt, s) => {
      if (evt === 'SIGNED_IN' && s && session.user && s.user.id === session.user.id) return;   // simple retour sur l'onglet
      if (evt === 'INITIAL_SESSION' || evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') setTimeout(() => onSession(s), 0);
    });
    const { data } = await sb.auth.getSession();
    if (!data.session) openLogin();
    listen(document, 'visibilitychange', () => { if (!document.hidden && session.user) loadAll(); });
    listen(window, 'online', () => { if (session.user) { loadAll(); subscribe(); } });
  }
  init();


    /* Accès de test et API */
    window.__chaosMap = { map, layer, state, failed, toLL, fromLL, UNITS, REF, K, recenter, clusterGroup, plainGroup, markerLayers, getLimitZoom: () => limitZoom };
    return {
      map,
      invalidate() { map.invalidateSize({ pan: false }); updateMinZoom(); },
      reload() { return loadAll(); },
      destroy() { disposers.forEach((f) => { try { f(); } catch (e) { /* ok */ } }); try { unsubscribe(); } catch (e) { /* ok */ } map.remove(); root.innerHTML = ''; root.classList.remove('cmap'); }
    };
  }

  window.ChaosMap = { mount };
})();
