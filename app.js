document.addEventListener('DOMContentLoaded', () => {
  const storefrontGrid = document.getElementById('storefrontGrid');
  const categoryFilterBar = document.getElementById('categoryFilterBar');
  const cartBtn = document.getElementById('cartBtn');
  const cartBadge = document.getElementById('cartBadge');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const continueShoppingBtn = document.getElementById('continueShoppingBtn');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Product Detail Modal Elements
  const productModal = document.getElementById('productModal');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const pdpFrontImg = document.getElementById('pdpFrontImg');
  const pdpBackImg = document.getElementById('pdpBackImg');
  const pdpBackCard = document.getElementById('pdpBackCard');
  const pdpTitle = document.getElementById('pdpTitle');
  const pdpPrice = document.getElementById('pdpPrice');
  const pdpMinusBtn = document.getElementById('pdpMinusBtn');
  const pdpPlusBtn = document.getElementById('pdpPlusBtn');
  const pdpQtyVal = document.getElementById('pdpQtyVal');
  const pdpAddToCartBtn = document.getElementById('pdpAddToCartBtn');
  const pdpBuyNowBtn = document.getElementById('pdpBuyNowBtn');

  // Nav Drawer & Search Elements
  const menuBtn = document.getElementById('menuBtn');
  const navDrawer = document.getElementById('navDrawer');
  const navDrawerOverlay = document.getElementById('navDrawerOverlay');
  const closeNavDrawerBtn = document.getElementById('closeNavDrawerBtn');
  const searchBtn = document.getElementById('searchBtn');
  const searchModalOverlay = document.getElementById('searchModalOverlay');
  const closeSearchModalBtn = document.getElementById('closeSearchModalBtn');
  const searchBarInput = document.getElementById('searchBarInput');
  const searchResultsList = document.getElementById('searchResultsList');

  let currentCategory = 'all';
  let collections = typeof dbGetLocalCollections === 'function' ? dbGetLocalCollections() : [];
  let cart = loadCart();
  let currentPdpProduct = null;
  let currentPdpQty = 1;

  // Format amount to FCFA
  function formatFCFA(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  function formatCFAPrefix(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'CFA 0';
    return 'CFA ' + new Intl.NumberFormat('fr-FR').format(amount);
  }

  // Load / Save cart in localStorage
  function loadCart() {
    try {
      const raw = localStorage.getItem('ALLAIN2MARIE_CART');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem('ALLAIN2MARIE_CART', JSON.stringify(cart));
    updateCartUI();
  }

  // ==========================================
  // PRODUCT DETAIL MODAL (EXACTEMENT COMME LA CAPTURE)
  // ==========================================
  function openProductModal(product) {
    if (!productModal) return;
    currentPdpProduct = product;
    currentPdpQty = 1;

    if (pdpTitle) pdpTitle.textContent = product.title;
    if (pdpPrice) pdpPrice.textContent = formatCFAPrefix(product.price);
    if (pdpQtyVal) pdpQtyVal.textContent = '1';

    const frontSrc = product.images?.front || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 24 24\' fill=\'%23000\'><path d=\'M12 4.5c1.1 0 2 .9 2 2h4c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1h-2v8c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-8H4c-.55 0-1-.45-1-1V7.5c0-.55.45-1 1-1h4c0-1.1.9-2 2-2h2z\'/></svg>';
    const backSrc = product.images?.back || '';

    if (pdpFrontImg) pdpFrontImg.src = frontSrc;

    if (backSrc) {
      if (pdpBackImg) pdpBackImg.src = backSrc;
      if (pdpBackCard) pdpBackCard.style.display = 'flex';
    } else {
      if (pdpBackCard) pdpBackCard.style.display = 'none';
    }

    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    if (!productModal) return;
    productModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // PDP Quantity Controls
  if (pdpMinusBtn) {
    pdpMinusBtn.addEventListener('click', () => {
      if (currentPdpQty > 1) {
        currentPdpQty--;
        pdpQtyVal.textContent = currentPdpQty;
      }
    });
  }

  if (pdpPlusBtn) {
    pdpPlusBtn.addEventListener('click', () => {
      currentPdpQty++;
      pdpQtyVal.textContent = currentPdpQty;
    });
  }

  // PDP Add to Cart Button
  if (pdpAddToCartBtn) {
    pdpAddToCartBtn.addEventListener('click', () => {
      if (!currentPdpProduct) return;
      const existing = cart.find(item => item.id === currentPdpProduct.id);
      if (existing) {
        existing.qty += currentPdpQty;
      } else {
        cart.push({
          id: currentPdpProduct.id,
          title: currentPdpProduct.title,
          price: currentPdpProduct.price,
          image: currentPdpProduct.images?.front || '',
          qty: currentPdpQty
        });
      }
      saveCart();

      // Trigger Cart Pulse Animation
      if (cartBtn) {
        cartBtn.classList.remove('cart-pulse-ring');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('cart-pulse-ring');
        setTimeout(() => cartBtn.classList.remove('cart-pulse-ring'), 600);
      }

      closeProductModal();
      openCartDrawer();
    });
  }

  // PDP Buy It Now Button
  if (pdpBuyNowBtn) {
    pdpBuyNowBtn.addEventListener('click', () => {
      if (!currentPdpProduct) return;
      const total = currentPdpProduct.price * currentPdpQty;
      const message = `Bonjour ALLAIN2MARIE,%0AJe souhaite commander immédiatement :%0A• ${currentPdpProduct.title} (x${currentPdpQty}) - ${formatFCFA(total)}%0A%0ATotal : ${formatFCFA(total)}`;
      window.open(`https://wa.me/?text=${message}`, '_blank');
    });
  }

  // Modal Close Events
  if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) closeProductModal();
    });
  }

  // ==========================================
  // CART DRAWER
  // ==========================================
  function openCartDrawer() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function getSizeStock(product, size) {
    if (!product) return 0;
    const sizesConfig = product.sizes || {};
    if (sizesConfig[size] !== undefined) {
      const val = sizesConfig[size];
      return typeof val === 'object' ? (Number(val.qty) || 0) : (Number(val) || 0);
    }
    return 0;
  }

  // Luxury Floating Toast Notification
  function showLuxuryToast(message, type = 'info') {
    let container = document.getElementById('luxuryToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'luxuryToastContainer';
      container.className = 'luxury-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `luxury-toast ${type}`;

    let icon = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
    if (type === 'success') {
      icon = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function updateQty(key, delta) {
    const item = cart.find(i => (i.cartKey || i.id) === key);
    if (!item) return;

    if (delta > 0) {
      const allProds = getProducts();
      const prod = allProds.find(p => p.id === item.id);
      const maxStock = prod ? getSizeStock(prod, item.size || 'M') : 99;
      if (item.qty >= maxStock) {
        showLuxuryToast(`Stock maximum disponible : ${maxStock} pièce${maxStock > 1 ? 's' : ''}`, 'info');
        return;
      }
    }

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => (i.cartKey || i.id) !== key);
    }
    saveCart();
  }

  function removeFromCart(key) {
    cart = cart.filter(i => (i.cartKey || i.id) !== key);
    saveCart();
  }

  // Promo Code State & Calculations
  let activePromo = null;
  try {
    const savedPromo = sessionStorage.getItem('ALLAIN2MARIE_ACTIVE_PROMO');
    if (savedPromo) activePromo = JSON.parse(savedPromo);
  } catch (e) {}

  function calculateCartDiscount(subtotal) {
    if (!activePromo || subtotal <= 0) return 0;
    if (activePromo.type === 'percent') {
      return Math.round((subtotal * activePromo.value) / 100);
    } else if (activePromo.type === 'fixed') {
      return Math.min(subtotal, activePromo.value);
    }
    return 0;
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = calculateCartDiscount(subtotal);
    const finalTotal = Math.max(0, subtotal - discount);

    if (cartBadge) cartBadge.textContent = totalCount;
    if (cartDrawerCount) cartDrawerCount.textContent = totalCount;
    if (cartTotal) cartTotal.textContent = `CFA${new Intl.NumberFormat('fr-FR').format(finalTotal).replace(/\s/g, ',')} XOF`;

    const cartDiscountVal = document.getElementById('cartDiscountVal');
    if (cartDiscountVal) {
      if (discount > 0) {
        cartDiscountVal.style.display = 'block';
        cartDiscountVal.textContent = `- CFA ${new Intl.NumberFormat('fr-FR').format(discount).replace(/\s/g, ',')}`;
      } else {
        cartDiscountVal.style.display = 'none';
      }
    }

    renderPromoUI();

    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `<div class="cart-empty-state"><p>Votre panier est vide</p></div>`;
      return;
    }

    cartItemsList.innerHTML = '';
    cart.forEach(item => {
      const key = item.cartKey || item.id;
      const itemTotalPrice = item.price * item.qty;
      const formattedTotal = `CFA${new Intl.NumberFormat('fr-FR').format(itemTotalPrice).replace(/\s/g, ',')}`;
      const formattedUnit = `CFA${new Intl.NumberFormat('fr-FR').format(item.price).replace(/\s/g, ',')}`;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div class="cart-item-thumb-box">
          <img src="${item.image || ''}" alt="${item.title}" class="cart-item-img">
        </div>
        <div class="cart-item-details">
          <div class="cart-item-top-row">
            <h4 class="cart-item-title">${item.title}</h4>
            <span class="cart-item-total-price">${formattedTotal}</span>
          </div>
          <div class="cart-item-unit-price">${formattedUnit}</div>
          <div class="cart-item-bottom-row">
            <div class="cart-qty-picker">
              <button class="cart-qty-btn minus-btn" data-key="${key}">-</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn plus-btn" data-key="${key}">+</button>
            </div>
            <button class="cart-trash-btn" data-key="${key}" title="Supprimer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      itemEl.querySelector('.minus-btn').addEventListener('click', () => updateQty(key, -1));
      itemEl.querySelector('.plus-btn').addEventListener('click', () => updateQty(key, 1));
      itemEl.querySelector('.cart-trash-btn').addEventListener('click', () => removeFromCart(key));

      cartItemsList.appendChild(itemEl);
    });
  }

  // Promo Code Controls in Cart
  const cartDiscountBar = document.getElementById('cartDiscountBar');
  const cartDiscountIcon = document.getElementById('cartDiscountIcon');
  const cartPromoForm = document.getElementById('cartPromoForm');
  const promoInput = document.getElementById('promoInput');
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  const promoFeedback = document.getElementById('promoFeedback');
  const activePromoBadge = document.getElementById('activePromoBadge');
  const activePromoText = document.getElementById('activePromoText');
  const removePromoBtn = document.getElementById('removePromoBtn');

  function renderPromoUI() {
    if (!cartDiscountBar) return;
    if (activePromo) {
      if (cartDiscountBar) cartDiscountBar.style.display = 'none';
      if (cartPromoForm) cartPromoForm.style.display = 'none';
      if (activePromoBadge) {
        activePromoBadge.style.display = 'flex';
        const label = activePromo.type === 'percent' ? `${activePromo.code} (-${activePromo.value}%)` : `${activePromo.code} (-${activePromo.value} FCFA)`;
        if (activePromoText) activePromoText.textContent = label;
      }
    } else {
      if (cartDiscountBar) cartDiscountBar.style.display = 'flex';
      if (activePromoBadge) activePromoBadge.style.display = 'none';
    }
  }

  if (cartDiscountBar) {
    cartDiscountBar.addEventListener('click', () => {
      if (!cartPromoForm) return;
      const isOpen = cartPromoForm.style.display === 'block';
      cartPromoForm.style.display = isOpen ? 'none' : 'block';
      if (cartDiscountIcon) cartDiscountIcon.textContent = isOpen ? '+' : '−';
      if (!isOpen && promoInput) promoInput.focus();
    });
  }

  function handleApplyPromo() {
    if (!promoInput) return;
    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
      if (promoFeedback) {
        promoFeedback.className = 'cart-promo-feedback error';
        promoFeedback.textContent = 'Veuillez saisir un code promo';
      }
      return;
    }

    const promos = typeof dbGetPromoCodes === 'function' ? dbGetPromoCodes() : [
      { code: 'ALLAIN10', type: 'percent', value: 10 },
      { code: 'VIP20', type: 'percent', value: 20 },
      { code: 'LIVRAISON', type: 'fixed', value: 1500 },
      { code: 'A2M5000', type: 'fixed', value: 5000 }
    ];

    const match = promos.find(p => p.code.toUpperCase() === code);
    if (match) {
      activePromo = match;
      sessionStorage.setItem('ALLAIN2MARIE_ACTIVE_PROMO', JSON.stringify(activePromo));
      if (promoFeedback) {
        promoFeedback.className = 'cart-promo-feedback success';
        promoFeedback.textContent = 'Code promo appliqué avec succès !';
      }
      promoInput.value = '';
      updateCartUI();
    } else {
      if (promoFeedback) {
        promoFeedback.className = 'cart-promo-feedback error';
        promoFeedback.textContent = 'Code promo invalide ou expiré';
      }
    }
  }

  if (applyPromoBtn) applyPromoBtn.addEventListener('click', handleApplyPromo);
  if (promoInput) {
    promoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApplyPromo();
      }
    });
  }

  if (removePromoBtn) {
    removePromoBtn.addEventListener('click', () => {
      activePromo = null;
      sessionStorage.removeItem('ALLAIN2MARIE_ACTIVE_PROMO');
      if (promoFeedback) promoFeedback.textContent = '';
      updateCartUI();
    });
  }

  // Load products from localStorage
  function getProducts() {
    const raw = localStorage.getItem('ALLAIN2MARIE_PRODUCTS');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  // ==========================================
  // STOREFRONT CATALOGUE GRID & COLLECTIONS
  // ==========================================
  function renderCategoryFilterPills() {
    if (!categoryFilterBar) return;
    categoryFilterBar.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `filter-pill ${currentCategory === 'all' ? 'active' : ''}`;
    allBtn.dataset.category = 'all';
    allBtn.textContent = 'Tous les T-Shirts';
    categoryFilterBar.appendChild(allBtn);

    collections.forEach(col => {
      const btn = document.createElement('button');
      btn.className = `filter-pill ${currentCategory.toLowerCase() === col.name.toLowerCase() ? 'active' : ''}`;
      btn.dataset.category = col.name;
      btn.textContent = col.name;
      categoryFilterBar.appendChild(btn);
    });
  }

  function renderStorefront() {
    if (!storefrontGrid) return;
    const products = getProducts();
    const filtered = products.filter(p => {
      if (currentCategory === 'all') return true;
      return (p.category || '').toLowerCase() === currentCategory.toLowerCase();
    });

    storefrontGrid.innerHTML = '';

    if (filtered.length === 0) {
      storefrontGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #64748b;">
          <p style="font-size: 1.1rem; font-weight: 700; color: #000; margin-bottom: 0.5rem;">Aucun modèle dans cette collection pour le moment</p>
          <p style="font-size: 0.9rem;">Revenez bientôt ou sélectionnez une autre catégorie ci-dessus.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const frontImg = p.images?.front || '';
      const backImg = p.images?.back || '';

      const card = document.createElement('div');
      card.className = `store-card ${backImg ? 'has-back-img' : ''}`;
      card.title = `Découvrir « ${p.title} »`;

      // Build image wrap safely (avoids HTML injection from special chars in URLs)
      const imgWrap = document.createElement('div');
      imgWrap.className = 'store-card-img-wrap';

      const frontImgEl = document.createElement('img');
      frontImgEl.src = frontImg;
      frontImgEl.alt = p.title;
      frontImgEl.className = 'store-card-img store-card-front-img';
      frontImgEl.loading = 'lazy';
      frontImgEl.onerror = function() {
        this.style.display = 'none';
      };
      imgWrap.appendChild(frontImgEl);

      if (backImg) {
        const backImgEl = document.createElement('img');
        backImgEl.src = backImg;
        backImgEl.alt = p.title + ' - Dos';
        backImgEl.className = 'store-card-img store-card-back-img';
        backImgEl.loading = 'lazy';
        backImgEl.onerror = function() { this.style.display = 'none'; };
        imgWrap.appendChild(backImgEl);
      }

      const body = document.createElement('div');
      body.className = 'store-card-body';

      const titleEl = document.createElement('h3');
      titleEl.className = 'store-card-title';
      titleEl.textContent = p.title;

      const priceEl = document.createElement('div');
      priceEl.className = 'store-card-price';
      priceEl.textContent = formatFCFA(p.price);

      body.appendChild(titleEl);
      body.appendChild(priceEl);
      card.appendChild(imgWrap);
      card.appendChild(body);

      // CLICK ON TEE CARD -> REDIRECT TO DEDICATED PRODUCT PAGE
      card.addEventListener('click', () => {
        window.location.href = `product.html?id=${p.id}`;
      });
      storefrontGrid.appendChild(card);
    });
  }

  // Filter pills events
  if (categoryFilterBar) {
    categoryFilterBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      categoryFilterBar.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.dataset.category;
      renderStorefront();
    });
  }

  // Cart Drawer open/close events
  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
  if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  const DEFAULT_WAVE_LINK = 'https://pay.wave.com/m/M_0HDs6VQohDa2/c/ci/';

  function getWavePaymentUrl(amount) {
    const base = localStorage.getItem('ALLAIN2MARIE_WAVE_LINK') || DEFAULT_WAVE_LINK;
    try {
      const url = new URL(base);
      if (amount) {
        url.searchParams.set('amount', amount);
      }
      return url.toString();
    } catch (e) {
      return base;
    }
  }

  // ==========================================
  // DELIVERY CHECKOUT MODAL
  // ==========================================
  const deliveryModal = document.getElementById('deliveryModal');
  const closeDeliveryModalBtn = document.getElementById('closeDeliveryModalBtn');
  const deliveryForm = document.getElementById('deliveryForm');
  const deliverySummaryTotal = document.getElementById('deliverySummaryTotal');
  const deliverySummaryItems = document.getElementById('deliverySummaryItems');
  const btnConfirmWavePayment = document.getElementById('btnConfirmWavePayment');

  let pendingOrderItems = [];
  let pendingOrderSubtotal = 0;
  let pendingOrderTotal = 0;

  const modalActivePromoBadge = document.getElementById('modalActivePromoBadge');
  const modalActivePromoText = document.getElementById('modalActivePromoText');
  const modalRemovePromoBtn = document.getElementById('modalRemovePromoBtn');
  const modalPromoInputRow = document.getElementById('modalPromoInputRow');
  const modalPromoInput = document.getElementById('modalPromoInput');
  const modalApplyPromoBtn = document.getElementById('modalApplyPromoBtn');
  const modalPromoFeedback = document.getElementById('modalPromoFeedback');

  function renderModalPromoUI() {
    if (!modalActivePromoBadge || !modalPromoInputRow) return;
    if (activePromo) {
      modalActivePromoBadge.style.display = 'flex';
      modalPromoInputRow.style.display = 'none';
      const label = activePromo.type === 'percent' 
        ? `Code ${activePromo.code} appliqué (-${activePromo.value}%)` 
        : `Code ${activePromo.code} appliqué (-${formatFCFA(activePromo.value)})`;
      if (modalActivePromoText) modalActivePromoText.textContent = label;
      if (modalPromoFeedback) modalPromoFeedback.textContent = '';
    } else {
      modalActivePromoBadge.style.display = 'none';
      modalPromoInputRow.style.display = 'flex';
    }
  }

  function updateDeliveryModalAmounts() {
    const discount = calculateCartDiscount(pendingOrderSubtotal);
    pendingOrderTotal = Math.max(0, pendingOrderSubtotal - discount);

    if (deliverySummaryTotal) {
      deliverySummaryTotal.textContent = `CFA ${new Intl.NumberFormat('fr-FR').format(pendingOrderTotal).replace(/\s/g, ',')} XOF`;
    }

    if (deliverySummaryItems) {
      let itemsHtml = pendingOrderItems.map(i => `
        <div style="display: flex; justify-content: space-between;">
          <span>• ${i.title} (x${i.qty})</span>
          <span style="font-weight: 700;">${formatFCFA(i.price * i.qty)}</span>
        </div>
      `).join('');

      if (discount > 0 && activePromo) {
        itemsHtml += `
          <div style="display: flex; justify-content: space-between; color: #16a34a; font-weight: 700; margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed #bbf7d0;">
            <span>• Remise Code Promo (${activePromo.code})</span>
            <span>- ${formatFCFA(discount)}</span>
          </div>
        `;
      }
      deliverySummaryItems.innerHTML = itemsHtml;
    }

    if (btnConfirmWavePayment) {
      btnConfirmWavePayment.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center; gap: 0.6rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
          <span>Payer CFA ${new Intl.NumberFormat('fr-FR').format(pendingOrderTotal).replace(/\s/g, ',')} avec Wave</span>
        </span>
      `;
    }

    renderModalPromoUI();
  }

  function openDeliveryModal(items, subtotal) {
    pendingOrderItems = items || [];
    pendingOrderSubtotal = subtotal || pendingOrderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

    if (pendingOrderItems.length === 0) return;

    if (modalPromoInput) modalPromoInput.value = '';
    if (modalPromoFeedback) modalPromoFeedback.textContent = '';

    updateDeliveryModalAmounts();

    closeCartDrawer();
    if (deliveryModal) {
      deliveryModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function handleModalApplyPromo() {
    if (!modalPromoInput) return;
    const code = modalPromoInput.value.trim().toUpperCase();
    if (!code) {
      if (modalPromoFeedback) {
        modalPromoFeedback.style.color = '#dc2626';
        modalPromoFeedback.textContent = 'Veuillez entrer un code promo.';
      }
      return;
    }

    const promos = typeof dbGetPromoCodes === 'function' ? dbGetPromoCodes() : [
      { code: 'ALLAIN10', type: 'percent', value: 10 },
      { code: 'VIP20', type: 'percent', value: 20 },
      { code: 'LIVRAISON', type: 'fixed', value: 1500 },
      { code: 'A2M5000', type: 'fixed', value: 5000 }
    ];

    const match = promos.find(p => p.code.toUpperCase() === code);
    if (match) {
      activePromo = match;
      sessionStorage.setItem('ALLAIN2MARIE_ACTIVE_PROMO', JSON.stringify(activePromo));
      if (modalPromoFeedback) {
        modalPromoFeedback.style.color = '#16a34a';
        modalPromoFeedback.textContent = 'Code promo appliqué !';
      }
      updateDeliveryModalAmounts();
      updateCartUI();
    } else {
      if (modalPromoFeedback) {
        modalPromoFeedback.style.color = '#dc2626';
        modalPromoFeedback.textContent = 'Code promo invalide ou expiré.';
      }
    }
  }

  if (modalApplyPromoBtn) modalApplyPromoBtn.addEventListener('click', handleModalApplyPromo);
  if (modalPromoInput) {
    modalPromoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleModalApplyPromo();
      }
    });
  }

  if (modalRemovePromoBtn) {
    modalRemovePromoBtn.addEventListener('click', () => {
      activePromo = null;
      sessionStorage.removeItem('ALLAIN2MARIE_ACTIVE_PROMO');
      if (modalPromoFeedback) modalPromoFeedback.textContent = '';
      updateDeliveryModalAmounts();
      updateCartUI();
    });
  }

  function closeDeliveryModal() {
    if (deliveryModal) {
      deliveryModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (closeDeliveryModalBtn) closeDeliveryModalBtn.addEventListener('click', closeDeliveryModal);
  if (deliveryModal) {
    deliveryModal.addEventListener('click', (e) => {
      if (e.target === deliveryModal) closeDeliveryModal();
    });
  }

  // Checkout order action -> Opens Delivery Info Modal
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      openDeliveryModal(cart, subtotal);
    });
  }

  // Submit delivery form -> Save order + Open Wave Business Payment
  let isSubmittingOrder = false;
  function handleOrderSubmit(e) {
    if (e) e.preventDefault();
    if (isSubmittingOrder) return;

    const custName = document.getElementById('custName')?.value.trim() || '';
    const custPhone = document.getElementById('custPhone')?.value.trim() || '';
    const custCity = document.getElementById('custCity')?.value.trim() || '';
    const custAddress = document.getElementById('custAddress')?.value.trim() || '';

    if (!custName || !custPhone || !custCity || !custAddress) {
      showLuxuryToast('Veuillez renseigner toutes vos informations de livraison.', 'error');
      return;
    }

    isSubmittingOrder = true;

    try {
      const itemsList = Array.isArray(pendingOrderItems) ? pendingOrderItems : [];
      const totalAmount = pendingOrderTotal || 0;

      // Nettoyer les items pour éviter de stocker de lourdes images base64 dans localStorage
      const sanitizedItems = itemsList.map(i => ({
        id: i.id || '',
        title: i.title || '',
        size: i.size || 'M',
        price: Number(i.price) || 0,
        qty: Number(i.qty) || 1
      }));

      const newOrder = {
        id: 'CMD-' + Date.now(),
        customer: { name: custName, phone: custPhone, city: custCity, address: custAddress },
        items: sanitizedItems,
        total: totalAmount,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'En attente',
        paymentStatus: 'Wave Initié'
      };

      // Sauvegarde centralisée (locale + Firebase Firestore)
      if (typeof dbSaveOrder === 'function') {
        try { dbSaveOrder(newOrder); } catch(err) { console.error(err); }
      } else {
        try {
          const orders = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
          orders.unshift(newOrder);
          localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(orders.slice(0, 50)));
        } catch (storageErr) {
          console.warn('LocalStorage quota warning:', storageErr);
        }
      }

      // Vider le panier
      cart = [];
      try { saveCart(); } catch(err) {}
      try { updateCartUI(); } catch(err) {}

      // Close modal
      closeDeliveryModal();

      // Open Wave Payment Overlay (30 secondes)
      const waveUrl = getWavePaymentUrl(totalAmount);
      openWaveOverlay(waveUrl);

      // Trigger WhatsApp notification
      try {
        const itemsSummary = itemsList.map(i => `• ${i.title || 'T-Shirt'} (x${i.qty || 1}) - ${formatFCFA((i.price || 0) * (i.qty || 1))}`).join('%0A');
        const waMsg = `NOUVELLE COMMANDE ALLAIN2MARIE%0A%0AClient : ${custName}%0ATéléphone : ${custPhone}%0ACommune : ${custCity}%0AAdresse de livraison : ${custAddress}%0A%0AArticles :%0A${itemsSummary}%0A%0ATotal : ${formatFCFA(totalAmount)}%0APaiement : Wave Business`;
        setTimeout(() => {
          try { window.open(`https://wa.me/?text=${waMsg}`, '_blank'); } catch(e) {}
        }, 1000);
      } catch(waErr) {
        console.error(waErr);
      }
    } catch(err) {
      console.error('Order submission error:', err);
      showLuxuryToast('Une erreur est survenue. Veuillez réessayer.', 'error');
    } finally {
      setTimeout(() => { isSubmittingOrder = false; }, 1500);
    }
  }

  if (deliveryForm) {
    deliveryForm.addEventListener('submit', handleOrderSubmit);
  }

  // Escape key closes all modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (deliveryModal && deliveryModal.classList.contains('active')) closeDeliveryModal();
      if (productModal && productModal.classList.contains('active')) closeProductModal();
      if (cartDrawer && cartDrawer.classList.contains('active')) closeCartDrawer();
      closeNavDrawer();
      closeSearchModal();
    }
  });

  // ==========================================
  // NAV DRAWER (Menu Burger)
  // ==========================================
  function openNavDrawer() {
    if (navDrawer) navDrawer.classList.add('active');
    if (navDrawerOverlay) navDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeNavDrawer() {
    if (navDrawer) navDrawer.classList.remove('active');
    if (navDrawerOverlay) navDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openNavDrawer);
  if (closeNavDrawerBtn) closeNavDrawerBtn.addEventListener('click', closeNavDrawer);
  if (navDrawerOverlay) navDrawerOverlay.addEventListener('click', closeNavDrawer);

  // Nav drawer category filter buttons
  if (navDrawer) {
    navDrawer.querySelectorAll('[data-filter-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filterNav;
        currentCategory = cat;
        // Sync pills on main page
        if (categoryFilterBar) {
          categoryFilterBar.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.category === cat);
          });
        }
        renderStorefront();
        closeNavDrawer();
      });
    });
  }

  // ==========================================
  // LIVE SEARCH MODAL
  // ==========================================
  function openSearchModal() {
    if (searchModalOverlay) searchModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (searchBarInput) {
      searchBarInput.value = '';
      setTimeout(() => searchBarInput.focus(), 80);
    }
    renderSearchResults('');
  }

  function closeSearchModal() {
    if (searchModalOverlay) searchModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderSearchResults(query) {
    if (!searchResultsList) return;
    const products = getProducts();
    const q = query.trim().toLowerCase();

    if (!q) {
      searchResultsList.innerHTML = '<div class="search-empty-msg">Tapez pour rechercher un modèle…</div>';
      return;
    }

    const results = products.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );

    if (results.length === 0) {
      searchResultsList.innerHTML = `<div class="search-empty-msg">Aucun résultat pour « ${query} »</div>`;
      return;
    }

    searchResultsList.innerHTML = results.map(p => `
      <div class="search-result-item" data-id="${p.id}">
        <img src="${p.images?.front || ''}" alt="${p.title}" class="search-result-thumb">
        <div class="search-result-info">
          <div class="search-result-title">${p.title}</div>
          <div class="search-result-price">${formatFCFA(p.price)}</div>
        </div>
      </div>
    `).join('');

    searchResultsList.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        window.location.href = `product.html?id=${item.dataset.id}`;
      });
    });
  }

  if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
  if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', closeSearchModal);
  if (searchModalOverlay) {
    searchModalOverlay.addEventListener('click', (e) => {
      if (e.target === searchModalOverlay) closeSearchModal();
    });
  }
  if (searchBarInput) {
    searchBarInput.addEventListener('input', () => renderSearchResults(searchBarInput.value));
  }

  // ==========================================
  // WAVE PAYMENT OVERLAY (30 secondes)
  // ==========================================
  function openWaveOverlay(waveUrl) {
    const overlay      = document.getElementById('wavePaymentOverlay');
    const successOv    = document.getElementById('waveSuccessOverlay');
    const progressBar  = document.getElementById('waveProgressBar');
    const countdownNum = document.getElementById('waveCountdownNum');
    const countdownFb  = document.getElementById('waveCountdownNumFallback');
    const countdownFt  = document.getElementById('waveCountdownFooter');
    const extLink      = document.getElementById('waveExternalLink');

    if (extLink) extLink.href = waveUrl;

    // Calcul dimensions pour fenêtre pop-up centrée
    const width = 500;
    const height = 700;
    const left = Math.max(0, (window.screen.width / 2) - (width / 2));
    const top = Math.max(0, (window.screen.height / 2) - (height / 2));

    let waveWin = null;
    try {
      waveWin = window.open(
        waveUrl,
        'WavePaymentPopup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );
    } catch(e) {}

    // Si le site a la modale HTML
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    const TOTAL = 30;
    let remaining = TOTAL;

    if (progressBar) {
      progressBar.style.transition = 'none';
      progressBar.style.width = '100%';
      requestAnimationFrame(() => {
        progressBar.style.transition = `width ${TOTAL}s linear`;
        progressBar.style.width = '0%';
      });
    }

    function updateCountdown() {
      const txt = remaining.toString();
      if (countdownNum) countdownNum.textContent = txt;
      if (countdownFb)  countdownFb.textContent  = txt;
      if (countdownFt)  countdownFt.textContent  = txt;
    }

    updateCountdown();

    const interval = setInterval(() => {
      remaining--;
      updateCountdown();

      if (remaining <= 0) {
        clearInterval(interval);

        // Fermer la fenêtre pop-up Wave automatiquement si elle est ouverte
        if (waveWin && !waveWin.closed) {
          try { waveWin.close(); } catch(e) {}
        }

        if (overlay) overlay.classList.remove('active');

        if (successOv) {
          successOv.classList.add('active');
          document.body.style.overflow = 'hidden';
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 3000);
        } else {
          document.body.style.overflow = '';
          window.location.href = 'index.html';
        }
      }
    }, 1000);
  }

  // Initial render
  updateCartUI();
  renderCategoryFilterPills();

  // Strategie : Firebase D'ABORD, localStorage en fallback
  // Garantit que tous les appareils voient les donnees les plus recentes.

  let firebaseLoaded = false;

  // Afficher les produits locaux SEULEMENT si Firebase est trop lent (> 3s)
  const localFallbackTimer = setTimeout(() => {
    if (!firebaseLoaded) {
      renderStorefront();
    }
  }, 3000);

  // Charger collections depuis Firebase
  if (typeof dbGetCollections === 'function') {
    dbGetCollections().then(cloudCols => {
      if (cloudCols && cloudCols.length > 0) {
        collections = cloudCols;
        renderCategoryFilterPills();
      }
    }).catch(() => {});
  }

  // Charger produits depuis Firebase TOUJOURS, meme si localStorage a des donnees
  if (typeof dbGetProducts === 'function') {
    dbGetProducts().then(cloudProds => {
      firebaseLoaded = true;
      clearTimeout(localFallbackTimer);
      renderStorefront();
    }).catch(() => {
      firebaseLoaded = true;
      clearTimeout(localFallbackTimer);
      renderStorefront();
    });
  } else {
    clearTimeout(localFallbackTimer);
    renderStorefront();
  }
});
