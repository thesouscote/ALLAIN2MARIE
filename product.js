document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.getElementById('pageTitle');
  const pagePrice = document.getElementById('pagePrice');
  const pageFrontImg = document.getElementById('pageFrontImg');
  const pageBackImg = document.getElementById('pageBackImg');
  const pageBackBox = document.getElementById('pageBackBox');
  const pageMinusBtn = document.getElementById('pageMinusBtn');
  const pagePlusBtn = document.getElementById('pagePlusBtn');
  const pageQtyVal = document.getElementById('pageQtyVal');
  const pageAddToCartBtn = document.getElementById('pageAddToCartBtn');
  const pageBuyNowBtn = document.getElementById('pageBuyNowBtn');

  // Cart Drawer Elements
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

  let currentQty = 1;
  let currentProduct = null;
  let cart = loadCart();
  let selectedRating = 0;

  // Format amount to FCFA / CFA
  function formatFCFA(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }

  function formatCFAPrefix(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'CFA 0';
    return 'CFA ' + new Intl.NumberFormat('fr-FR').format(amount);
  }

  // Load Products from LocalStorage
  async function getProducts() {
    // Charger depuis localStorage d'abord (rapide)
    const raw = localStorage.getItem('ALLAIN2MARIE_PRODUCTS');
    const localProducts = raw ? JSON.parse(raw) : [];

    // Synchroniser avec Firebase en arrière-plan
    if (typeof dbGetProducts === 'function') {
      try {
        const cloudProducts = await dbGetProducts();
        if (cloudProducts && cloudProducts.length > 0) {
          localStorage.setItem('ALLAIN2MARIE_PRODUCTS', JSON.stringify(cloudProducts));
          return cloudProducts;
        }
      } catch (e) {
        console.error('Erreur synchronisation produits Firebase:', e);
      }
    }
    return localProducts;
  }

  // Load / Save Cart
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

  // Cart Drawer Controls
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
    } else if (type === 'error') {
      icon = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
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

  async function updateQty(key, delta) {
    const item = cart.find(i => (i.cartKey || i.id) === key);
    if (!item) return;

    if (delta > 0) {
      const allProds = await getProducts();
      const prod = allProds.find(p => p.id === item.id) || currentProduct;
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

      itemEl.querySelector('.minus-btn').addEventListener('click', async () => updateQty(key, -1));
      itemEl.querySelector('.plus-btn').addEventListener('click', async () => updateQty(key, 1));
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

  async function handleApplyPromo() {
    if (!promoInput) return;
    const code = promoInput.value.trim().toUpperCase();
    console.log('handleApplyPromo - code saisi:', code);

    if (!code) {
      if (promoFeedback) {
        promoFeedback.className = 'cart-promo-feedback error';
        promoFeedback.textContent = 'Veuillez saisir un code promo';
      }
      return;
    }

    let promos = [];
    if (typeof dbGetPromoCodes === 'function') {
      try {
        promos = await dbGetPromoCodes();
        console.log('handleApplyPromo - codes depuis Firebase:', promos);
      } catch (e) {
        console.error('Erreur chargement codes promo:', e);
        promos = [
          { code: 'ALLAIN10', type: 'percent', value: 10 },
          { code: 'VIP20', type: 'percent', value: 20 },
          { code: 'LIVRAISON', type: 'fixed', value: 1500 },
          { code: 'A2M5000', type: 'fixed', value: 5000 }
        ];
      }
    } else {
      promos = [
        { code: 'ALLAIN10', type: 'percent', value: 10 },
        { code: 'VIP20', type: 'percent', value: 20 },
        { code: 'LIVRAISON', type: 'fixed', value: 1500 },
        { code: 'A2M5000', type: 'fixed', value: 5000 }
      ];
    }

    console.log('handleApplyPromo - codes disponibles:', promos);
    const match = promos.find(p => p.code.toUpperCase() === code);
    console.log('handleApplyPromo - code trouvé:', match);

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

  if (applyPromoBtn) applyPromoBtn.addEventListener('click', async () => {
    await handleApplyPromo();
  });
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

  // Size & Info Elements
  const pdpSizePills = document.getElementById('pdpSizePills');
  const pdpSelectedSizeText = document.getElementById('pdpSelectedSizeText');
  const pdpDescriptionText = document.getElementById('pdpDescriptionText');

  let selectedSize = 'M';

  // Helper to get size-specific price
  function getSizePrice(product, size) {
    if (!product) return 0;
    if (product.sizes && typeof product.sizes[size] === 'object' && product.sizes[size].price) {
      return Number(product.sizes[size].price);
    }
    return Number(product.price) || 0;
  }

  // Helper to get size-specific stock quantity
  function getSizeStock(product, size) {
    if (!product) return 0;
    const sizesConfig = product.sizes || {};
    if (sizesConfig[size] !== undefined) {
      const val = sizesConfig[size];
      return typeof val === 'object' ? (Number(val.qty) || 0) : (Number(val) || 0);
    }
    return 0;
  }

  const pageCollection = document.getElementById('pageCollection');
  const pageSku = document.getElementById('pageSku');
  const pageStockStatus = document.getElementById('pageStockStatus');
  const pageStockText = document.getElementById('pageStockText');

  function updateStockStatus() {
    if (!currentProduct || !pageStockStatus || !pageStockText) return;
    const maxStock = getSizeStock(currentProduct, selectedSize);

    if (maxStock > 0) {
      pageStockStatus.className = 'pdp-stock-status in-stock';
      pageStockText.textContent = maxStock <= 3 ? `En stock — Plus que ${maxStock} pièce${maxStock > 1 ? 's' : ''} !` : 'En stock — Expédition immédiate';
      
      // Auto-cap quantity to available stock
      if (currentQty > maxStock) {
        currentQty = maxStock;
      }
      if (currentQty < 1) currentQty = 1;
      if (pageQtyVal) pageQtyVal.textContent = currentQty;

      if (pageAddToCartBtn) {
        pageAddToCartBtn.disabled = false;
        pageAddToCartBtn.style.opacity = '1';
        pageAddToCartBtn.style.cursor = 'pointer';
        pageAddToCartBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>Ajouter au panier</span>
        `;
      }
      if (pageBuyNowBtn) {
        pageBuyNowBtn.disabled = false;
        pageBuyNowBtn.style.opacity = '1';
        pageBuyNowBtn.style.cursor = 'pointer';
        pageBuyNowBtn.textContent = 'Commander maintenant';
      }
    } else {
      pageStockStatus.className = 'pdp-stock-status out-of-stock';
      pageStockText.textContent = 'Rupture temporaire pour cette taille';
      currentQty = 0;
      if (pageQtyVal) pageQtyVal.textContent = '0';

      if (pageAddToCartBtn) {
        pageAddToCartBtn.disabled = true;
        pageAddToCartBtn.style.opacity = '0.5';
        pageAddToCartBtn.style.cursor = 'not-allowed';
        pageAddToCartBtn.innerHTML = `<span>Rupture de stock</span>`;
      }
      if (pageBuyNowBtn) {
        pageBuyNowBtn.disabled = true;
        pageBuyNowBtn.style.opacity = '0.5';
        pageBuyNowBtn.style.cursor = 'not-allowed';
        pageBuyNowBtn.textContent = 'Indisponible';
      }
    }
  }

  // Load Current Product by ID from URL
  async function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    // Charger d'abord depuis localStorage (rapide, comme index.html)
    const localProducts = JSON.parse(localStorage.getItem('ALLAIN2MARIE_PRODUCTS') || '[]');
    let products = localProducts;

    if (productId) {
      currentProduct = products.find(p => p.id === productId);
    }

    // If not found by ID, fallback to first product
    if (!currentProduct && products.length > 0) {
      currentProduct = products[0];
    }

    if (currentProduct) {
      // Afficher immédiatement avec les données locales (comme index.html)
      renderProductContent();

      // Puis synchroniser en arrière-plan avec Firebase
      if (typeof dbGetProducts === 'function') {
        try {
          const cloudProducts = await dbGetProducts();
          if (cloudProducts && cloudProducts.length > 0) {
            const cloudProduct = cloudProducts.find(p => p.id === productId);
            if (cloudProduct) {
              // Mettre à jour si les données diffèrent
              currentProduct = cloudProduct;
              renderProductContent();
            }
          }
        } catch (e) {
          console.error('Erreur synchronisation produit:', e);
        }
      }
    } else {
      // Pas de produit disponible
      pageTitle.textContent = 'Modèle Indisponible';
      pagePrice.textContent = '';
    }
  }

  function renderProductContent() {
    if (!currentProduct) return;

    // Set Title, Collection, SKU & Initial Price
    document.title = `ALLAIN2MARIE | ${currentProduct.title}`;
    pageTitle.textContent = currentProduct.title;

    // Analytics: Track product view (only once per session)
    if (typeof gtag !== 'undefined' && !currentProduct.viewed) {
      gtag('event', 'view_item', {
        currency: 'XOF',
        value: currentProduct.price,
        items: [{
          item_id: currentProduct.id,
          item_name: currentProduct.title,
          price: currentProduct.price
        }]
      });
      currentProduct.viewed = true;
    }



    if (pageCollection) {
      pageCollection.textContent = currentProduct.category || 'Collection Signature';
    }
    if (pageSku) {
      pageSku.textContent = currentProduct.sku ? `Réf: ${currentProduct.sku}` : '';
    }

    if (pdpDescriptionText && currentProduct.description) {
      pdpDescriptionText.textContent = currentProduct.description;
    }

    // Render Sizes & update price based on selected size
    renderSizeSelector();
    updatePagePrice();
    updateStockStatus();

    // Set Images (Front & Back)
    const frontSrc = currentProduct.images?.front || currentProduct.frontImage || '';
    const backSrc = currentProduct.images?.back || currentProduct.backImage || '';

    if (pageFrontImg) {
      pageFrontImg.src = frontSrc;
    }

    if (backSrc && pageBackImg && pageBackBox) {
      pageBackImg.src = backSrc;
      pageBackBox.style.display = 'flex';
    } else if (pageBackBox) {
      pageBackBox.style.display = 'none';
    }

    // Share Button Event using Web Share API
    const shareBtn = document.getElementById('shareBtn');
    const mobileShareBtn = document.getElementById('mobileShareBtn');

    const handleShare = async () => {
      const shareData = {
        title: currentProduct.title || 'ALLAIN2MARIE T-Shirt',
        text: `Découvrez ce magnifique T-Shirt "${currentProduct.title}" chez ALLAIN2MARIE !`,
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
          showLuxuryToast('Merci pour le partage !', 'success');
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.log('Web Share non disponible ou annulé, fallback vers clipboard');
      }

      // Fallback: copier dans le presse-papier
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareData.url);
          showLuxuryToast('Lien copié dans le presse-papier !', 'success');
          return;
        }
      } catch (clipboardErr) {
        console.log('Clipboard API non disponible, fallback vers méthode legacy');
      }

      // Fallback legacy: sélectionner et copier manuellement
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showLuxuryToast('Lien copié dans le presse-papier !', 'success');
        } catch (e) {
          showLuxuryToast('Impossible de partager. Copiez manuellement: ' + shareData.url, 'error');
        }
        document.body.removeChild(textArea);
      } catch (e) {
        showLuxuryToast('Impossible de partager. Copiez manuellement: ' + shareData.url, 'error');
      }
    };

    if (shareBtn) shareBtn.addEventListener('click', handleShare);
    if (mobileShareBtn) mobileShareBtn.addEventListener('click', handleShare);
  }

  function updatePagePrice() {
    if (!pagePrice || !currentProduct) return;
    const currentPrice = getSizePrice(currentProduct, selectedSize);
    pagePrice.textContent = formatCFAPrefix(currentPrice);
  }

  // Render Available Sizes
  function renderSizeSelector() {
    if (!pdpSizePills) return;
    pdpSizePills.innerHTML = '';

    const sizesConfig = currentProduct.sizes || { S: 1, M: 1, L: 1, XL: 1 };
    const allSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    
    // Find available sizes
    let availableSizes = [];
    if (typeof sizesConfig === 'object') {
      allSizes.forEach(sz => {
        const val = sizesConfig[sz];
        if (typeof val === 'object' && val !== null && val.qty > 0) {
          availableSizes.push(sz);
        } else if (typeof val === 'number' && val > 0) {
          availableSizes.push(sz);
        }
      });
    }

    // Fallback if none defined
    if (availableSizes.length === 0) {
      availableSizes = ['S', 'M', 'L', 'XL'];
    }

    selectedSize = availableSizes[0];
    if (pdpSelectedSizeText) pdpSelectedSizeText.textContent = selectedSize;

    availableSizes.forEach(size => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pdp-size-btn ${size === selectedSize ? 'active' : ''}`;
      btn.textContent = size;
      btn.dataset.size = size;

      btn.addEventListener('click', () => {
        selectedSize = size;
        if (pdpSelectedSizeText) pdpSelectedSizeText.textContent = selectedSize;
        pdpSizePills.querySelectorAll('.pdp-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Dynamically update the displayed price & stock when size changes
        updatePagePrice();
        updateStockStatus();
      });

      pdpSizePills.appendChild(btn);
    });
  }

  // Quantity controls with Stock Limitation
  function refreshQtyButtonsState() {
    const maxStock = getSizeStock(currentProduct, selectedSize);
    if (pagePlusBtn) {
      const isMax = currentQty >= maxStock || maxStock <= 0;
      pagePlusBtn.style.opacity = isMax ? '0.35' : '1';
      pagePlusBtn.style.cursor = isMax ? 'not-allowed' : 'pointer';
    }
    if (pageMinusBtn) {
      const isMin = currentQty <= 1 || maxStock <= 0;
      pageMinusBtn.style.opacity = isMin ? '0.35' : '1';
      pageMinusBtn.style.cursor = isMin ? 'not-allowed' : 'pointer';
    }
  }

  if (pageMinusBtn) {
    pageMinusBtn.addEventListener('click', () => {
      const maxStock = getSizeStock(currentProduct, selectedSize);
      if (maxStock > 0 && currentQty > 1) {
        currentQty--;
        pageQtyVal.textContent = currentQty;
        refreshQtyButtonsState();
      }
    });
  }

  if (pagePlusBtn) {
    pagePlusBtn.addEventListener('click', () => {
      const maxStock = getSizeStock(currentProduct, selectedSize);
      if (maxStock <= 0) return;
      if (currentQty < maxStock) {
        currentQty++;
        pageQtyVal.textContent = currentQty;
        refreshQtyButtonsState();
      } else {
        showLuxuryToast(`Stock maximum : ${maxStock} pièce${maxStock > 1 ? 's' : ''} disponible${maxStock > 1 ? 's' : ''}`, 'info');
      }
    });
  }

  // Fly-to-Cart Animation starting directly FROM THE BUTTON
  function flyFromButtonToCart(buttonEl, product, qty, onComplete) {
    if (!buttonEl || !cartBtn) {
      if (onComplete) onComplete();
      return;
    }

    const startRect = buttonEl.getBoundingClientRect();
    const endRect = cartBtn.getBoundingClientRect();

    // Create a mini badge particle launched from the button
    const particle = document.createElement('div');
    particle.className = 'btn-fly-particle';
    particle.innerHTML = `
      <img src="${product.images?.front || ''}" alt="T-Shirt" class="btn-fly-img">
      <span class="btn-fly-qty">+${qty}</span>
    `;
    particle.style.top = `${startRect.top + startRect.height / 2 - 16}px`;
    particle.style.left = `${startRect.left + startRect.width / 2 - 30}px`;

    document.body.appendChild(particle);

    // Compute target vector towards top right cart button
    const targetX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const targetY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

    // Launch smoothly from button to cart icon
    requestAnimationFrame(() => {
      particle.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.35) rotate(14deg)`;
      particle.style.opacity = '0.2';
    });

    // Cleanup & trigger completion
    setTimeout(() => {
      particle.remove();
      if (onComplete) onComplete();
    }, 600);
  }

  // Add to cart button with Flight Effect & Inventory Validation
  if (pageAddToCartBtn) {
    pageAddToCartBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      const maxStock = getSizeStock(currentProduct, selectedSize);

      if (maxStock <= 0) {
        showLuxuryToast('Cette taille est actuellement en rupture de stock.', 'error');
        return;
      }

      const itemKey = `${currentProduct.id}_${selectedSize}`;
      const existing = cart.find(item => item.cartKey === itemKey || (item.id === currentProduct.id && item.size === selectedSize));
      const inCartQty = existing ? existing.qty : 0;

      if (inCartQty + currentQty > maxStock) {
        const remaining = maxStock - inCartQty;
        if (remaining <= 0) {
          showLuxuryToast(`Stock épuisé : vous avez déjà tout le stock disponible (${maxStock} pièces) dans votre panier.`, 'info');
          return;
        } else {
          showLuxuryToast(`Stock restant : plus que ${remaining} pièce${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}.`, 'info');
          currentQty = remaining;
          if (pageQtyVal) pageQtyVal.textContent = currentQty;
          refreshQtyButtonsState();
          return;
        }
      }

      const sizePrice = getSizePrice(currentProduct, selectedSize);

      flyFromButtonToCart(pageAddToCartBtn, currentProduct, currentQty, () => {
        if (existing) {
          existing.qty += currentQty;
          existing.price = sizePrice;
        } else {
          cart.push({
            id: currentProduct.id,
            cartKey: itemKey,
            title: `${currentProduct.title} (Taille ${selectedSize})`,
            size: selectedSize,
            price: sizePrice,
            image: currentProduct.images?.front || '',
            qty: currentQty
          });
        }
        saveCart();

        showLuxuryToast(`Ajouté au panier !`, 'success');

        // Trigger Cart Pulse Animation on header icon
        if (cartBtn) {
          cartBtn.classList.remove('cart-pulse-ring');
          void cartBtn.offsetWidth;
          cartBtn.classList.add('cart-pulse-ring');
          setTimeout(() => cartBtn.classList.remove('cart-pulse-ring'), 600);
        }
      });
    });
  }

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

  async function handleModalApplyPromo() {
    if (!modalPromoInput) return;
    const code = modalPromoInput.value.trim().toUpperCase();
    if (!code) {
      if (modalPromoFeedback) {
        modalPromoFeedback.style.color = '#dc2626';
        modalPromoFeedback.textContent = 'Veuillez entrer un code promo.';
      }
      return;
    }

    let promos = [];
    if (typeof dbGetPromoCodes === 'function') {
      try {
        promos = await dbGetPromoCodes();
      } catch (e) {
        console.error('Erreur chargement codes promo:', e);
        promos = [
          { code: 'ALLAIN10', type: 'percent', value: 10 },
          { code: 'VIP20', type: 'percent', value: 20 },
          { code: 'LIVRAISON', type: 'fixed', value: 1500 },
          { code: 'A2M5000', type: 'fixed', value: 5000 }
        ];
      }
    } else {
      promos = [
        { code: 'ALLAIN10', type: 'percent', value: 10 },
        { code: 'VIP20', type: 'percent', value: 20 },
        { code: 'LIVRAISON', type: 'fixed', value: 1500 },
        { code: 'A2M5000', type: 'fixed', value: 5000 }
      ];
    }

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

  if (modalApplyPromoBtn) modalApplyPromoBtn.addEventListener('click', async () => {
    await handleModalApplyPromo();
  });
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

  // Buy it now button -> Direct Delivery Modal with specific size price
  if (pageBuyNowBtn) {
    pageBuyNowBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      const sizePrice = getSizePrice(currentProduct, selectedSize);
      const subtotal = sizePrice * currentQty;
      const itemKey = `${currentProduct.id}_${selectedSize}`;
      const directItem = [{
        id: currentProduct.id,
        cartKey: itemKey,
        title: `${currentProduct.title} (Taille ${selectedSize})`,
        size: selectedSize,
        price: sizePrice,
        image: currentProduct.images?.front || '',
        qty: currentQty
      }];
      openDeliveryModal(directItem, subtotal);
    });
  }

  // Cart Drawer Events
  if (cartBtn) cartBtn.addEventListener('click', openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
  if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

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
    const custEmail = document.getElementById('custEmail')?.value.trim() || '';
    const custCity = document.getElementById('custCity')?.value.trim() || '';
    const custAddress = document.getElementById('custAddress')?.value.trim() || '';

    // Validation du nom (minimum 2 caractères)
    if (!custName || custName.length < 2) {
      alert('Veuillez entrer un nom et prénom valides (minimum 2 caractères).');
      return;
    }

    // Validation du téléphone (format international)
    const phoneRegex = /^\+?[0-9\s\-\(\)]{8,20}$/;
    if (!custPhone || !phoneRegex.test(custPhone)) {
      alert('Veuillez entrer un numéro de téléphone valide (ex: +225 07 00 00 00 00).');
      return;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!custEmail || !emailRegex.test(custEmail)) {
      alert('Veuillez entrer une adresse email valide (ex: jean.kouassi@email.com).');
      return;
    }

    // Validation de la commune
    if (!custCity) {
      alert('Veuillez sélectionner votre commune ou ville.');
      return;
    }

    // Validation de l'adresse (minimum 10 caractères)
    if (!custAddress || custAddress.length < 10) {
      alert('Veuillez entrer une adresse de livraison détaillée (minimum 10 caractères).');
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

      const discount = calculateCartDiscount(pendingOrderSubtotal);
      const newOrder = {
        id: 'CMD-' + Date.now(),
        customer: { name: custName, phone: custPhone, email: custEmail, city: custCity, address: custAddress },
        items: sanitizedItems,
        subtotal: pendingOrderSubtotal,
        discountAmount: discount,
        promoCode: activePromo ? activePromo.code : null,
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

      // Analytics: Track purchase
      if (typeof gtag !== 'undefined') {
        gtag('event', 'purchase', {
          transaction_id: newOrder.id,
          value: totalAmount,
          currency: 'XOF',
          items: sanitizedItems.map(i => ({
            item_id: i.id,
            item_name: i.title,
            price: i.price,
            quantity: i.qty
          }))
        });
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
        const waMsg = `NOUVELLE COMMANDE ALLAIN2MARIE%0A%0AClient : ${custName}%0ATéléphone : ${custPhone}%0AEmail : ${custEmail}%0ACommune : ${custCity}%0AAdresse de livraison : ${custAddress}%0A%0AArticles :%0A${itemsSummary}%0A%0ATotal : ${formatFCFA(totalAmount)}%0APaiement : Wave Business`;
        setTimeout(() => {
          try { window.open(`https://wa.me/?text=${waMsg}`, '_blank'); } catch(e) {}
        }, 1000);
      } catch(waErr) {
        console.error(waErr);
      }
    } catch(err) {
      console.error('Order submission error:', err);
      alert('Erreur: ' + (err.message || err));
    } finally {
      setTimeout(() => { isSubmittingOrder = false; }, 1500);
    }
  }

  if (deliveryForm) {
    deliveryForm.addEventListener('submit', handleOrderSubmit);
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeliveryModal();
      if (cartDrawer && cartDrawer.classList.contains('active')) closeCartDrawer();
    }
  });

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

  // ==========================================
  // LIVE SEARCH MODAL
  // ==========================================
  const searchBtn = document.getElementById('searchBtn');
  const searchModalOverlay = document.getElementById('searchModalOverlay');
  const closeSearchModalBtn = document.getElementById('closeSearchModalBtn');
  const searchBarInput = document.getElementById('searchBarInput');
  const searchResultsList = document.getElementById('searchResultsList');

  function openSearchModal() {
    if (searchModalOverlay) {
      searchModalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (searchBarInput) {
        searchBarInput.value = '';
        searchBarInput.focus();
      }
      renderSearchResults('');
    }
  }

  function closeSearchModal() {
    if (searchModalOverlay) {
      searchModalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function renderSearchResults(query) {
    if (!searchResultsList) return;
    const cleanQuery = query.trim().toLowerCase();
    const allProducts = getProducts();

    if (!cleanQuery) {
      searchResultsList.innerHTML = `<div class="search-empty-msg">Tapez pour rechercher un modèle…</div>`;
      return;
    }

    const matched = allProducts.filter(p => 
      (p.title && p.title.toLowerCase().includes(cleanQuery)) ||
      (p.category && p.category.toLowerCase().includes(cleanQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(cleanQuery))
    );

    if (matched.length === 0) {
      searchResultsList.innerHTML = `<div class="search-empty-msg">Aucun résultat trouvé pour « ${query} »</div>`;
      return;
    }

    searchResultsList.innerHTML = matched.map(p => `
      <a href="product.html?id=${p.id}" class="search-result-item">
        <div class="search-result-thumb">
          <img src="${p.images?.front || ''}" alt="${p.title}">
        </div>
        <div class="search-result-info">
          <div class="search-result-title">${p.title}</div>
          <div class="search-result-category">${p.category || 'Collection'}</div>
        </div>
        <div class="search-result-price">${formatFCFA(p.price)}</div>
      </a>
    `).join('');
  }

  if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
  if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', closeSearchModal);
  if (searchModalOverlay) {
    searchModalOverlay.addEventListener('click', (e) => {
      if (e.target === searchModalOverlay) closeSearchModal();
    });
  }
  if (searchBarInput) {
    searchBarInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });
  }

  // Init — avec fallback Firebase si localStorage est vide (premier visit sur mobile)
  updateCartUI();

  // ==========================================
  // REVIEWS EVENT LISTENERS
  // ==========================================


  // Charger les collections dynamiquement dans le menu burger
  function loadCollectionsInMenu() {
    const navMenuList = document.getElementById('navMenuList');
    if (!navMenuList) return;

    // Charger depuis localStorage d'abord (rapide)
    const localCollectionsRaw = localStorage.getItem('ALLAIN2MARIE_COLLECTIONS');
    let localCollections = [];
    if (localCollectionsRaw) {
      try {
        localCollections = JSON.parse(localCollectionsRaw);
      } catch (e) {}
    }

    // Si localStorage a des collections, les utiliser
    if (localCollections.length > 0) {
      renderCollectionsInMenu(localCollections);
    }

    // Ensuite synchroniser avec Firebase en arrière-plan si disponible
    if (typeof dbGetCollections === 'function') {
      dbGetCollections().then(cloudCollections => {
        renderCollectionsInMenu(cloudCollections);
      }).catch(() => {});
    }
  }

  function renderCollectionsInMenu(collections) {
    const navMenuList = document.getElementById('navMenuList');
    if (!navMenuList) return;

    // Récupérer les éléments statiques (Tous les T-Shirts et Mon Compte)
    const menuItems = Array.from(navMenuList.querySelectorAll('.nav-menu-item'));
    const tousTsItem = menuItems.find(item => item.textContent.includes('Tous les T-Shirts') || item.textContent.includes('Boutique'));
    const monCompteItem = menuItems.find(item => item.textContent.includes('Mon Compte'));

    // Supprimer tous les éléments sauf Tous les T-Shirts et Mon Compte
    menuItems.forEach(item => {
      if (item !== tousTsItem && item !== monCompteItem) {
        item.remove();
      }
    });

    // Ajouter les collections dynamiques (triées par nom)
    collections.sort((a, b) => a.name.localeCompare(b.name)).forEach(col => {
      const li = document.createElement('li');
      li.className = 'nav-menu-item';
      li.innerHTML = `
        <a href="index.html?category=${col.name.toLowerCase()}">
          <span>${col.name}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
      `;
      // Insérer après Tous les T-Shirts et avant Mon Compte
      if (monCompteItem) {
        navMenuList.insertBefore(li, monCompteItem);
      } else if (tousTsItem) {
        navMenuList.appendChild(li);
      } else {
        navMenuList.appendChild(li);
      }
    });
  }

  // Charger les collections
  loadCollectionsInMenu();

  const localProds = await getProducts();
  const params = new URLSearchParams(window.location.search);
  const urlProductId = params.get('id');

  // Charger depuis localStorage uniquement
  await initProductPage();

  // ==========================================
  // NEWSLETTER SUBSCRIPTION FORM
  // ==========================================
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterEmail = document.getElementById('newsletterEmail');

  if (newsletterForm && newsletterEmail) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = newsletterEmail.value.trim();
      if (!email || !email.includes('@')) {
        showLuxuryToast('Veuillez entrer une adresse email valide', 'error');
        return;
      }

      try {
        // Vérifier si déjà inscrit localement
        const subscriptions = typeof dbGetNewsletterSubscriptions === 'function' 
          ? await dbGetNewsletterSubscriptions() 
          : [];
        
        const alreadySubscribed = subscriptions.some(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (alreadySubscribed) {
          showLuxuryToast('Vous êtes déjà inscrit à notre newsletter !', 'info');
          newsletterEmail.value = '';
          return;
        }

        // Essayer l'inscription Mailchimp d'abord
        let mailchimpSuccess = false;
        if (typeof subscribeToMailchimp === 'function') {
          try {
            const mailchimpResult = await subscribeToMailchimp(email);
            mailchimpSuccess = mailchimpResult.success;
            console.log('Mailchimp inscription:', mailchimpSuccess);
          } catch (mailchimpError) {
            console.warn('Mailchimp non disponible, fallback localStorage:', mailchimpError);
          }
        }

        // S'inscrire localement (toujours)
        if (typeof dbSubscribeNewsletter === 'function') {
          await dbSubscribeNewsletter(email);
        } else {
          // Fallback localStorage
          let localSubs = JSON.parse(localStorage.getItem('ALLAIN2MARIE_NEWSLETTER') || '[]');
          localSubs.push({
            id: 'sub_' + Date.now(),
            email: email.toLowerCase(),
            subscribedAt: new Date().toISOString(),
            active: true,
            mailchimpSynced: mailchimpSuccess
          });
          localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify(localSubs));
        }

        if (mailchimpSuccess) {
          showLuxuryToast('Merci ! Vous recevrez nos offres exclusives par email.', 'success');
        } else {
          showLuxuryToast('Merci pour votre inscription à la newsletter ALLAIN2MARIE !', 'success');
        }
        newsletterEmail.value = '';
      } catch (error) {
        console.error('Erreur inscription newsletter:', error);
        showLuxuryToast('Une erreur est survenue. Veuillez réessayer.', 'error');
      }
    });
  }

  // ==========================================
  // AUTHENTICATION STATE MANAGEMENT
  // ==========================================
  const menuBtn = document.getElementById('menuBtn');
  const navDrawer = document.getElementById('navDrawer');
  const navDrawerOverlay = document.getElementById('navDrawerOverlay');
  const closeNavDrawerBtn = document.getElementById('closeNavDrawerBtn');
  const navAuthLink = document.getElementById('navAuthLink');
  const navAuthText = document.getElementById('navAuthText');
  const navLogoutItem = document.getElementById('navLogoutItem');
  const navLogoutBtn = document.getElementById('navLogoutBtn');

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

  function updateAuthUI() {
    const userName = localStorage.getItem('A2M_USER_NAME');
    const userEmail = localStorage.getItem('A2M_USER_EMAIL');
    const userUid = localStorage.getItem('A2M_USER_UID');
    const isLoggedIn = !!userUid;

    if (isLoggedIn) {
      // User is logged in
      if (navAuthLink) {
        navAuthLink.href = 'auth.html';
        navAuthText.textContent = userName ? `Bonjour, ${userName.split(' ')[0]}` : 'Mon Compte';
      }
      if (navLogoutItem) {
        navLogoutItem.style.display = 'block';
      }
    } else {
      // User is logged out
      if (navAuthLink) {
        navAuthLink.href = 'auth.html';
        navAuthText.textContent = 'Connexion';
      }
      if (navLogoutItem) {
        navLogoutItem.style.display = 'none';
      }
    }
  }

  // Logout from navigation menu
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async () => {
      // Clear Firebase auth if available
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          await firebase.auth().signOut();
        } catch (e) {
          console.error('Firebase sign out error:', e);
        }
      }

      // Clear local storage
      localStorage.removeItem('A2M_USER_NAME');
      localStorage.removeItem('A2M_USER_EMAIL');
      localStorage.removeItem('A2M_USER_PHOTO');
      localStorage.removeItem('A2M_USER_UID');

      // Update UI
      updateAuthUI();
      closeNavDrawer();

      // Show toast notification
      showLuxuryToast('Vous avez été déconnecté', 'success');

      // Redirect to home page
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    });
  }

  // Initial auth UI update
  updateAuthUI();

  // Listen for Firebase auth state changes
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        localStorage.setItem('A2M_USER_NAME', user.displayName || user.email || 'Utilisateur');
        localStorage.setItem('A2M_USER_EMAIL', user.email || '');
        localStorage.setItem('A2M_USER_PHOTO', user.photoURL || '');
        localStorage.setItem('A2M_USER_UID', user.uid);
      } else {
        localStorage.removeItem('A2M_USER_NAME');
        localStorage.removeItem('A2M_USER_EMAIL');
        localStorage.removeItem('A2M_USER_PHOTO');
        localStorage.removeItem('A2M_USER_UID');
      }
      updateAuthUI();
    });
  }

  // Add Escape key handler for navigation drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (navDrawer && navDrawer.classList.contains('active')) {
        closeNavDrawer();
      }
    }
  });
});


