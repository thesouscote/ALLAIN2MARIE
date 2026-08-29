document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'ALLAIN2MARIE_PRODUCTS';

  // ==========================================
  // 0. SECURITY & AUTHENTICATION GUARD
  // ==========================================
  const isAuth = sessionStorage.getItem('ALLAIN2MARIE_AUTH') || localStorage.getItem('ALLAIN2MARIE_AUTH');
  if (isAuth !== 'true') {
    window.location.href = 'login.html';
    return;
  }

  // Display Logged-in User Profile if available
  const adminUserPill = document.getElementById('adminUserPill');
  const adminUserPhoto = document.getElementById('adminUserPhoto');
  const adminUserName = document.getElementById('adminUserName');

  const loggedUser = sessionStorage.getItem('ALLAIN2MARIE_USER_NAME') || 
                     localStorage.getItem('ALLAIN2MARIE_USER_NAME') || 
                     sessionStorage.getItem('ALLAIN2MARIE_USER') || 
                     localStorage.getItem('ALLAIN2MARIE_USER');

  const loggedPhoto = sessionStorage.getItem('ALLAIN2MARIE_USER_PHOTO') || 
                      localStorage.getItem('ALLAIN2MARIE_USER_PHOTO');

  if (adminUserPill && loggedUser) {
    adminUserPill.style.display = 'inline-flex';
    if (adminUserName) adminUserName.textContent = loggedUser;
    if (adminUserPhoto && loggedPhoto) {
      adminUserPhoto.src = loggedPhoto;
      adminUserPhoto.style.display = 'block';
    }
  }

  // Logout Handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try { await firebase.auth().signOut(); } catch (e) {}
      }
      sessionStorage.removeItem('ALLAIN2MARIE_AUTH');
      sessionStorage.removeItem('ALLAIN2MARIE_USER');
      sessionStorage.removeItem('ALLAIN2MARIE_USER_PHOTO');
      sessionStorage.removeItem('ALLAIN2MARIE_USER_NAME');
      localStorage.removeItem('ALLAIN2MARIE_AUTH');
      localStorage.removeItem('ALLAIN2MARIE_USER');
      localStorage.removeItem('ALLAIN2MARIE_USER_PHOTO');
      localStorage.removeItem('ALLAIN2MARIE_USER_NAME');
      window.location.href = 'login.html';
    });
  }

  // State
  let products = loadProducts();
  let collections = typeof dbGetLocalCollections === 'function' ? dbGetLocalCollections() : [];
  let currentImages = {
    front: '',
    back: ''
  };
  let pendingDeleteId = null;

  // DOM Elements - Tabs
  const tabPanes = document.querySelectorAll('.tab-pane');
  const topAddProductBtn = document.getElementById('topAddProductBtn');
  const catalogAddBtn = document.getElementById('catalogAddBtn');
  const emptyAddProductBtn = document.getElementById('emptyAddProductBtn');
  const cancelFormBtn = document.getElementById('cancelFormBtn');

  // DOM Elements - Metrics
  const metricActiveCount = document.getElementById('metricActiveCount');
  const metricTotalStock = document.getElementById('metricTotalStock');
  const metricCatalogOrders = document.getElementById('metricCatalogOrders');

  // DOM Elements - Table & Filter
  const productsTableBody = document.getElementById('productsTableBody');
  const emptyCatalogState = document.getElementById('emptyCatalogState');
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const categoryFilter = document.getElementById('categoryFilter');

  // DOM Elements - Form
  const productForm = document.getElementById('productForm');
  const formTitle = document.getElementById('formTitle');
  const editProductId = document.getElementById('editProductId');
  const productTitle = document.getElementById('productTitle');
  const productSku = document.getElementById('productSku');
  const productCategory = document.getElementById('productCategory');
  const productPrice = document.getElementById('productPrice');
  const saveProductBtn = document.getElementById('saveProductBtn');

  // DOM Elements - Sizes & Image Slots
  const sizeCheckboxes = document.querySelectorAll('.size-checkbox');
  const sizeQtyInputs = document.querySelectorAll('.size-qty-input');
  const imageSlots = document.querySelectorAll('.admin-image-slot');

  // DOM Elements - Modal & Toast
  const confirmModal = document.getElementById('confirmModal');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const toastContainer = document.getElementById('toastContainer');

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
    if (!raw) {
      // Default initial mock catalog for ALLAIN2MARIE
      const initialProducts = [
        {
          id: 'prod_' + Date.now(),
          title: 'T-Shirt Oversize Signature Noir',
          sku: 'A2M-SIG-001',
          category: 'Signature',
          price: 18000,
          status: 'published',
          images: {
            front: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%230f172a"/><path d="M120 120 L280 120 L320 200 L270 220 L250 180 L250 340 L150 340 L150 180 L130 220 L80 200 Z" fill="%23000000" stroke="%23334155" stroke-width="2"/><text x="200" y="250" fill="%23ffffff" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="2">ALLAIN2MARIE</text></svg>',
            back: ''
          },
          sizes: {
            'S': { qty: 2, price: 18000 },
            'M': { qty: 5, price: 18000 },
            'L': { qty: 3, price: 18000 },
            'XL': { qty: 0, price: 18000 }
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'prod_' + (Date.now() + 1),
          title: 'T-Shirt Heavyweight Blanc Drop 01',
          sku: 'A2M-D01-002',
          category: 'Drop 01',
          price: 20000,
          status: 'published',
          images: {
            front: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f8fafc"/><path d="M120 120 L280 120 L320 200 L270 220 L250 180 L250 340 L150 340 L150 180 L130 220 L80 200 Z" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="200" y="250" fill="%23000000" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="2">ALLAIN2MARIE</text></svg>',
            back: ''
          },
          sizes: {
            'S': { qty: 0, price: 20000 },
            'M': { qty: 4, price: 20000 },
            'L': { qty: 4, price: 20000 },
            'XL': { qty: 2, price: 20000 }
          },
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
      return initialProducts;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing products localStorage', e);
      return [];
    }
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
  const ordersCountBadge = document.getElementById('ordersCountBadge');

  function switchTab(tabId) {
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
    if (tabNavAddProduct) {
      tabNavAddProduct.className = tabId === 'add-product-tab' ? 'btn btn-primary admin-tab-btn active' : 'btn btn-outline admin-tab-btn';
    }

    if (tabId === 'catalog-tab') {
      renderCatalog();
      updateMetrics();
    } else if (tabId === 'orders-tab') {
      renderOrders();
    } else if (tabId === 'collections-tab') {
      renderCollectionsTable();
    } else if (tabId === 'promos-tab') {
      renderPromosTable();
    }
  }

  if (tabNavCatalog) tabNavCatalog.addEventListener('click', () => switchTab('catalog-tab'));
  if (tabNavOrders) tabNavOrders.addEventListener('click', () => switchTab('orders-tab'));
  if (tabNavCollections) tabNavCollections.addEventListener('click', () => switchTab('collections-tab'));
  if (tabNavPromos) tabNavPromos.addEventListener('click', () => switchTab('promos-tab'));
  if (tabNavAddProduct) tabNavAddProduct.addEventListener('click', () => resetAndOpenForm());

  if (topAddProductBtn) topAddProductBtn.addEventListener('click', () => resetAndOpenForm());
  if (catalogAddBtn) catalogAddBtn.addEventListener('click', () => resetAndOpenForm());
  if (emptyAddProductBtn) emptyAddProductBtn.addEventListener('click', () => resetAndOpenForm());
  if (cancelFormBtn) cancelFormBtn.addEventListener('click', () => switchTab('catalog-tab'));

  // Bouton Sync Firebase — force la synchronisation de tous les produits locaux
  const syncFirebaseBtn = document.getElementById('syncFirebaseBtn');
  if (syncFirebaseBtn) {
    syncFirebaseBtn.addEventListener('click', async () => {
      if (typeof dbSaveProduct !== 'function') {
        showToast('⚠️ Firebase non connecté', 'error');
        return;
      }
      const prods = getProducts();
      if (prods.length === 0) {
        showToast('Aucun produit à synchroniser');
        return;
      }
      syncFirebaseBtn.disabled = true;
      syncFirebaseBtn.textContent = '⏳ Sync...';
      let synced = 0, skipped = 0;
      for (const p of prods) {
        const totalKB = getBase64SizeKB(p.frontImage) + getBase64SizeKB(p.backImage) + 50;
        if (totalKB <= 700) {
          try {
            await dbSaveProduct(p);
            synced++;
          } catch (e) {
            console.error('Erreur sync:', p.name, e);
            skipped++;
          }
        } else {
          console.warn('Produit trop lourd:', p.name, totalKB + 'KB — re-editez pour recompresser');
          skipped++;
        }
      }
      syncFirebaseBtn.disabled = false;
      syncFirebaseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg><span class="btn-label-desktop">Sync Firebase</span>';
      if (skipped > 0) {
        showToast(`⚠️ ${synced} sync OK, ${skipped} trop lourds (re-editez les images)`, 'warning');
      } else {
        showToast(`☁️ ${synced} produit(s) synchronisé(s) sur Firebase !`);
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
      const thumbSrc = p.images?.front || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="%2394a3b8"><rect width="24" height="24" rx="4" fill="%23f1f5f9"/><path d="M12 5c1 0 1.5.5 1.5 1.5h3v3h-1.5v6H9v-6H7.5v-3h3C10.5 5.5 11 5 12 5z"/></svg>';

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
  // 6. IMAGE COMPRESSION & DROPZONES
  // ==========================================
  // MAX 500px wide, quality 0.65 — optimise agressivement pour Firestore (< 200KB base64)
  function compressImage(file, maxWidth = 500, quality = 0.65) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Toujours redimensionner si plus grand que maxWidth
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          // Fond blanc pour eviter transparence PNG noire en JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Toujours forcer WebP ou JPEG pour avoir la meilleure compression
          // Ne jamais garder PNG non compresse
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp')) {
            resolve(webp); // WebP: le plus leger
          } else {
            // Fallback JPEG si WebP non supporte
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  // Verifie la taille d'une image base64 en KB
  function getBase64SizeKB(base64str) {
    if (!base64str) return 0;
    const base64Data = base64str.split(',')[1] || base64str;
    return Math.round((base64Data.length * 3) / 4 / 1024);
  }

  imageSlots.forEach(slot => {
    const slotType = slot.dataset.slot;
    const dropzone = slot.querySelector('.slot-dropzone');
    const fileInput = slot.querySelector('.slot-file-input');
    const emptyView = slot.querySelector('.slot-empty');
    const previewView = slot.querySelector('.slot-preview');
    const previewImg = slot.querySelector('.slot-preview img');
    const removeBtn = slot.querySelector('.slot-remove-btn');

    // Click to upload
    dropzone.addEventListener('click', (e) => {
      if (e.target !== removeBtn && !currentImages[slotType]) {
        fileInput.click();
      }
    });

    // File input change with auto-compression
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const compressedBase64 = await compressImage(file);
        currentImages[slotType] = compressedBase64;
        previewImg.src = compressedBase64;
        emptyView.style.display = 'none';
        previewView.style.display = 'flex';
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#000000';
        dropzone.style.backgroundColor = '#f1f5f9';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.backgroundColor = '#fafafa';
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (files && files[0] && files[0].type.startsWith('image/')) {
        const compressedBase64 = await compressImage(files[0]);
        currentImages[slotType] = compressedBase64;
        previewImg.src = compressedBase64;
        emptyView.style.display = 'none';
        previewView.style.display = 'flex';
      }
    });

    // Remove image
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentImages[slotType] = '';
      fileInput.value = '';
      previewImg.src = '';
      previewView.style.display = 'none';
      emptyView.style.display = 'flex';
    });
  });

  function setSlotImage(slotType, src) {
    const slot = document.querySelector(`.admin-image-slot[data-slot="${slotType}"]`);
    if (!slot) return;
    const emptyView = slot.querySelector('.slot-empty');
    const previewView = slot.querySelector('.slot-preview');
    const previewImg = slot.querySelector('.slot-preview img');

    if (src) {
      currentImages[slotType] = src;
      previewImg.src = src;
      emptyView.style.display = 'none';
      previewView.style.display = 'flex';
    } else {
      currentImages[slotType] = '';
      previewImg.src = '';
      previewView.style.display = 'none';
      emptyView.style.display = 'flex';
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
    productPrice.addEventListener('input', () => {
      const baseVal = productPrice.value;
      if (!baseVal) return;
      document.querySelectorAll('.size-price-input').forEach(pi => {
        if (!pi.value || pi.dataset.autoFilled === 'true') {
          pi.value = baseVal;
          pi.dataset.autoFilled = 'true';
        }
      });
    });
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
      setSlotImage(slot, product.images?.[slot] || '');
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

  function handleSaveProduct(e) {
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
        const price = parseFloat(priceInput?.value) || basePrice;

        sizes[size] = { qty: isNaN(qty) ? 1 : qty, price: isNaN(price) ? basePrice : price };
      }
    });

    // Fallback if no size selected
    if (Object.keys(sizes).length === 0) {
      sizes['M'] = { qty: 1, price: basePrice };
    }

    const isEdit = Boolean(editProductId.value);
    const id = isEdit ? editProductId.value : 'prod_' + Date.now();
    const chosenCategory = productCategory.value || (collections[0]?.name || 'Signature');

    // Default visual mockup if no image was uploaded
    const defaultMockup = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%230f172a"/><path d="M120 120 L280 120 L320 200 L270 220 L250 180 L250 340 L150 340 L150 180 L130 220 L80 200 Z" fill="%23000000" stroke="%23334155" stroke-width="2"/><text x="200" y="250" fill="%23ffffff" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="2">ALLAIN2MARIE</text></svg>';

    const productData = {
      id,
      title: productTitle.value.trim(),
      sku: productSku.value.trim() || generateAutoSku(chosenCategory),
      category: chosenCategory,
      price: basePrice,
      status: 'published',
      sizes,
      images: {
        front: currentImages.front || defaultMockup,
        back: currentImages.back || ''
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

    // Sauvegarde Firebase avec verification de taille et feedback
    if (typeof dbSaveProduct === 'function') {
      // Verifier que les images ne depassent pas ~600KB chacune (limite Firestore ~1MB/doc)
      const frontSizeKB = getBase64SizeKB(productData.frontImage);
      const backSizeKB = getBase64SizeKB(productData.backImage);
      const totalKB = frontSizeKB + backSizeKB + 50; // +50KB pour les autres champs

      if (totalKB > 700) {
        showToast(`⚠️ Images trop lourdes (${totalKB}KB). Re-uploadez des images plus petites.`, 'error');
        console.warn('Images trop grandes pour Firestore:', { frontSizeKB, backSizeKB });
      } else {
        dbSaveProduct(productData).then(() => {
          console.log('☁️ Produit synchronise sur Firebase:', productData.id);
        }).catch(err => {
          console.error('❌ Erreur Firebase:', err);
          showToast('⚠️ Sauvegarde Firebase echouee - verifiez votre connexion', 'error');
        });
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

  // ==========================================
  // 9. DELETE CONFIRMATION MODAL
  // ==========================================
  function askDeleteProduct(id) {
    pendingDeleteId = id;
    confirmModal.classList.add('active');
  }

  confirmCancelBtn.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    pendingDeleteId = null;
  });

  confirmOkBtn.addEventListener('click', () => {
    if (pendingDeleteId) {
      if (typeof dbDeleteProduct === 'function') {
        dbDeleteProduct(pendingDeleteId);
      }
      products = products.filter(p => p.id !== pendingDeleteId);
      saveProducts();
      showToast('T-Shirt supprimé du catalogue.');
      confirmModal.classList.remove('active');
      pendingDeleteId = null;
      renderCatalog();
      updateMetrics();
    }
  });

  // ==========================================
  // 10. ORDERS & DELIVERIES MANAGEMENT
  // ==========================================
  const ordersTableBody = document.getElementById('ordersTableBody');
  const emptyOrdersState = document.getElementById('emptyOrdersState');
  const metricTotalOrders = document.getElementById('metricTotalOrders');
  const metricTotalSales = document.getElementById('metricTotalSales');
  const metricPendingDeliveries = document.getElementById('metricPendingDeliveries');
  const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');

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
      const itemsListHtml = (order.items || []).map(i => `
        <div style="font-size: 0.82rem; font-weight: 600; line-height: 1.3;">
          • ${i.title} <span style="color: #64748b;">(x${i.qty})</span>
        </div>
      `).join('');

      const waMessage = encodeURIComponent(`Bonjour ${order.customer?.name || ''}, nous avons bien reçu votre commande ALLAIN2MARIE (${formatFCFA(order.total)}) pour livraison à ${order.customer?.city || ''}. Votre colis est en cours de préparation.`);

      tr.innerHTML = `
        <td>
          <div style="font-weight: 800; color: #000;">${order.id || ('CMD-' + (idx + 1))}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${dateStr}</div>
        </td>
        <td>
          <div style="font-weight: 800; color: #000;">${order.customer?.name || 'Client Inconnu'}</div>
        </td>
        <td>
          <a href="tel:${order.customer?.phone || ''}" style="color: #000; font-weight: 700; text-decoration: none;">
            📞 ${order.customer?.phone || '-'}
          </a>
        </td>
        <td>
          <div style="font-weight: 700; color: #000;">📍 ${order.customer?.city || '-'}</div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${order.customer?.address || '-'}</div>
        </td>
        <td>
          ${itemsListHtml}
        </td>
        <td>
          <div style="font-weight: 900; color: #000;">${formatFCFA(order.total)}</div>
          <div style="font-size: 0.72rem; color: #16a34a; font-weight: 700;">Wave Business</div>
        </td>
        <td>
          <select class="custom-select order-status-select" data-id="${order.id}" style="font-size: 0.78rem; padding: 4px 8px; border-radius: 6px;">
            <option value="En attente" ${order.deliveryStatus === 'En attente' || !order.deliveryStatus ? 'selected' : ''}>⏳ En attente</option>
            <option value="En cours" ${order.deliveryStatus === 'En cours' ? 'selected' : ''}>🚚 En cours</option>
            <option value="Livré" ${order.deliveryStatus === 'Livré' ? 'selected' : ''}>✅ Livré</option>
          </select>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.4rem;">
            <a href="https://wa.me/${cleanPhone}?text=${waMessage}" target="_blank" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #16a34a; border-color: #86efac;" title="Écrire sur WhatsApp">
              📲 WhatsApp
            </a>
            <button class="btn btn-outline delete-order-btn" data-id="${order.id}" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: #fecaca;" title="Supprimer">
              🗑️
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

      // Delete order listener
      tr.querySelector('.delete-order-btn')?.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la commande de ${order.customer?.name || ''} ?`)) {
          let allOrders = loadOrders();
          allOrders = allOrders.filter(o => o.id !== order.id);
          saveOrders(allOrders);
          if (typeof dbDeleteOrder === 'function') {
            dbDeleteOrder(order.id);
          }
          showToast('Commande supprimée.');
          renderOrders();
        }
      });

      ordersTableBody.appendChild(tr);
    });
  }

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', async () => {
      if (typeof dbGetOrders === 'function') {
        await dbGetOrders();
      }
      renderOrders();
      showToast('Commandes actualisées !');
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
      showToast('⚡ Base de données Cloud Firebase configurée avec succès !');

      // Sync existing products to cloud — avec verification de taille
      if (typeof dbSaveProduct === 'function') {
        let synced = 0;
        let skipped = 0;
        products.forEach(p => {
          const totalKB = getBase64SizeKB(p.frontImage) + getBase64SizeKB(p.backImage) + 50;
          if (totalKB <= 700) {
            dbSaveProduct(p);
            synced++;
          } else {
            skipped++;
            console.warn('Produit trop lourd pour Firebase (images a re-uploader):', p.name, totalKB + 'KB');
          }
        });
        if (skipped > 0) {
          showToast(`⚠️ ${synced} produits synchronises, ${skipped} trop lourds (re-editez-les pour recompresser)`, 'warning');
        } else {
          showToast(`☁️ ${synced} produits synchronises sur Firebase !`);
        }
      }
    });
  }

  // ==========================================
  // 12. COLLECTIONS & CATEGORIES MANAGEMENT
  // ==========================================
  const collectionsTableBody = document.getElementById('collectionsTableBody');
  const openAddCollectionModalBtn = document.getElementById('openAddCollectionModalBtn');
  const manageCollectionsQuickBtn = document.getElementById('manageCollectionsQuickBtn');
  const addNewCollectionQuickBtn = document.getElementById('addNewCollectionQuickBtn');
  const collectionModal = document.getElementById('collectionModal');
  const closeCollectionModalBtn = document.getElementById('closeCollectionModalBtn');
  const cancelCollectionModalBtn = document.getElementById('cancelCollectionModalBtn');
  const collectionForm = document.getElementById('collectionForm');
  const collectionModalTitle = document.getElementById('collectionModalTitle');
  const editCollectionId = document.getElementById('editCollectionId');
  const colNameInput = document.getElementById('colNameInput');
  const colCodeInput = document.getElementById('colCodeInput');
  const colDescInput = document.getElementById('colDescInput');

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
      confirmMsg += `\n⚠️ Attention : ${count} t-shirt(s) sont actuellement associés à cette collection.`;
    }

    if (confirm(confirmMsg)) {
      collections = collections.filter(c => c.id !== col.id && c.name !== col.name);
      if (typeof dbSaveCollections === 'function') {
        dbSaveCollections(collections);
      } else {
        localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(collections));
      }
      populateCategoryDropdowns();
      renderCollectionsTable();
      renderCatalog();
      showToast(`Collection "${col.name}" supprimée.`);
    }
  }

  if (openAddCollectionModalBtn) openAddCollectionModalBtn.addEventListener('click', () => openCollectionModal());
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

  // ==========================================
  // 13. PROMO CODES MANAGEMENT
  // ==========================================
  let promos = typeof dbGetPromoCodes === 'function' ? dbGetPromoCodes() : [
    { code: 'ALLAIN10', type: 'percent', value: 10, description: '10% de réduction' },
    { code: 'VIP20', type: 'percent', value: 20, description: '20% de réduction VIP' },
    { code: 'LIVRAISON', type: 'fixed', value: 1500, description: '1 500 FCFA offerts' },
    { code: 'A2M5000', type: 'fixed', value: 5000, description: '5 000 FCFA de remise' }
  ];

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
    dbGetProducts().then(cloudProds => {
      if (cloudProds && cloudProds.length > 0) {
        products = cloudProds;
        renderCatalog();
        updateMetrics();
      }
    }).catch(() => {});
  }

  if (typeof dbGetOrders === 'function') {
    dbGetOrders().then(() => {
      renderOrders();
    }).catch(() => {});
  }
});
