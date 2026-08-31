document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'ALLAIN2MARIE_PRODUCTS';

  // ==========================================
  // 0. SECURITY & AUTHENTICATION GUARD
  // ==========================================
  
  // Helper format FCFA
  function formatFCFA(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  // ==========================================
  // 1. DATA INITIALIZATION & LOCALSTORAGE
  // ==========================================
  function loadProducts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing products localStorage', e);
      return [];
    }
  }

  function productImageSrc(p, slot) {
    if (!p) return '';
    if (p.images && p.images[slot]) return p.images[slot];
    if (slot === 'front') return p.frontImage || '';
    if (slot === 'back') return p.backImage || '';
    return '';
  }

  function saveProducts(newProducts = null) {
    if (Array.isArray(newProducts)) {
      products = newProducts;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (err) {
      console.warn('LocalStorage quota warning, saving light payload:', err);
      try {
        const light = products.map(p => ({
          ...p,
          images: {
            front: p.images?.front ? p.images.front.slice(0, 300000) : '',
            back: p.images?.back ? p.images.back.slice(0, 300000) : ''
          }
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
      } catch (e2) {
        console.error('LocalStorage save error:', e2);
      }
    }
    renderCatalog();
    updateMetrics();
  }

  // ==========================================
  // 2. TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  // DOM Elements
  const tabPanes = document.querySelectorAll('.tab-pane');
  const topAddProductBtn = document.getElementById('topAddProductBtn');
  const catalogAddBtn = document.getElementById('catalogAddBtn');
  const emptyAddProductBtn = document.getElementById('emptyAddProductBtn');
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  const metricActiveCount = document.getElementById('metricActiveCount');
  const metricTotalStock = document.getElementById('metricTotalStock');
  const metricCatalogOrders = document.getElementById('metricCatalogOrders');
  const productsTableBody = document.getElementById('productsTableBody');
  const emptyCatalogState = document.getElementById('emptyCatalogState');
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const productForm = document.getElementById('productForm');
  const formTitle = document.getElementById('formTitle');
  const editProductId = document.getElementById('editProductId');
  const productTitle = document.getElementById('productTitle');
  const productSku = document.getElementById('productSku');
  const productCategory = document.getElementById('productCategory');
  const productPrice = document.getElementById('productPrice');
  const saveProductBtn = document.getElementById('saveProductBtn');
  const sizeCheckboxes = document.querySelectorAll('.size-checkbox');
  const sizeQtyInputs = document.querySelectorAll('.size-qty-input');
  const imageSlots = document.querySelectorAll('.admin-image-slot');
  const confirmModal = document.getElementById('confirmModal');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Collections elements (déclarés ici pour éviter l'erreur before initialization)
  let collectionsTableBody = null;
  let openAddCollectionModalBtn = null;
  let manageCollectionsQuickBtn = null;
  let addNewCollectionQuickBtn = null;
  let collectionModal = null;
  let closeCollectionModalBtn = null;
  let cancelCollectionModalBtn = null;
  let collectionForm = null;
  let collectionModalTitle = null;
  let editCollectionId = null;
  let colNameInput = null;
  let colCodeInput = null;
  let colDescInput = null;

  // Orders metrics elements (déclarés ici pour éviter l'erreur before initialization)
  let metricTotalOrders = null;
  let metricTotalSales = null;
  let metricPendingDeliveries = null;
  let ordersTableBody = null;
  let emptyOrdersState = null;
  let ordersCountBadge = null;
  let refreshOrdersBtn = null;

  function initOrdersElements() {
    ordersTableBody = document.getElementById('ordersTableBody');
    emptyOrdersState = document.getElementById('emptyOrdersState');
    metricTotalOrders = document.getElementById('metricTotalOrders');
    metricTotalSales = document.getElementById('metricTotalSales');
    metricPendingDeliveries = document.getElementById('metricPendingDeliveries');
    ordersCountBadge = document.getElementById('ordersCountBadge');
    refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
  }

  // State
  let products = loadProducts();
  let collections = typeof dbGetLocalCollections === 'function' ? dbGetLocalCollections() : [];
  let currentImages = {
    front: '',
    back: ''
  };

  // Placeholder functions (to be implemented properly)
  function renderCatalog() {
    console.log(' Rendu du catalogue...');
    // Implementation simplifiée pour éviter les erreurs
    if (productsTableBody) {
      productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">Chargement...</td></tr>';
    }
  }

  function updateMetrics() {
    console.log(' Mise à jour des métriques...');
    // Implementation simplifiée
    if (metricActiveCount) metricActiveCount.textContent = products.length;
    if (metricTotalStock) metricTotalStock.textContent = '0';
    if (metricCatalogOrders) metricCatalogOrders.textContent = '0';
  }

  // ==========================================
  // SECURITY CHECK
  // ==========================================

  // Attendre que Firebase Auth soit initialisé avant de vérifier l'accès
  function checkAdminAccess() {
    return new Promise((resolve) => {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error(' Firebase Auth non disponible - Accès refusé');
        resolve(false);
        return;
      }

      // Attendre que Firebase ait fini d'initialiser et restauré la session
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        // Si pas d'utilisateur, on attend la prochaine tentative (Firebase peut prendre du temps)
        if (!user || !user.email) {
          console.warn(' Firebase encore en cours d\'initialisation, attente...');
          return; // On NE résout PAS, on attend le prochain événement
        }

        // Un utilisateur est présent, on peut prendre une décision
        unsubscribe();

        // Vérification stricte via liste des admins
        if (typeof dbIsAdminUser === 'function' && dbIsAdminUser(user.email)) {
          console.log(' Accès admin autorisé pour:', user.email);
          resolve(true);
        } else {
          console.warn(' Accès refusé: email non autorisé:', user.email);
          firebase.auth().signOut();
          resolve(false);
        }
      });

      // Timeout de sécurité après 5 secondes pour éviter d'attendre indéfiniment
      setTimeout(() => {
        unsubscribe();
        const user = firebase.auth().currentUser;
        if (!user || !user.email) {
          console.warn(' Timeout: pas d\'utilisateur après 5 secondes');
          resolve(false);
        }
      }, 5000);
    });
  }

  // Vérification asynchrone de l'accès admin
  checkAdminAccess().then(hasAccess => {
    if (!hasAccess) {
      console.log(' Redirection vers login.html');
      window.location.href = 'login.html';
      return;
    }

    console.log(' Accès admin confirmé, chargement de l\'interface...');
    initAdminInterface();
  });

  // Fonction d'initialisation de l'interface admin (appelée après authentification réussie)
  function initAdminInterface() {
    console.log(' Initialisation de l\'interface admin...');

    // Initialiser les éléments des commandes
    initOrdersElements();

    // Initialiser la gestion des collections
    initCollectionsManagement();
    
    // Display Logged-in User Profile from Firebase Auth
    const adminUserPill = document.getElementById('adminUserPill');
    const adminUserPhoto = document.getElementById('adminUserPhoto');
    const adminUserName = document.getElementById('adminUserName');

    if (typeof firebase !== 'undefined' && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user && adminUserPill) {
        adminUserPill.style.display = 'inline-flex';
        
        const displayName = user.displayName || user.email || 'Administrateur';
        if (adminUserName) adminUserName.textContent = displayName;
        
        if (adminUserPhoto && user.photoURL) {
          adminUserPhoto.src = user.photoURL;
          adminUserPhoto.style.display = 'block';
        }
      }
    }
    
    // Initialiser l'interface principale
    renderCatalog();
    updateMetrics();
  }

  // Logout Handler (défini globalement pour être toujours disponible)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log(' Déconnexion admin en cours...');
      
      // Déconnexion Firebase
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          await firebase.auth().signOut();
          console.log(' Firebase Auth déconnecté');
        } catch (e) {
          console.error(' Erreur lors de la déconnexion Firebase:', e);
        }
      }
      
      // Nettoyage complet du stockage local (fallback)
      sessionStorage.removeItem('ALLAIN2MARIE_AUTH');
      sessionStorage.removeItem('ALLAIN2MARIE_USER');
      sessionStorage.removeItem('ALLAIN2MARIE_USER_PHOTO');
      sessionStorage.removeItem('ALLAIN2MARIE_USER_NAME');
      sessionStorage.removeItem('ALLAIN2MARIE_USER_EMAIL');
      localStorage.removeItem('ALLAIN2MARIE_AUTH');
      localStorage.removeItem('ALLAIN2MARIE_USER');
      localStorage.removeItem('ALLAIN2MARIE_USER_PHOTO');
      localStorage.removeItem('ALLAIN2MARIE_USER_NAME');
      localStorage.removeItem('ALLAIN2MARIE_USER_EMAIL');
      
      window.location.href = 'login.html';
    });
  } else {
    console.warn(' Bouton de déconnexion non trouvé dans le DOM');
  }

  // Helper format FCFA
  function formatFCFA(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  // ==========================================
  // 1. DATA INITIALIZATION & LOCALSTORAGE
  // ==========================================
  function loadProducts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing products localStorage', e);
      return [];
    }
  }

  function productImageSrc(p, slot) {
    if (!p) return '';
    if (p.images && p.images[slot]) return p.images[slot];
    if (slot === 'front') return p.frontImage || '';
    if (slot === 'back') return p.backImage || '';
    return '';
  }

  function saveProducts(newProducts = null) {
    if (Array.isArray(newProducts)) {
      products = newProducts;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (err) {
      console.warn('LocalStorage quota warning, saving light payload:', err);
      try {
        const light = products.map(p => ({
          ...p,
          images: {
            front: p.images?.front ? p.images.front.slice(0, 300000) : '',
            back: p.images?.back ? p.images.back.slice(0, 300000) : ''
          }
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
      } catch (e2) {
        console.error('LocalStorage save error:', e2);
      }
    }
    renderCatalog();
    updateMetrics();
  }

  // ==========================================
  // 2. TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  // ==========================================
  // 3. TABS NAVIGATION
  // ==========================================
  const tabNavCatalog = document.getElementById('tabNavCatalog');
  const tabNavOrders = document.getElementById('tabNavOrders');
  const tabNavCollections = document.getElementById('tabNavCollections');
  const tabNavPromos = document.getElementById('tabNavPromos');
  const tabNavAddProduct = document.getElementById('tabNavAddProduct');

  function switchTab(tabId) {
    // Sauvegarder la tab active
    sessionStorage.setItem('ALLAIN2MARIE_ADMIN_ACTIVE_TAB', tabId);

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabNavCatalog) {
      tabNavCatalog.className = tabId === 'catalog-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavOrders) {
      tabNavOrders.className = tabId === 'orders-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavCollections) {
      tabNavCollections.className = tabId === 'collections-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavPromos) {
      tabNavPromos.className = tabId === 'promos-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }

    if (tabId === 'catalog-tab') {
      renderCatalog();
      updateMetrics();
    } else if (tabId === 'orders-tab') {
      renderOrders();
    } else if (tabId === 'collections-tab') {
      renderCollectionsTable();
    } else if (tabId === 'promos-tab') {
      loadPromos();
    }
  }

  if (tabNavCatalog) tabNavCatalog.addEventListener('click', () => switchTab('catalog-tab'));
  if (tabNavOrders) tabNavOrders.addEventListener('click', () => switchTab('orders-tab'));
  if (tabNavCollections) tabNavCollections.addEventListener('click', () => switchTab('collections-tab'));
  if (tabNavPromos) tabNavPromos.addEventListener('click', () => switchTab('promos-tab'));

  // Restaurer la tab active après chargement (immédiatement pour éviter le flash)
  const savedTab = sessionStorage.getItem('ALLAIN2MARIE_ADMIN_ACTIVE_TAB');
  if (savedTab) {
    // Appliquer directement les classes sans appel switchTab pour éviter le flash
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === savedTab);
    });

    if (tabNavCatalog) {
      tabNavCatalog.className = savedTab === 'catalog-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavOrders) {
      tabNavOrders.className = savedTab === 'orders-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavCollections) {
      tabNavCollections.className = savedTab === 'collections-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavPromos) {
      tabNavPromos.className = savedTab === 'promos-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }
    if (tabNavAddProduct) {
      tabNavAddProduct.className = savedTab === 'add-product-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }

    // Charger les données de l'onglet restauré
    if (savedTab === 'catalog-tab') {
      renderCatalog();
      updateMetrics();
    } else if (savedTab === 'orders-tab') {
      renderOrders();
    } else if (savedTab === 'collections-tab') {
      // Attendre que les éléments soient initialisés
      if (collectionsTableBody) {
        renderCollectionsTable();
      }
    } else if (savedTab === 'promos-tab') {
      loadPromos();
    }
  }

  if (topAddProductBtn) topAddProductBtn.addEventListener('click', () => resetAndOpenForm());
  if (catalogAddBtn) catalogAddBtn.addEventListener('click', () => resetAndOpenForm());
  if (emptyAddProductBtn) emptyAddProductBtn.addEventListener('click', () => resetAndOpenForm());
  if (cancelFormBtn) cancelFormBtn.addEventListener('click', () => switchTab('catalog-tab'));

  // Bouton Sync Firebase — force la synchronisation de tous les produits locaux
  const syncFirebaseBtn = document.getElementById('syncFirebaseBtn');
  if (syncFirebaseBtn) {
    syncFirebaseBtn.addEventListener('click', async () => {
      if (typeof dbSaveProduct !== 'function') {
        showToast(' Firebase non connecté', 'error');
        return;
      }
      if (products.length === 0) {
        showToast('Aucun produit à synchroniser');
        return;
      }
      syncFirebaseBtn.disabled = true;
      syncFirebaseBtn.textContent = ' Sync...';
      let synced = 0, skipped = 0;
      for (const p of products) {
        try {
          const saved = await dbSaveProduct(p);
          const idx = products.findIndex(item => item.id === p.id);
          if (idx !== -1 && saved) products[idx] = saved;
          synced++;
        } catch (e) {
          console.error('Erreur sync:', p.title, e);
          skipped++;
        }
      }
      saveProducts(products);
      syncFirebaseBtn.disabled = false;
      syncFirebaseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg><span class="btn-label-desktop">Sync Firebase</span>';
      if (skipped > 0) {
        showToast(` ${synced} sync OK, ${skipped} trop lourds (re-editez les images)`, 'warning');
      } else {
        showToast(` ${synced} produit(s) synchronisé(s) sur Firebase !`);
      }
    });
  }

  // ==========================================
  // 4. METRICS CALCULATION
  // ==========================================
  function updateMetrics() {
    const activeProducts = products.filter(p => p.status === 'published');
    if (metricActiveCount) metricActiveCount.textContent = activeProducts.length;

    let totalStock = 0;

    products.forEach(p => {
      if (p.sizes) {
        Object.values(p.sizes).forEach(val => {
          const qty = typeof val === 'object' && val !== null ? (Number(val.qty) || 0) : (Number(val) || 0);
          totalStock += qty;
        });
      }
    });

    if (metricTotalStock) metricTotalStock.textContent = totalStock;
    
    // Total orders count
    const orders = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
    if (metricCatalogOrders) metricCatalogOrders.textContent = orders.length;
  }

  // ==========================================
  // 5. CATALOG TABLE RENDERING
  // ==========================================
  function renderCatalog() {
    const searchTerm = catalogSearchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filtered = products.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm));
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });

    productsTableBody.innerHTML = '';

    if (filtered.length === 0) {
      emptyCatalogState.style.display = 'flex';
      productsTableBody.parentElement.style.display = 'none';
      return;
    }

    emptyCatalogState.style.display = 'none';
    productsTableBody.parentElement.style.display = 'table';

    filtered.forEach(p => {
      const tr = document.createElement('tr');

      // Product thumbnail
      const thumbSrc = productImageSrc(p, 'front') || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="%2394a3b8"><rect width="24" height="24" rx="4" fill="%23f1f5f9"/><path d="M12 5c1 0 1.5.5 1.5 1.5h3v3h-1.5v6H9v-6H7.5v-3h3C10.5 5.5 11 5 12 5z"/></svg>';

      // Sizes chips with quantities and specific prices
      let sizesHtml = '';
      if (p.sizes) {
        sizesHtml = '<div class="stock-chips-wrap">';
        Object.entries(p.sizes).forEach(([size, val]) => {
          const qty = typeof val === 'object' && val !== null ? (Number(val.qty) || 0) : (Number(val) || 0);
          const price = typeof val === 'object' && val !== null && val.price ? val.price : p.price;
          const isOut = qty <= 0;
          const priceTag = price && price !== p.price ? ` (${formatFCFA(price)})` : '';
          sizesHtml += `<span class="stock-chip ${isOut ? 'out' : ''}" title="${size}: ${qty} pièces">${size}: ${qty}${priceTag}</span>`;
        });
        sizesHtml += '</div>';
      }

      // Status badge
      let statusClass = 'published';
      let statusLabel = 'Publié';
      if (p.status === 'draft') {
        statusClass = 'draft';
        statusLabel = 'Brouillon';
      } else if (p.status === 'soldout') {
        statusClass = 'soldout';
        statusLabel = 'Rupture';
      }

      tr.innerHTML = `
        <td class="product-thumb-cell">
          <img src="${thumbSrc}" alt="${p.title}" class="product-thumb-img">
        </td>
        <td>
          <div class="product-title-cell">${p.title}</div>
          <div class="product-sku-sub">${p.sku || 'Sans référence'}</div>
        </td>
        <td>
          <span class="card-badge">${p.category || 'Général'}</span>
        </td>
        <td>
          <span class="product-price-cell">${formatFCFA(p.price)}</span>
          ${p.comparePrice ? `<span class="product-old-price">${formatFCFA(p.comparePrice)}</span>` : ''}
        </td>
        <td>${sizesHtml}</td>
        <td>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon-only edit-product-btn" data-id="${p.id}" title="Modifier ce T-shirt">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon-only btn-icon-danger delete-product-btn" data-id="${p.id}" title="Supprimer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      productsTableBody.appendChild(tr);
    });

    // Attach row events
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditForm(btn.dataset.id));
    });

    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', () => askDeleteProduct(btn.dataset.id));
    });
  }

  // Filter events
  catalogSearchInput.addEventListener('input', renderCatalog);
  categoryFilter.addEventListener('change', renderCatalog);

  // ==========================================
  // 6. LIENS LUNACY (aucun fichier stocké)
  // ==========================================
  function normalizeImageLink(raw) {
    if (!raw) return '';
    let url = String(raw).trim().replace(/^["']|["']$/g, '');
    const markdown = url.match(/\((https?:\/\/[^)\s]+)\)/);
    if (markdown) url = markdown[1];
    return url;
  }

  function isHttpImageLink(value) {
    return /^https?:\/\//i.test(normalizeImageLink(value));
  }

  imageSlots.forEach(slot => {
    const slotType = slot.dataset.slot;
    const urlInput = slot.querySelector('.slot-url-input');
    const emptyView = slot.querySelector('.slot-empty');
    const previewView = slot.querySelector('.slot-preview');
    const previewImg = slot.querySelector('.slot-preview img');
    const removeBtn = slot.querySelector('.slot-remove-btn');

    const applyLink = (raw) => {
      const url = normalizeImageLink(raw);
      if (urlInput && urlInput.value !== raw && urlInput.value !== url) {
        urlInput.value = url;
      }
      if (!url) {
        currentImages[slotType] = '';
        if (previewImg) previewImg.src = '';
        if (previewView) previewView.style.display = 'none';
        if (emptyView) emptyView.style.display = 'flex';
        return;
      }
      currentImages[slotType] = url;
      if (previewImg) {
        previewImg.referrerPolicy = 'no-referrer';
        previewImg.src = url;
      }
      if (emptyView) emptyView.style.display = 'none';
      if (previewView) previewView.style.display = 'flex';
    };

    if (urlInput) {
      urlInput.addEventListener('input', () => applyLink(urlInput.value));
      urlInput.addEventListener('paste', () => {
        setTimeout(() => applyLink(urlInput.value), 0);
      });
    }

    if (previewImg) {
      previewImg.addEventListener('error', () => {
        if (!currentImages[slotType]) return;
        showToast('Ce lien ne s’affiche pas. Exportez l’image Lunacy et copiez le lien direct (https).', 'error');
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (urlInput) urlInput.value = '';
        applyLink('');
      });
    }
  });

  function setSlotImage(slotType, src) {
    const slot = document.querySelector(`.admin-image-slot[data-slot="${slotType}"]`);
    if (!slot) return;
    const urlInput = slot.querySelector('.slot-url-input');
    const emptyView = slot.querySelector('.slot-empty');
    const previewView = slot.querySelector('.slot-preview');
    const previewImg = slot.querySelector('.slot-preview img');
    const url = isHttpImageLink(src) ? normalizeImageLink(src) : '';

    currentImages[slotType] = url;
    if (urlInput) urlInput.value = url;

    if (url) {
      if (previewImg) {
        previewImg.referrerPolicy = 'no-referrer';
        previewImg.src = url;
      }
      if (emptyView) emptyView.style.display = 'none';
      if (previewView) previewView.style.display = 'flex';
    } else {
      if (previewImg) previewImg.src = '';
      if (previewView) previewView.style.display = 'none';
      if (emptyView) emptyView.style.display = 'flex';
    }
  }

  // ==========================================
  // 7. SIZES MATRIX CHECKBOXES & PRICES
  // ==========================================
  sizeCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const size = cb.dataset.size;
      const qtyInput = document.querySelector(`.size-qty-input[data-size="${size}"]`);
      const priceInput = document.querySelector(`.size-price-input[data-size="${size}"]`);
      
      if (qtyInput) {
        qtyInput.disabled = !cb.checked;
        if (!cb.checked) {
          qtyInput.value = '0';
        } else if (Number(qtyInput.value) <= 0) {
          qtyInput.value = '1';
        }
      }

      if (priceInput) {
        priceInput.disabled = !cb.checked;
        if (cb.checked && !priceInput.value && productPrice.value) {
          priceInput.value = productPrice.value;
        }
      }
    });
  });

  // Prefill size prices if empty when main price changes
  if (productPrice) {
    console.log('productPrice trouvé, attachment event listener');
    productPrice.addEventListener('input', () => {
      const baseVal = productPrice.value;
      if (!baseVal) return;
      console.log('Modification prix de base:', baseVal);
      const sizeInputs = document.querySelectorAll('.size-price-input');
      console.log('Nombre de size-price-input trouvés:', sizeInputs.length);
      sizeInputs.forEach(pi => {
        // Mettre à jour si le champ n'a pas été modifié manuellement
        if (!pi.dataset.manuallyModified) {
          pi.value = baseVal;
          console.log('Prix taille mis à jour:', pi.dataset.size, baseVal);
        } else {
          console.log('Prix taille non modifié (manuel):', pi.dataset.size, pi.value);
        }
      });
    });

    // Marquer comme modifié manuellement quand l'utilisateur change un prix de taille
    document.querySelectorAll('.size-price-input').forEach(pi => {
      pi.addEventListener('input', () => {
        pi.dataset.manuallyModified = 'true';
        console.log('Prix taille marqué comme manuel:', pi.dataset.size);
      });
    });
  } else {
    console.log('productPrice NON trouvé');
  }

  // ==========================================
  // SKU AUTO GENERATOR
  // ==========================================
  function generateAutoSku(category = 'Signature') {
    const prefix = 'A2M';
    let catCode = 'TS';
    const found = collections.find(c => c.name.toLowerCase() === (category || '').toLowerCase());
    if (found && found.code) {
      catCode = found.code.toUpperCase();
    } else if (category === 'Signature') catCode = 'SIG';
    else if (category === 'Drop 01') catCode = 'D01';
    else if (category === 'Essentiels') catCode = 'ESS';
    else if (category === 'Edition Limitee' || category === 'Édition Limitée') catCode = 'LTD';

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${catCode}-${randomDigits}`;
  }

  // Regenerate button event
  const regenerateSkuBtn = document.getElementById('regenerateSkuBtn');
  if (regenerateSkuBtn) {
    regenerateSkuBtn.addEventListener('click', () => {
      productSku.value = generateAutoSku(productCategory.value);
    });
  }

  // Update SKU on category change if creating new product
  if (productCategory) {
    productCategory.addEventListener('change', () => {
      if (!editProductId.value) {
        productSku.value = generateAutoSku(productCategory.value);
      }
    });
  }

  // ==========================================
  // 8. FORM HANDLING (ADD & EDIT)
  // ==========================================
  function resetAndOpenForm() {
    formTitle.textContent = 'Nouveau T-Shirt ALLAIN2MARIE';
    editProductId.value = '';
    productForm.reset();

    if (saveProductBtn) {
      saveProductBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"></path>
          <path d="M12 5l7 7-7 7"></path>
        </svg>
        <span>Publier le T-Shirt</span>
      `;
      saveProductBtn.style.background = '';
    }

    // Auto-generate SKU
    productSku.value = generateAutoSku(productCategory.value);

    // Reset image slots
    ['front', 'back'].forEach(slot => setSlotImage(slot, ''));

    // Reset sizes (S, M, L, XL, XXL)
    sizeCheckboxes.forEach(cb => {
      const isDefault = ['S', 'M', 'L', 'XL'].includes(cb.dataset.size);
      cb.checked = isDefault;
      const qtyInput = document.querySelector(`.size-qty-input[data-size="${cb.dataset.size}"]`);
      const priceInput = document.querySelector(`.size-price-input[data-size="${cb.dataset.size}"]`);
      
      if (qtyInput) {
        qtyInput.disabled = !isDefault;
        qtyInput.value = isDefault ? '1' : '0';
      }
      if (priceInput) {
        priceInput.disabled = !isDefault;
        priceInput.value = '';
        delete priceInput.dataset.autoFilled;
      }
    });

    switchTab('add-product-tab');
  }

  function openEditForm(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    formTitle.textContent = `Modifier : ${product.title}`;
    editProductId.value = product.id;
    productTitle.value = product.title || '';
    productSku.value = product.sku || '';
    productCategory.value = product.category || 'Signature';
    productPrice.value = product.price || '';

    if (saveProductBtn) {
      saveProductBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Enregistrer les Modifications</span>
      `;
      saveProductBtn.style.background = '#16a34a';
    }

    // Set images
    ['front', 'back'].forEach(slot => {
      setSlotImage(slot, productImageSrc(product, slot) || '');
    });

    // Set sizes & prices
    sizeCheckboxes.forEach(cb => {
      const size = cb.dataset.size;
      const qtyInput = document.querySelector(`.size-qty-input[data-size="${size}"]`);
      const priceInput = document.querySelector(`.size-price-input[data-size="${size}"]`);
      
      const sizeData = product.sizes ? product.sizes[size] : null;
      let qty = 0;
      let price = product.price || '';

      if (typeof sizeData === 'object' && sizeData !== null) {
        qty = Number(sizeData.qty) || 0;
        price = sizeData.price || product.price;
      } else if (typeof sizeData === 'number') {
        qty = sizeData;
      }

      if (qty > 0 || (sizeData && typeof sizeData === 'object')) {
        cb.checked = true;
        if (qtyInput) {
          qtyInput.disabled = false;
          qtyInput.value = qty;
        }
        if (priceInput) {
          priceInput.disabled = false;
          priceInput.value = price;
          // Marquer comme modifié manuellement seulement si le prix diffère du prix de base
          if (Math.abs(parseFloat(price) - parseFloat(product.price)) > 1) {
            priceInput.dataset.manuallyModified = 'true';
          } else {
            delete priceInput.dataset.manuallyModified;
          }
        }
      } else {
        cb.checked = false;
        if (qtyInput) {
          qtyInput.disabled = true;
          qtyInput.value = '0';
        }
        if (priceInput) {
          priceInput.disabled = true;
          priceInput.value = '';
        }
      }
    });

    switchTab('add-product-tab');
  }

  async function handleSaveProduct(e) {
    if (e) e.preventDefault();

    if (!productTitle.value.trim()) {
      showToast('Le nom du modèle est obligatoire', 'error');
      productTitle.focus();
      return;
    }

    if (!productPrice.value || Number(productPrice.value) <= 0) {
      showToast('Veuillez indiquer un prix valide', 'error');
      productPrice.focus();
      return;
    }

    const basePrice = parseFloat(productPrice.value);

    // Collect sizes, stocks & customized size prices
    const sizes = {};
    sizeCheckboxes.forEach(cb => {
      if (cb.checked) {
        const size = cb.dataset.size;
        const qtyInput = document.querySelector(`.size-qty-input[data-size="${size}"]`);
        const priceInput = document.querySelector(`.size-price-input[data-size="${size}"]`);

        const qty = parseInt(qtyInput?.value || '1', 10);
        const sizePrice = parseFloat(priceInput?.value) || basePrice;

        // Si le prix de taille est identique au prix de base, utiliser le prix de base
        // Cela assure la cohérence même si les données étaient différentes avant
        if (Math.abs(sizePrice - basePrice) < 100) {
          sizes[size] = { qty: isNaN(qty) ? 1 : qty, price: basePrice };
        } else {
          sizes[size] = { qty: isNaN(qty) ? 1 : qty, price: sizePrice };
        }
      }
    });

    // Fallback if no size selected
    if (Object.keys(sizes).length === 0) {
      sizes['M'] = { qty: 1, price: basePrice };
    }

    const isEdit = Boolean(editProductId.value);
    const id = isEdit ? editProductId.value : 'prod_' + Date.now();
    const chosenCategory = productCategory.value || (collections[0]?.name || 'Signature');

    const frontLink = normalizeImageLink(currentImages.front);
    const backLink = normalizeImageLink(currentImages.back);
    if (!isHttpImageLink(frontLink)) {
      showToast('Collez le lien Lunacy de la photo devant (commence par https://)', 'error');
      return;
    }

    const productData = {
      id,
      title: productTitle.value.trim(),
      sku: productSku.value.trim() || generateAutoSku(chosenCategory),
      category: chosenCategory,
      price: basePrice,
      status: 'published',
      sizes,
      images: {
        front: frontLink,
        back: isHttpImageLink(backLink) ? backLink : ''
      },
      updatedAt: new Date().toISOString()
    };

    if (isEdit) {
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        productData.createdAt = products[index].createdAt || new Date().toISOString();
        products[index] = productData;
      } else {
        products.unshift(productData);
      }
      showToast('T-Shirt mis à jour avec succès !');
    } else {
      productData.createdAt = new Date().toISOString();
      products.unshift(productData);
      showToast('T-Shirt publié sur le site avec succès !');
    }

    saveProducts(products);

    if (typeof dbSaveProduct === 'function') {
      try {
        console.log('Sauvegarde produit sur Firebase:', productData.id, productData.price);
        const saved = await dbSaveProduct(productData);
        console.log('Produit sauvegardé sur Firebase:', saved);
        if (saved) {
          const idx = products.findIndex(p => p.id === saved.id);
          if (idx !== -1) products[idx] = saved;
          saveProducts(products);
        }
        showToast('T-Shirt visible sur tous les appareils');
      } catch (err) {
        console.error(' Erreur Firebase:', err);
        showToast(err.message || 'Enregistré ici seulement — le cloud a échoué.', 'error');
      }
    }

    // Rafraîchir l'affichage du catalogue, métriques et collections
    renderCatalog();
    updateMetrics();
    if (typeof renderCollectionsTable === 'function') {
      renderCollectionsTable();
    }

    switchTab('catalog-tab');
  }

  productForm.addEventListener('submit', (e) => handleSaveProduct(e));

  // Bouton de synchronisation des prix
  const syncPricesBtn = document.getElementById('syncPricesBtn');
  if (syncPricesBtn) {
    syncPricesBtn.addEventListener('click', () => {
      const basePrice = productPrice.value;
      if (!basePrice) {
        showToast('Entrez d\'abord le prix de base', 'error');
        return;
      }
      document.querySelectorAll('.size-price-input').forEach(pi => {
        pi.value = basePrice;
      });
      showToast('Tous les prix synchronisés avec le prix de base');
    });
  }

  // ==========================================
  // 9. DELETE CONFIRMATION MODAL
  // ==========================================
  let pendingDeleteId = null;
  let pendingDeleteType = null; // 'product' or 'order'
  let pendingDeleteOrder = null;

  function askDeleteProduct(id) {
    pendingDeleteId = id;
    pendingDeleteType = 'product';
    document.getElementById('confirmTitle').textContent = 'Supprimer ce T-Shirt';
    document.getElementById('confirmDesc').textContent = 'Voulez-vous vraiment supprimer ce T-Shirt du catalogue ? Cette action est irréversible.';
    confirmModal.classList.add('active');
  }

  function askDeleteOrder(order) {
    pendingDeleteOrder = order;
    pendingDeleteType = 'order';
    document.getElementById('confirmTitle').textContent = 'Supprimer cette commande';
    document.getElementById('confirmDesc').textContent = `Voulez-vous vraiment supprimer la commande de ${order.customer?.name || 'ce client'} ? Cette action est irréversible.`;
    confirmModal.classList.add('active');
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
      confirmModal.classList.remove('active');
      pendingDeleteId = null;
      pendingDeleteType = null;
      pendingDeleteOrder = null;
    });
  }

  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
    if (pendingDeleteType === 'product' && pendingDeleteId) {
      if (typeof dbDeleteProduct === 'function') {
        dbDeleteProduct(pendingDeleteId);
      }
      products = products.filter(p => p.id !== pendingDeleteId);
      saveProducts();
      showToast('T-Shirt supprimé du catalogue.');
      confirmModal.classList.remove('active');
      pendingDeleteId = null;
      pendingDeleteType = null;
      renderCatalog();
      updateMetrics();
    } else if (pendingDeleteType === 'order' && pendingDeleteOrder) {
      let allOrders = loadOrders();
      allOrders = allOrders.filter(o => o.id !== pendingDeleteOrder.id);
      saveOrders(allOrders);
      if (typeof dbDeleteOrder === 'function') {
        dbDeleteOrder(pendingDeleteOrder.id);
      }
      showToast('Commande supprimée.');
      confirmModal.classList.remove('active');
      pendingDeleteOrder = null;
      pendingDeleteType = null;
      renderOrders();
    }
  });
  }

  // Close modal when clicking outside
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        confirmModal.classList.remove('active');
        pendingDeleteId = null;
        pendingDeleteType = null;
        pendingDeleteOrder = null;
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmModal && confirmModal.classList.contains('active')) {
      confirmModal.classList.remove('active');
      pendingDeleteId = null;
      pendingDeleteType = null;
      pendingDeleteOrder = null;
    }
  });

  // ==========================================
  // 10. ORDERS & DELIVERIES MANAGEMENT
  // ==========================================

  function loadOrders() {
    try {
      const raw = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
      const uniqueMap = new Map();
      raw.forEach(o => {
        if (o && o.id && !uniqueMap.has(o.id)) {
          uniqueMap.set(o.id, o);
        }
      });
      const uniqueOrders = Array.from(uniqueMap.values());
      if (uniqueOrders.length !== raw.length) {
        localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(uniqueOrders));
      }
      return uniqueOrders;
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    const uniqueMap = new Map();
    (orders || []).forEach(o => {
      if (o && o.id && !uniqueMap.has(o.id)) {
        uniqueMap.set(o.id, o);
      }
    });
    localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(Array.from(uniqueMap.values())));
  }

  function renderOrders() {
    const orders = loadOrders();

    if (ordersCountBadge) {
      ordersCountBadge.textContent = orders.length;
      ordersCountBadge.style.display = orders.length > 0 ? 'inline-block' : 'none';
    }

    // Metrics
    if (metricTotalOrders) metricTotalOrders.textContent = orders.length;

    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    if (metricTotalSales) metricTotalSales.textContent = formatFCFA(totalSales);

    const pendingCount = orders.filter(o => o.deliveryStatus !== 'Livré').length;
    if (metricPendingDeliveries) metricPendingDeliveries.textContent = pendingCount;

    if (!ordersTableBody) return;

    if (orders.length === 0) {
      emptyOrdersState.style.display = 'flex';
      ordersTableBody.parentElement.style.display = 'none';
      return;
    }

    emptyOrdersState.style.display = 'none';
    ordersTableBody.parentElement.style.display = 'table';
    ordersTableBody.innerHTML = '';

    orders.forEach((order, idx) => {
      const tr = document.createElement('tr');

      const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
      }) : 'Récemment';

      const cleanPhone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
      const customerEmail = order.customer?.email || '';

      // Si pas de numéro de téléphone valide, masquer le bouton WhatsApp
      if (!cleanPhone || cleanPhone.length < 8) {
        waMessage = '';
      }

      // Si pas d'email valide, masquer le bouton Email
      if (!customerEmail || !customerEmail.includes('@')) {
        emailMessage = '';
      }

      // Enhanced items display with sizes and individual prices
      const itemsListHtml = (order.items || []).map(i => {
        const sizeInfo = i.size ? `<span style="color: #64748b; font-size: 0.75rem;">[Taille: ${i.size}]</span>` : '';
        const priceInfo = i.price ? `<span style="color: #000; font-weight: 700;">${formatFCFA(i.price)}</span>` : '';
        return `
          <div style="font-size: 0.8rem; font-weight: 600; line-height: 1.4; margin-bottom: 4px; padding: 4px 6px; background: #f8fafc; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>• ${i.title} <span style="color: #64748b;">x${i.qty}</span></span>
              ${priceInfo}
            </div>
            ${sizeInfo}
          </div>
        `;
      }).join('');

      // Payment info
      const paymentMethod = order.paymentMethod || 'Wave Business';
      
      // Promo code info
      const promoInfo = order.promoCode ? `<div style="font-size: 0.7rem; color: #16a34a; font-weight: 700; margin-top: 2px;">Code: ${order.promoCode}</div>` : '';
      const discountInfo = order.discountAmount ? `<div style="font-size: 0.7rem; color: #dc2626; font-weight: 700;">-${formatFCFA(order.discountAmount)}</div>` : '';
      const subtotal = order.subtotal || order.total;

      const itemsSummary = (order.items || []).map(i => `${i.title} (Taille: ${i.size || 'M'}, x${i.qty}) - ${formatFCFA((i.price || 0) * (i.qty || 1))}`).join('\n');
      const waMessage = encodeURIComponent(`Bonjour ${order.customer?.name || ''}\n\nNous avons bien reçu votre commande ALLAIN2MARIE (N°${order.id || 'CMD'}) !\n\nDétails de votre commande :\n${itemsSummary}\n\nTotal : ${formatFCFA(order.total)}\nLivraison : ${order.customer?.city || 'Non spécifié'}\nAdresse : ${order.customer?.address || 'Non spécifié'}\nStatut : ${order.deliveryStatus || 'En attente'}\n\nVotre colis est en cours de préparation. Nous vous contacterons bientôt pour confirmer la livraison.\n\nMerci pour votre confiance !\n\nALLAIN2MARIE`);

      const emailMessage = encodeURIComponent(`Bonjour ${order.customer?.name || ''},\n\nNous avons bien reçu votre commande ALLAIN2MARIE (N°${order.id || 'CMD'}) !\n\nDétails de votre commande :\n${itemsSummary.replace(/%0A/g, '\n')}\n\nTotal : ${formatFCFA(order.total)}\nLivraison : ${order.customer?.city || 'Non spécifié'}\nAdresse : ${order.customer?.address || 'Non spécifié'}\nStatut : ${order.deliveryStatus || 'En attente'}\n\nVotre colis est en cours de préparation. Nous vous contacterons bientôt pour confirmer la livraison.\n\nMerci pour votre confiance !\n\nALLAIN2MARIE`);

      tr.innerHTML = `
        <td>
          <div style="font-weight: 800; color: #000; font-size: 0.85rem;">${order.id || ('CMD-' + (idx + 1))}</div>
          <div style="font-size: 0.7rem; color: #64748b;">${dateStr}</div>
        </td>
        <td>
          <div style="font-weight: 800; color: #000; font-size: 0.85rem;">${order.customer?.name || 'Client Inconnu'}</div>
          <div style="font-size: 0.7rem; color: #64748b;">${order.customer?.email || '-'}</div>
        </td>
        <td>
          <a href="tel:${order.customer?.phone || ''}" style="color: #000; font-weight: 700; text-decoration: none; font-size: 0.8rem;">
            ${order.customer?.phone || '-'}
          </a>
        </td>
        <td>
          <div style="font-weight: 700; color: #000; font-size: 0.8rem;">${order.customer?.city || '-'}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px; line-height: 1.2;">${order.customer?.address || '-'}</div>
        </td>
        <td>
          ${itemsListHtml}
        </td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 700;">${paymentMethod}</div>
          ${promoInfo}
        </td>
        <td>
          <div style="font-weight: 900; color: #000; font-size: 0.9rem;">${formatFCFA(order.total)}</div>
          ${discountInfo}
        </td>
        <td>
          <select class="custom-select order-status-select" data-id="${order.id}" style="font-size: 0.78rem; padding: 4px 8px; border-radius: 6px;">
            <option value="En attente" ${order.deliveryStatus === 'En attente' || !order.deliveryStatus ? 'selected' : ''}>En attente</option>
            <option value="En cours" ${order.deliveryStatus === 'En cours' ? 'selected' : ''}>En cours</option>
            <option value="Livré" ${order.deliveryStatus === 'Livré' ? 'selected' : ''}>Livré</option>
          </select>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: flex-end;">
            <button class="btn btn-outline view-order-btn" data-id="${order.id}" style="padding: 3px 6px; font-size: 0.7rem;" title="Voir le détail">
              👁
            </button>
            ${cleanPhone && cleanPhone.length >= 8 ? `
            <a href="https://wa.me/${cleanPhone}?text=${waMessage}" target="_blank" class="btn btn-outline" style="padding: 3px 6px; font-size: 0.7rem; color: #16a34a; border-color: #86efac;" title="Écrire sur WhatsApp">
              💬
            </a>
            ` : ''}
            ${customerEmail && customerEmail.includes('@') ? `
            <a href="mailto:${customerEmail}?subject=Confirmation de commande ALLAIN2MARIE&body=${emailMessage}" class="btn btn-outline" style="padding: 3px 6px; font-size: 0.7rem; color: #2563eb; border-color: #93c5fd;" title="Envoyer par email">
              ✉
            </a>
            ` : ''}
            <button class="btn btn-outline delete-order-btn" data-id="${order.id}" style="padding: 3px 6px; font-size: 0.7rem; color: #ef4444; border-color: #fecaca;" title="Supprimer">
              🗑
            </button>
          </div>
        </td>
      `;

      // Status change listener
      tr.querySelector('.order-status-select')?.addEventListener('change', (e) => {
        const allOrders = loadOrders();
        const found = allOrders.find(o => o.id === order.id);
        if (found) {
          found.deliveryStatus = e.target.value;
          saveOrders(allOrders);
          if (typeof dbUpdateOrderStatus === 'function') {
            dbUpdateOrderStatus(order.id, e.target.value);
          }
          showToast(`Statut de commande mis à jour : ${e.target.value}`);
          renderOrders();
        }
      });

      // View order detail listener
      tr.querySelector('.view-order-btn')?.addEventListener('click', () => {
        showOrderDetail(order);
      });

      // Delete order listener
      tr.querySelector('.delete-order-btn')?.addEventListener('click', () => {
        askDeleteOrder(order);
      });

      ordersTableBody.appendChild(tr);
    });
  }

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', () => {
      console.log('Bouton Actualiser cliqué');
      // Recharger immédiatement depuis localStorage (rapide)
      orders = loadOrders();
      renderOrders();
      showToast('Commandes actualisées !');

      // Synchroniser avec Firebase en arrière-plan (sans bloquer)
      if (typeof dbGetOrders === 'function') {
        setTimeout(async () => {
          try {
            await dbGetOrders();
            orders = loadOrders();
            renderOrders();
            showToast('Synchronisation Firebase terminée');
          } catch (e) {
            console.error('Erreur de synchronisation Firebase:', e);
          }
        }, 100);
      }
    });
  } else {
    console.error('Bouton refreshOrdersBtn non trouvé');
  }

  // ==========================================
  // ORDER DETAIL MODAL
  // ==========================================
  const orderDetailModal = document.getElementById('orderDetailModal');
  const closeOrderDetailModalBtn = document.getElementById('closeOrderDetailModalBtn');
  const orderDetailTitle = document.getElementById('orderDetailTitle');
  const orderDetailContent = document.getElementById('orderDetailContent');

  function showOrderDetail(order) {
    if (!order) return;

    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : 'Récemment';

    const itemsListHtml = (order.items || []).map(i => {
      const sizeInfo = i.size ? `<span style="color: #64748b; font-size: 0.85rem;">Taille: ${i.size}</span>` : '';
      const priceInfo = i.price ? `<span style="color: #000; font-weight: 700;">${formatFCFA(i.price)}</span>` : '';
      return `
        <div style="font-size: 0.9rem; font-weight: 600; line-height: 1.5; margin-bottom: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>• ${i.title} <span style="color: #64748b;">x${i.qty}</span></span>
            ${priceInfo}
          </div>
          ${sizeInfo}
        </div>
      `;
    }).join('');

    const promoInfo = order.promoCode ? `<div style="font-size: 0.85rem; color: #16a34a; font-weight: 700; margin-top: 4px;">Code promo: ${order.promoCode}</div>` : '';
    const discountInfo = order.discountAmount ? `<div style="font-size: 0.85rem; color: #dc2626; font-weight: 700;">Remise: -${formatFCFA(order.discountAmount)}</div>` : '';

    orderDetailTitle.textContent = `Commande ${order.id || 'N/A'}`;
    orderDetailContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Numéro & Date</div>
          <div style="font-weight: 800; color: #000; font-size: 1rem;">${order.id || 'N/A'}</div>
          <div style="font-size: 0.85rem; color: #64748b;">${dateStr}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Statut</div>
          <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${order.deliveryStatus || 'En attente'}</div>
        </div>
      </div>

      <div style="padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Informations Client</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Nom</div>
            <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${order.customer?.name || '-'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Email</div>
            <div style="font-weight: 600; color: #000; font-size: 0.85rem;">${order.customer?.email || '-'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Téléphone</div>
            <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${order.customer?.phone || '-'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Ville</div>
            <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${order.customer?.city || '-'}</div>
          </div>
        </div>
        <div style="margin-top: 0.75rem;">
          <div style="font-size: 0.75rem; color: #64748b;">Adresse de livraison</div>
          <div style="font-weight: 600; color: #000; font-size: 0.85rem; line-height: 1.4;">${order.customer?.address || '-'}</div>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Articles Commandés</div>
        ${itemsListHtml || '<div style="color: #64748b; font-size: 0.85rem;">Aucun article</div>'}
      </div>

      <div style="padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Paiement & Total</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Méthode de paiement</div>
            <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${order.paymentMethod || 'Wave Business'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Sous-total</div>
            <div style="font-weight: 700; color: #000; font-size: 0.9rem;">${formatFCFA(order.subtotal || order.total)}</div>
          </div>
        </div>
        ${promoInfo}
        ${discountInfo}
        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; color: #64748b;">Total à payer</div>
          <div style="font-weight: 900; color: #000; font-size: 1.2rem;">${formatFCFA(order.total)}</div>
        </div>
      </div>
    `;

    if (orderDetailModal) orderDetailModal.classList.add('active');
  }

  if (closeOrderDetailModalBtn) {
    closeOrderDetailModalBtn.addEventListener('click', () => {
      if (orderDetailModal) orderDetailModal.classList.remove('active');
    });
  }

  if (orderDetailModal) {
    orderDetailModal.addEventListener('click', (e) => {
      if (e.target === orderDetailModal) {
        orderDetailModal.classList.remove('active');
      }
    });
  }

  // ==========================================
  // 11. FIREBASE CLOUD DB MODAL & STATUS
  // ==========================================
  const firebaseConfigBtn = document.getElementById('firebaseConfigBtn');
  const firebaseModal = document.getElementById('firebaseModal');
  const closeFirebaseModalBtn = document.getElementById('closeFirebaseModalBtn');
  const firebaseModalCancel = document.getElementById('firebaseModalCancel');
  const firebaseConfigForm = document.getElementById('firebaseConfigForm');
  const fbProjectId = document.getElementById('fbProjectId');
  const fbApiKey = document.getElementById('fbApiKey');
  const fbAuthDomain = document.getElementById('fbAuthDomain');
  const fbStorageBucket = document.getElementById('fbStorageBucket');
  const cloudStatusDot = document.getElementById('cloudStatusDot');

  function updateCloudStatusUI() {
    const savedConfig = localStorage.getItem('ALLAIN2MARIE_FIREBASE_CONFIG');
    const config = savedConfig ? JSON.parse(savedConfig) : (typeof DEFAULT_FIREBASE_CONFIG !== 'undefined' ? DEFAULT_FIREBASE_CONFIG : null);
    
    if (config && config.projectId && config.apiKey) {
      if (cloudStatusDot) {
        cloudStatusDot.style.background = '#16a34a';
        cloudStatusDot.parentElement.title = 'Cloud Firebase Connecté (Actif)';
      }
      return;
    }

    if (cloudStatusDot) {
      cloudStatusDot.style.background = '#ea580c';
      cloudStatusDot.parentElement.title = 'Mode Local (Cliquez pour connecter Firebase)';
    }
  }

  function openFirebaseModal() {
    const savedConfig = localStorage.getItem('ALLAIN2MARIE_FIREBASE_CONFIG');
    const config = savedConfig ? JSON.parse(savedConfig) : (typeof DEFAULT_FIREBASE_CONFIG !== 'undefined' ? DEFAULT_FIREBASE_CONFIG : {});
    
    if (fbProjectId) fbProjectId.value = config.projectId || '';
    if (fbApiKey) fbApiKey.value = config.apiKey || '';
    if (fbAuthDomain) fbAuthDomain.value = config.authDomain || '';
    if (fbStorageBucket) fbStorageBucket.value = config.storageBucket || '';

    if (firebaseModal) firebaseModal.classList.add('active');
  }

  function closeFirebaseModal() {
    if (firebaseModal) firebaseModal.classList.remove('active');
  }

  if (firebaseConfigBtn) firebaseConfigBtn.addEventListener('click', openFirebaseModal);
  if (closeFirebaseModalBtn) closeFirebaseModalBtn.addEventListener('click', closeFirebaseModal);
  if (firebaseModalCancel) firebaseModalCancel.addEventListener('click', closeFirebaseModal);
  if (firebaseModal) {
    firebaseModal.addEventListener('click', (e) => {
      if (e.target === firebaseModal) closeFirebaseModal();
    });
  }

  if (firebaseConfigForm) {
    firebaseConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const config = {
        projectId: fbProjectId.value.trim(),
        apiKey: fbApiKey.value.trim(),
        authDomain: fbAuthDomain.value.trim() || `${fbProjectId.value.trim()}.firebaseapp.com`,
        storageBucket: fbStorageBucket.value.trim() || `${fbProjectId.value.trim()}.appspot.com`
      };

      localStorage.setItem('ALLAIN2MARIE_FIREBASE_CONFIG', JSON.stringify(config));
      if (typeof initFirebaseDB === 'function') initFirebaseDB();
      updateCloudStatusUI();
      closeFirebaseModal();
      showToast('Base de données Cloud Firebase configurée avec succès !');

      if (typeof dbSaveProduct === 'function') {
        (async () => {
          let synced = 0;
          let skipped = 0;
          for (const p of products) {
            try {
              const saved = await dbSaveProduct(p);
              const idx = products.findIndex(item => item.id === p.id);
              if (idx !== -1 && saved) products[idx] = saved;
              synced++;
            } catch (err) {
              skipped++;
              console.warn('Produit non synchronisé:', p.title, err);
            }
          }
          saveProducts(products);
          if (skipped > 0) {
            showToast(`${synced} produits synchronisés, ${skipped} en échec`, 'warning');
          } else {
            showToast(`${synced} produits visibles sur tous les appareils`);
          }
        })();
      }
    });
  }

  // ==========================================
  // 12. COLLECTIONS & CATEGORIES MANAGEMENT
  // ==========================================

  function initCollectionsElements() {
    collectionsTableBody = document.getElementById('collectionsTableBody');
    openAddCollectionModalBtn = document.getElementById('openAddCollectionModalBtn');
    manageCollectionsQuickBtn = document.getElementById('manageCollectionsQuickBtn');
    addNewCollectionQuickBtn = document.getElementById('addNewCollectionQuickBtn');
    collectionModal = document.getElementById('collectionModal');
    closeCollectionModalBtn = document.getElementById('closeCollectionModalBtn');
    cancelCollectionModalBtn = document.getElementById('cancelCollectionModalBtn');
    collectionForm = document.getElementById('collectionForm');
    collectionModalTitle = document.getElementById('collectionModalTitle');
    editCollectionId = document.getElementById('editCollectionId');
    colNameInput = document.getElementById('colNameInput');
    colCodeInput = document.getElementById('colCodeInput');
    colDescInput = document.getElementById('colDescInput');

    console.log('Collections elements:', {
      openAddCollectionModalBtn: !!openAddCollectionModalBtn,
      collectionModal: !!collectionModal,
      collectionForm: !!collectionForm
    });
  }

  function populateCategoryDropdowns() {
    if (categoryFilter) {
      const curVal = categoryFilter.value || 'all';
      categoryFilter.innerHTML = '<option value="all">Toutes les collections</option>';
      collections.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.name;
        opt.textContent = col.name;
        categoryFilter.appendChild(opt);
      });
      categoryFilter.value = collections.some(c => c.name === curVal) ? curVal : 'all';
    }

    if (productCategory) {
      const curVal = productCategory.value;
      productCategory.innerHTML = '';
      collections.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.name;
        opt.textContent = col.name;
        productCategory.appendChild(opt);
      });
      if (curVal && collections.some(c => c.name === curVal)) {
        productCategory.value = curVal;
      } else if (collections.length > 0) {
        productCategory.value = collections[0].name;
      }
    }
  }

  function renderCollectionsTable() {
    if (!collectionsTableBody) return;
    collectionsTableBody.innerHTML = '';

    if (collections.length === 0) {
      collectionsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
            Aucune collection. Cliquez sur <strong>+ Nouvelle Collection</strong> pour en créer une.
          </td>
        </tr>
      `;
      return;
    }

    collections.forEach(col => {
      const tr = document.createElement('tr');
      const count = products.filter(p => (p.category || '').toLowerCase() === (col.name || '').toLowerCase()).length;

      tr.innerHTML = `
        <td>
          <div style="font-weight: 800; font-size: 0.95rem; color: #000;">${col.name}</div>
        </td>
        <td>
          <span style="font-family: monospace; font-weight: 800; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #0f172a; font-size: 0.85rem;">${col.code || 'TS'}</span>
        </td>
        <td>
          <span style="color: #64748b; font-size: 0.85rem;">${col.description || '—'}</span>
        </td>
        <td>
          <span class="stock-chip" style="font-weight: 700;">${count} t-shirt${count > 1 ? 's' : ''}</span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end; display: flex; gap: 0.4rem;">
            <button type="button" class="action-btn edit-col-btn" title="Modifier la collection" style="background: none; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="action-btn delete-col-btn" title="Supprimer la collection" style="background: none; border: 1px solid #fee2e2; color: #ef4444; padding: 6px; border-radius: 6px; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.edit-col-btn')?.addEventListener('click', () => openCollectionModal(col));
      tr.querySelector('.delete-col-btn')?.addEventListener('click', () => handleDeleteCollection(col));

      collectionsTableBody.appendChild(tr);
    });
  }

  function openCollectionModal(col = null) {
    if (col) {
      if (collectionModalTitle) collectionModalTitle.textContent = 'Modifier la Collection';
      if (editCollectionId) editCollectionId.value = col.id || '';
      if (colNameInput) colNameInput.value = col.name || '';
      if (colCodeInput) colCodeInput.value = col.code || '';
      if (colDescInput) colDescInput.value = col.description || '';
    } else {
      if (collectionModalTitle) collectionModalTitle.textContent = 'Nouvelle Collection';
      if (editCollectionId) editCollectionId.value = '';
      if (collectionForm) collectionForm.reset();
    }
    if (collectionModal) collectionModal.classList.add('active');
  }

  function closeCollectionModal() {
    if (collectionModal) collectionModal.classList.remove('active');
  }

  function handleDeleteCollection(col) {
    const count = products.filter(p => (p.category || '').toLowerCase() === (col.name || '').toLowerCase()).length;
    let confirmMsg = `Voulez-vous vraiment supprimer la collection "${col.name}" ?`;
    if (count > 0) {
      confirmMsg += `\n Attention : ${count} t-shirt(s) sont actuellement associés à cette collection.`;
    }

    if (confirm(confirmMsg)) {
      collections = collections.filter(c => c.id !== col.id && c.name !== col.name);
      
      // Sauvegarder dans localStorage immédiatement
      localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(collections));
      
      // Synchroniser avec Firebase si disponible
      if (typeof dbSaveCollections === 'function') {
        dbSaveCollections(collections);
      }
      
      populateCategoryDropdowns();
      renderCollectionsTable();
      renderCatalog();
      showToast(`Collection "${col.name}" supprimée.`);
    }
  }

  function initCollectionsEventListeners() {
    if (openAddCollectionModalBtn) {
      openAddCollectionModalBtn.addEventListener('click', (e) => {
        console.log('Bouton Nouvelle Collection cliqué');
        e.preventDefault();
        openCollectionModal();
      });
    } else {
      console.error('Bouton openAddCollectionModalBtn non trouvé');
    }

    if (manageCollectionsQuickBtn) manageCollectionsQuickBtn.addEventListener('click', () => switchTab('collections-tab'));
    if (addNewCollectionQuickBtn) addNewCollectionQuickBtn.addEventListener('click', () => openCollectionModal());
    if (closeCollectionModalBtn) closeCollectionModalBtn.addEventListener('click', closeCollectionModal);
    if (cancelCollectionModalBtn) cancelCollectionModalBtn.addEventListener('click', closeCollectionModal);
    if (collectionModal) {
      collectionModal.addEventListener('click', (e) => {
        if (e.target === collectionModal) closeCollectionModal();
      });
    }

    if (collectionForm) {
      // Réinitialiser les références aux éléments du formulaire
      editCollectionId = document.getElementById('editCollectionId');
      colNameInput = document.getElementById('colNameInput');
      colCodeInput = document.getElementById('colCodeInput');
      colDescInput = document.getElementById('colDescInput');

      collectionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = editCollectionId ? editCollectionId.value.trim() : '';
      const name = colNameInput.value.trim();
      const code = colCodeInput.value.trim().toUpperCase();
      const description = colDescInput.value.trim();

      if (!name || !code) {
        alert('Veuillez renseigner le nom et le code SKU de la collection.');
        return;
      }

      if (id) {
        // Edit existing
        const idx = collections.findIndex(c => c.id === id);
        if (idx !== -1) {
          const oldName = collections[idx].name;
          collections[idx] = { ...collections[idx], name, code, description };

          // Automatically update products having the old collection name
          if (oldName !== name) {
            let updatedCount = 0;
            products.forEach(p => {
              if (p.category === oldName) {
                p.category = name;
                updatedCount++;
                if (typeof dbSaveProduct === 'function') dbSaveProduct(p);
              }
            });
            if (updatedCount > 0) {
              saveProducts(products);
            }
          }
          showToast(`Collection "${name}" mise à jour !`);
        }
      } else {
        // Create new
        const newCol = {
          id: 'col_' + Date.now(),
          name,
          code,
          description
        };
        collections.push(newCol);
        showToast(`Collection "${name}" créée avec succès !`);
      }

      if (typeof dbSaveCollections === 'function') {
        dbSaveCollections(collections);
      } else {
        localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(collections));
      }

      populateCategoryDropdowns();
      renderCollectionsTable();
      renderCatalog();
      closeCollectionModal();
    });
    }
  }

  // Initialiser les éléments et événements des collections après le chargement du DOM
  function initCollectionsManagement() {
    initCollectionsElements();
    initCollectionsEventListeners();
  }

  // ==========================================
  // 13. PROMO CODES MANAGEMENT
  // ==========================================
  let promos = [];

  // Charger les codes promo depuis Firebase
  async function loadPromos() {
    if (typeof dbGetPromoCodes === 'function') {
      try {
        promos = await dbGetPromoCodes();
        renderPromosTable();
      } catch (e) {
        console.error('Erreur chargement codes promo:', e);
      }
    }
  }

  const promosTableBody = document.getElementById('promosTableBody');
  const openAddPromoModalBtn = document.getElementById('openAddPromoModalBtn');
  const promoModal = document.getElementById('promoModal');
  const closePromoModalBtn = document.getElementById('closePromoModalBtn');
  const cancelPromoModalBtn = document.getElementById('cancelPromoModalBtn');
  const promoForm = document.getElementById('promoForm');
  const promoModalTitle = document.getElementById('promoModalTitle');
  const editPromoId = document.getElementById('editPromoId');
  const promoCodeInputModal = document.getElementById('promoCodeInputModal');
  const promoTypeSelect = document.getElementById('promoTypeSelect');
  const promoValueInput = document.getElementById('promoValueInput');
  const promoDescInput = document.getElementById('promoDescInput');

  let editingPromoIndex = -1;

  function renderPromosTable() {
    if (!promosTableBody) return;
    promosTableBody.innerHTML = '';

    if (promos.length === 0) {
      promosTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
            Aucun code promo actif. Cliquez sur <strong>+ Nouveau Code Promo</strong> pour en créer un.
          </td>
        </tr>
      `;
      return;
    }

    promos.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const formattedVal = p.type === 'percent' ? `-${p.value}%` : `-${formatFCFA(p.value)}`;
      const typeLabel = p.type === 'percent' ? 'Pourcentage (%)' : 'Montant Fixe (FCFA)';

      tr.innerHTML = `
        <td>
          <span style="font-family: monospace; font-weight: 900; background: #000000; color: #ffffff; padding: 5px 12px; border-radius: 4px; font-size: 0.9rem; letter-spacing: 0.06em;">${p.code}</span>
        </td>
        <td>
          <span style="font-weight: 600; color: #334155; font-size: 0.85rem;">${typeLabel}</span>
        </td>
        <td>
          <span style="font-weight: 800; color: #16a34a; font-size: 0.95rem;">${formattedVal}</span>
        </td>
        <td>
          <span style="color: #64748b; font-size: 0.85rem;">${p.description || '—'}</span>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end; display: flex; gap: 0.4rem;">
            <button type="button" class="action-btn edit-promo-btn" title="Modifier le code promo" style="background: none; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="action-btn delete-promo-btn" title="Supprimer le code promo" style="background: none; border: 1px solid #fee2e2; color: #ef4444; padding: 6px; border-radius: 6px; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.edit-promo-btn')?.addEventListener('click', () => openPromoModal(p, idx));
      tr.querySelector('.delete-promo-btn')?.addEventListener('click', () => handleDeletePromo(p));

      promosTableBody.appendChild(tr);
    });
  }

  function openPromoModal(promo = null, idx = -1) {
    editingPromoIndex = idx;
    if (promo) {
      if (promoModalTitle) promoModalTitle.textContent = 'Modifier le Code Promo';
      if (editPromoId) editPromoId.value = promo.code;
      if (promoCodeInputModal) promoCodeInputModal.value = promo.code;
      if (promoTypeSelect) promoTypeSelect.value = promo.type || 'percent';
      if (promoValueInput) promoValueInput.value = promo.value || '';
      if (promoDescInput) promoDescInput.value = promo.description || '';
    } else {
      if (promoModalTitle) promoModalTitle.textContent = 'Nouveau Code Promo';
      if (editPromoId) editPromoId.value = '';
      if (promoForm) promoForm.reset();
      if (promoTypeSelect) promoTypeSelect.value = 'percent';
    }
    if (promoModal) promoModal.classList.add('active');
  }

  function closePromoModal() {
    if (promoModal) promoModal.classList.remove('active');
  }

  function handleDeletePromo(promo) {
    if (confirm(`Voulez-vous vraiment supprimer le code promo "${promo.code}" ?`)) {
      promos = promos.filter(p => p.code.toUpperCase() !== promo.code.toUpperCase());
      if (typeof dbSavePromoCodes === 'function') {
        dbSavePromoCodes(promos);
      } else {
        localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(promos));
      }
      renderPromosTable();
      showToast(`Code promo "${promo.code}" supprimé.`);
    }
  }

  if (openAddPromoModalBtn) openAddPromoModalBtn.addEventListener('click', () => openPromoModal());
  if (closePromoModalBtn) closePromoModalBtn.addEventListener('click', closePromoModal);
  if (cancelPromoModalBtn) cancelPromoModalBtn.addEventListener('click', closePromoModal);
  if (promoModal) {
    promoModal.addEventListener('click', (e) => {
      if (e.target === promoModal) closePromoModal();
    });
  }

  if (promoForm) {
    promoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = promoCodeInputModal.value.trim().toUpperCase();
      const type = promoTypeSelect.value;
      const value = parseFloat(promoValueInput.value);
      const description = promoDescInput.value.trim();

      if (!code || isNaN(value) || value <= 0) {
        alert('Veuillez renseigner un code et une valeur de réduction valide.');
        return;
      }

      if (type === 'percent' && value > 100) {
        alert('Le pourcentage de réduction ne peut pas dépasser 100%.');
        return;
      }

      const existingIdx = promos.findIndex(p => p.code.toUpperCase() === code);

      if (editingPromoIndex !== -1 && editingPromoIndex < promos.length) {
        // Edit
        promos[editingPromoIndex] = { code, type, value, description };
        showToast(`Code promo "${code}" mis à jour !`);
      } else if (existingIdx !== -1) {
        // Overwrite existing
        promos[existingIdx] = { code, type, value, description };
        showToast(`Code promo "${code}" mis à jour !`);
      } else {
        // Add new
        promos.push({ code, type, value, description });
        showToast(`Code promo "${code}" créé avec succès !`);
      }

      if (typeof dbSavePromoCodes === 'function') {
        dbSavePromoCodes(promos);
      } else {
        localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(promos));
      }

      renderPromosTable();
      closePromoModal();
    });
  }

  // ==========================================
  // 8. NEWSLETTER SUBSCRIPTIONS MANAGEMENT
  // ==========================================
  // Newsletter functionality removed
  // ==========================================

  updateCloudStatusUI();

  // Initial render
  populateCategoryDropdowns();
  renderCatalog();
  updateMetrics();
  renderOrders();
  renderCollectionsTable();
  renderPromosTable();

  // Synchronisation Cloud Firebase en arrière-plan
  if (typeof dbGetCollections === 'function') {
    dbGetCollections().then(cloudCols => {
      if (cloudCols && cloudCols.length > 0) {
        collections = cloudCols;
        populateCategoryDropdowns();
        renderCollectionsTable();
        renderCatalog();
      }
    }).catch(() => {});
  }

  if (typeof dbGetProducts === 'function') {
    dbGetProducts().then(async (cloudProds) => {
      if (cloudProds && cloudProds.length > 0) {
        products = cloudProds;
        renderCatalog();
        updateMetrics();
      }

      const withLunacyLinks = products.filter(p => isHttpImageLink(productImageSrc(p, 'front')));
      if (withLunacyLinks.length && typeof dbSaveProduct === 'function') {
        for (const p of withLunacyLinks) {
          try {
            const saved = await dbSaveProduct(p);
            const idx = products.findIndex(item => item.id === p.id);
            if (idx !== -1 && saved) products[idx] = saved;
          } catch (e) {
            console.warn('Sync auto impossible pour', p.title, e);
          }
        }
        saveProducts(products);
        renderCatalog();
      }
    }).catch(() => {});
  }

  if (typeof dbGetOrders === 'function') {
    dbGetOrders().then(() => {
      renderOrders();
    }).catch(() => {});
  }
});
