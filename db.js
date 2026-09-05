/**
 * ALLAIN2MARIE - Cloud Database Synchronization Module (Firebase Firestore)
 * 
 * Ce module gère la synchronisation en temps réel des t-shirts, stocks et commandes
 * avec Firebase Firestore (Google Cloud) tout en assurant un fonctionnement 100% hors-ligne
 * avec localStorage en cas de besoin.
 */

// Configuration Firebase Officielle ALLAIN2MARIE
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB6cAe6-arrXcVZ6ql_bumayIENs7jin3E",
  authDomain: "allain2marie.firebaseapp.com",
  projectId: "allain2marie",
  storageBucket: "allain2marie.firebasestorage.app",
  messagingSenderId: "648589896167",
  appId: "1:648589896167:web:3bd8a17a73423c07703542"
};

// Liste des administrateurs autorisés (par email)
const ADMIN_EMAILS = [
  'mokepatrickarmel@gmail.com',
  'allain2marie@gmail.com',
  'thesouscote@gmail.com',
  'sidibemohamedlamine60@gmail.com',
  // Ajoutez d'autres emails d'admin ici
];

let db = null;
let isFirebaseInitialized = false;

// ==========================================
// SYSTÈME DE CHIFFREMENT SÉCURISÉ (AES-GCM)
// ==========================================

const ENCRYPTION_KEY = 'ALLAIN2MARIE_SECURE_KEY_2024'; // Clé de chiffrement (à garder secrète)
const ENCRYPTION_SALT = 'ALLAIN2MARIE_SALT_SECURE'; // Salt pour le dérivé de clé

/**
 * Génère une clé de chiffrement à partir de la clé maître
 */
async function deriveKey() {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(ENCRYPTION_SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre une chaîne de caractères
 */
async function encryptData(data) {
  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV unique pour chaque chiffrement
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(data)
    );
    
    // Combiner IV et données chiffrées pour le stockage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convertir en base64 pour le stockage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Erreur de chiffrement:', error);
    return data; // Fallback: retourner les données non chiffrées en cas d'erreur
  }
}

/**
 * Déchiffre une chaîne de caractères
 */
async function decryptData(encryptedData) {
  try {
    const key = await deriveKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erreur de déchiffrement:', error);
    return encryptedData; // Fallback: retourner les données telles quelles en cas d'erreur
  }
}

/**
 * Chiffre un objet JSON
 */
async function encryptObject(obj) {
  try {
    const jsonString = JSON.stringify(obj);
    return await encryptData(jsonString);
  } catch (error) {
    console.error('Erreur de chiffrement d\'objet:', error);
    return JSON.stringify(obj); // Fallback
  }
}

/**
 * Déchiffre un objet JSON
 */
async function decryptObject(encryptedString) {
  try {
    const decryptedString = await decryptData(encryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Erreur de déchiffrement d\'objet:', error);
    try {
      return JSON.parse(encryptedString); // Fallback: essayer de parser directement
    } catch {
      return null;
    }
  }
}

/**
 * Sauvegarde chiffrée dans localStorage (pour données sensibles uniquement)
 */
async function saveEncrypted(key, data) {
  try {
    const encrypted = await encryptObject(data);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error(`Erreur de sauvegarde chiffrée pour ${key}:`, error);
    // Fallback: sauvegarder non chiffré
    localStorage.setItem(key, JSON.stringify(data));
  }
}

/**
 * Chargement déchiffré depuis localStorage (pour données sensibles uniquement)
 */
async function loadEncrypted(key, defaultValue = null) {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return defaultValue;
    
    const decrypted = await decryptObject(encrypted);
    return decrypted !== null ? decrypted : defaultValue;
  } catch (error) {
    console.error(`Erreur de chargement déchiffré pour ${key}:`, error);
    // Fallback: essayer de charger directement
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

/**
 * Sauvegarde normale (non chiffrée) pour les données standard
 */
function saveNormal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Erreur de sauvegarde normale pour ${key}:`, error);
  }
}

/**
 * Chargement normal (non chiffré) pour les données standard
 */
function loadNormal(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.error(`Erreur de chargement normal pour ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Sauvegarde intelligente : chiffre seulement les données sensibles
 */
async function saveSmart(key, data) {
  // Clés de données sensibles qui doivent être chiffrées
  const sensitiveKeys = [
    'ALLAIN2MARIE_ADMIN_CONFIG',
    'ALLAIN2MARIE_USER_DATA',
    'ALLAIN2MARIE_PAYMENT_INFO',
    'ALLAIN2MARIE_SENSITIVE'
  ];
  
  if (sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey))) {
    await saveEncrypted(key, data);
  } else {
    saveNormal(key, data);
  }
}

/**
 * Chargement intelligent : déchiffre seulement les données sensibles
 */
async function loadSmart(key, defaultValue = null) {
  // Clés de données sensibles qui doivent être chiffrées
  const sensitiveKeys = [
    'ALLAIN2MARIE_ADMIN_CONFIG',
    'ALLAIN2MARIE_USER_DATA',
    'ALLAIN2MARIE_PAYMENT_INFO',
    'ALLAIN2MARIE_SENSITIVE'
  ];
  
  if (sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey))) {
    return await loadEncrypted(key, defaultValue);
  } else {
    return loadNormal(key, defaultValue);
  }
}

function toCloudImageUrl(value) {
  if (!value || typeof value !== 'string') return '';
  let url = value.trim().replace(/^["']|["']$/g, '');
  const markdown = url.match(/\((https?:\/\/[^)\s]+)\)/);
  if (markdown) url = markdown[1];
  if (/^https?:\/\//i.test(url)) return url;
  return '';
}

function getProductImage(product, slot) {
  if (!product) return '';
  if (product.images && product.images[slot]) return product.images[slot];
  if (slot === 'front') return product.frontImage || '';
  if (slot === 'back') return product.backImage || '';
  return '';
}

async function writeLocalProducts(list) {
  try {
    await saveSmart('ALLAIN2MARIE_PRODUCTS', list);
  } catch (err) {
    console.warn('Quota localStorage, cache léger:', err);
    const light = list.map(p => ({
      ...p,
      images: {
        front: toCloudImageUrl(p.images?.front),
        back: toCloudImageUrl(p.images?.back)
      }
    }));
    await saveSmart('ALLAIN2MARIE_PRODUCTS', light);
  }
}

function prepareProductForCloud(product) {
  const prepared = JSON.parse(JSON.stringify(product || {}));
  if (!prepared.images) prepared.images = {};
  prepared.images.front = toCloudImageUrl(getProductImage(prepared, 'front'));
  prepared.images.back = toCloudImageUrl(getProductImage(prepared, 'back'));
  delete prepared.frontImage;
  delete prepared.backImage;
  return prepared;
}

// 1. Initialisation de Firebase
function initFirebaseDB() {
  const savedConfig = localStorage.getItem('ALLAIN2MARIE_FIREBASE_CONFIG');
  const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

  if (config.projectId && config.apiKey && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      db = firebase.firestore();
      isFirebaseInitialized = true;
      console.log('Base de données Firebase Firestore connectée avec succès !');
    } catch (err) {
      console.warn('Erreur initialisation Firebase, utilisation du mode local:', err);
      isFirebaseInitialized = false;
    }
  } else {
    isFirebaseInitialized = false;
  }
}

// 2. Gestion des Produits (Catalogue & Stocks)
async function dbGetProducts() {
  const local = await loadSmart('ALLAIN2MARIE_PRODUCTS', []);
  if (!isFirebaseInitialized || !db) return local;

  try {
    const snapshot = await db.collection('products').get();
    const cloudProducts = [];
    snapshot.forEach(doc => {
      cloudProducts.push({ id: doc.id, ...doc.data() });
    });

    if (cloudProducts.length > 0) {
      cloudProducts.sort((a, b) => {
        const da = a.createdAt || a.updatedAt || '';
        const db2 = b.createdAt || b.updatedAt || '';
        return da < db2 ? 1 : -1;
      });
      writeLocalProducts(cloudProducts);
      return cloudProducts;
    }
  } catch (err) {
    console.warn('Récupération Cloud impossible, utilisation du cache local:', err);
  }
  return local;
}

async function dbSaveProduct(product) {
  if (!product || !product.id) {
    throw new Error('Produit invalide');
  }

  let local = await loadSmart('ALLAIN2MARIE_PRODUCTS', []);
  const idx = local.findIndex(p => p.id === product.id);
  if (idx !== -1) {
    local[idx] = product;
  } else {
    local.unshift(product);
  }
  writeLocalProducts(local);

  if (!isFirebaseInitialized || !db) {
    throw new Error('Firebase non connecté — le t-shirt reste seulement sur cet appareil');
  }

  const cloudProduct = prepareProductForCloud(product);
  if (!cloudProduct.images.front) {
    throw new Error('Ajoutez un lien photo (Lunacy) — les images ne sont plus stockées');
  }
  await db.collection('products').doc(cloudProduct.id).set(cloudProduct);

  local = await loadSmart('ALLAIN2MARIE_PRODUCTS', []);
  const cloudIdx = local.findIndex(p => p.id === cloudProduct.id);
  if (cloudIdx !== -1) local[cloudIdx] = cloudProduct;
  else local.unshift(cloudProduct);
  writeLocalProducts(local);

  console.log('Produit synchronisé sur Firebase:', cloudProduct.id);
  return cloudProduct;
}

async function dbDeleteProduct(productId) {
  // 1. Suppression locale
  let local = await loadSmart('ALLAIN2MARIE_PRODUCTS', []);
  local = local.filter(p => p.id !== productId);
  await saveSmart('ALLAIN2MARIE_PRODUCTS', local);

  // 2. Suppression Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('products').doc(productId).delete();
      console.log('Produit supprimé de Firebase Firestore:', productId);
    } catch (err) {
      console.error('Erreur suppression Cloud:', err);
    }
  }
}

// 3. Gestion des Commandes & Coordonnées de Livraison
async function sanitizeLocalOrders() {
  try {
    const raw = await loadSmart('ALLAIN2MARIE_ORDERS', []);
    const uniqueMap = new Map();
    raw.forEach(o => {
      if (o && o.id && !uniqueMap.has(o.id)) {
        uniqueMap.set(o.id, o);
      }
    });
    const uniqueOrders = Array.from(uniqueMap.values());
    await saveSmart('ALLAIN2MARIE_ORDERS', uniqueOrders.slice(0, 50));
    return uniqueOrders;
  } catch (e) {
    return [];
  }
}

async function dbGetOrders() {
  const local = await sanitizeLocalOrders();
  if (!isFirebaseInitialized || !db) return local;

  try {
    // PAS de orderBy — evite erreurs si certaines commandes n'ont pas createdAt
    const snapshot = await db.collection('orders').get();
    const cloudOrders = [];
    snapshot.forEach(doc => {
      cloudOrders.push({ id: doc.id, ...doc.data() });
    });
    if (cloudOrders.length > 0) {
      // Merge avec local + dedup par ID
      const orderMap = new Map();
      cloudOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
      local.forEach(o => { if (o && o.id && !orderMap.has(o.id)) orderMap.set(o.id, o); });
      // Tri côté client
      const mergedOrders = Array.from(orderMap.values())
        .sort((a, b) => ((a.createdAt || '') < (b.createdAt || '') ? 1 : -1))
        .slice(0, 50);
      await saveSmart('ALLAIN2MARIE_ORDERS', mergedOrders);
      return mergedOrders;
    }
  } catch (err) {
    console.warn('Récupération commandes Cloud impossible, cache local utilisé:', err);
  }
  return local;
}

async function dbSaveOrder(order) {
  // 1. Sauvegarde locale avec déduplication stricte par ID
  let local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
  const idx = local.findIndex(o => o.id === order.id);
  if (idx !== -1) {
    local[idx] = order;
  } else {
    local.unshift(order);
  }
  local = local.slice(0, 50);
  await saveSmart('ALLAIN2MARIE_ORDERS', local);

  // 2. Sauvegarde Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(order.id).set(order);
      console.log('Commande enregistrée dans Firebase Firestore:', order.id);
    } catch (err) {
      console.error('Erreur enregistrement commande Cloud:', err);
    }
  }
}

async function dbUpdateOrderStatus(orderId, newStatus) {
  let local = await loadSmart('ALLAIN2MARIE_ORDERS', []);
  const found = local.find(o => o.id === orderId);
  if (found) {
    found.deliveryStatus = newStatus;
    await saveSmart('ALLAIN2MARIE_ORDERS', local);
  }

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(orderId).update({ deliveryStatus: newStatus });
      console.log('Statut commande mis à jour sur Firebase:', orderId, newStatus);
    } catch (err) {
      console.error('Erreur mise à jour statut Cloud:', err);
    }
  }
}

async function dbDeleteOrder(orderId) {
  let local = await loadSmart('ALLAIN2MARIE_ORDERS', []);
  local = local.filter(o => o.id !== orderId);
  await saveSmart('ALLAIN2MARIE_ORDERS', local);

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(orderId).delete();
      console.log('Commande supprimée de Firebase:', orderId);
    } catch (err) {
      console.error('Erreur suppression commande Cloud:', err);
    }
  }
}

// 4. Gestion des Collections / Catégories personnalisées
const DEFAULT_COLLECTIONS = [
  { id: 'col_sig', name: 'Signature', code: 'SIG', description: 'Modèles phares et logos emblématiques' },
  { id: 'col_d01', name: 'Drop 01', code: 'D01', description: 'Première capsule exclusive' },
  { id: 'col_ess', name: 'Essentiels', code: 'ESS', description: 'Basiques intemporels haut de gamme' },
  { id: 'col_ltd', name: 'Édition Limitée', code: 'LTD', description: 'Pièces rares en tirage limité' }
];

function dbGetLocalCollections() {
  try {
    const raw = localStorage.getItem('ALLAIN2MARIE_COLLECTIONS');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(DEFAULT_COLLECTIONS));
  return DEFAULT_COLLECTIONS;
}

async function dbGetCollections() {
  const local = dbGetLocalCollections();
  if (!isFirebaseInitialized || !db) return local;

  try {
    const doc = await db.collection('settings').doc('collections').get();
    if (doc.exists && doc.data().list && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
      const cloudList = doc.data().list;
      await saveSmart('ALLAIN2MARIE_COLLECTIONS', cloudList);
      return cloudList;
    } else {
      // Seed Firebase with default collections if not yet present
      await db.collection('settings').doc('collections').set({
        list: local,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Récupération collections Cloud impossible, cache local utilisé:', err);
  }
  return local;
}

async function dbSaveCollections(collections) {
  await saveSmart('ALLAIN2MARIE_COLLECTIONS', collections);

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('settings').doc('collections').set({
        list: collections,
        updatedAt: new Date().toISOString()
      });
      console.log('Collections synchronisées sur Firebase Firestore !');
    } catch (err) {
      console.error('Erreur sauvegarde collections Cloud:', err);
    }
  }
}

// 5. Gestion des Codes Promo
const DEFAULT_PROMOS = [
  { code: 'ALLAIN10', type: 'percent', value: 10, description: '10% de réduction' },
  { code: 'VIP20', type: 'percent', value: 20, description: '20% de réduction VIP' },
  { code: 'LIVRAISON', type: 'fixed', value: 1500, description: '1 500 FCFA offerts' },
  { code: 'A2M5000', type: 'fixed', value: 5000, description: '5 000 FCFA de remise' }
];

async function dbGetPromoCodes() {
  try {
    const raw = localStorage.getItem('ALLAIN2MARIE_PROMOS');
    if (!raw) {
      localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(DEFAULT_PROMOS));
    }
    const localPromos = JSON.parse(localStorage.getItem('ALLAIN2MARIE_PROMOS') || '[]');

    // Synchroniser avec Firebase
    if (isFirebaseInitialized && db) {
      try {
        const doc = await db.collection('settings').doc('promos').get();
        if (doc.exists && doc.data().list) {
          const cloudPromos = doc.data().list;
          localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(cloudPromos));
          return cloudPromos;
        }
      } catch (e) {
        console.warn('Erreur synchronisation codes promo Firebase:', e);
      }
    }
    return localPromos;
  } catch (e) {
    return DEFAULT_PROMOS;
  }
}

async function dbSavePromoCodes(promos) {
  localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(promos));
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('settings').doc('promos').set({
        list: promos,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}
  }
}

// 6. Gestion des Newsletter Subscriptions
function dbGetLocalNewsletterSubscriptions() {
  try {
    const raw = localStorage.getItem('ALLAIN2MARIE_NEWSLETTER');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify([]));
  return [];
}

async function dbGetNewsletterSubscriptions() {
  const local = dbGetLocalNewsletterSubscriptions();
  if (!isFirebaseInitialized || !db) return local;

  try {
    const snapshot = await db.collection('newsletter').get();
    const cloudSubscriptions = [];
    snapshot.forEach(doc => {
      cloudSubscriptions.push({ id: doc.id, ...doc.data() });
    });
    
    if (cloudSubscriptions.length > 0) {
      // Merge avec local + dedup par email
      const emailMap = new Map();
      cloudSubscriptions.forEach(s => { 
        if (s && s.email) emailMap.set(s.email.toLowerCase(), s); 
      });
      local.forEach(s => { 
        if (s && s.email && !emailMap.has(s.email.toLowerCase())) {
          emailMap.set(s.email.toLowerCase(), s);
        }
      });
      
      const mergedSubscriptions = Array.from(emailMap.values())
        .sort((a, b) => ((a.subscribedAt || '') < (b.subscribedAt || '') ? 1 : -1));
      
      localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify(mergedSubscriptions));
      return mergedSubscriptions;
    }
  } catch (err) {
    console.warn('Récupération newsletter Cloud impossible, cache local utilisé:', err);
  }
  return local;
}

async function dbSubscribeNewsletter(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Email invalide');
  }

  const emailLower = email.toLowerCase();
  const timestamp = new Date().toISOString();
  const subscription = {
    id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    email: emailLower,
    subscribedAt: timestamp,
    active: true
  };

  // 1. Sauvegarde locale avec déduplication par email
  let local = dbGetLocalNewsletterSubscriptions();
  const existingIndex = local.findIndex(s => s.email.toLowerCase() === emailLower);
  
  if (existingIndex !== -1) {
    // Réactiver si déjà existant
    local[existingIndex].active = true;
    local[existingIndex].subscribedAt = timestamp;
  } else {
    local.unshift(subscription);
  }
  
  localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify(local));

  // 2. Sauvegarde Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('newsletter').doc(subscription.id).set(subscription);
      console.log('Newsletter enregistrée dans Firebase Firestore:', emailLower);
    } catch (err) {
      console.error('Erreur enregistrement newsletter Cloud:', err);
    }
  }

  return subscription;
}

async function dbUnsubscribeNewsletter(email) {
  const emailLower = email.toLowerCase();
  
  // 1. Suppression locale
  let local = dbGetLocalNewsletterSubscriptions();
  local = local.filter(s => s.email.toLowerCase() !== emailLower);
  localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify(local));

  // 2. Suppression Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection('newsletter').where('email', '==', emailLower).get();
      snapshot.forEach(doc => {
        doc.ref.delete();
      });
      console.log('Newsletter supprimée de Firebase:', emailLower);
    } catch (err) {
      console.error('Erreur suppression newsletter Cloud:', err);
    }
  }
}

async function dbDeleteNewsletterSubscription(subscriptionId) {
  // 1. Suppression locale
  let local = dbGetLocalNewsletterSubscriptions();
  local = local.filter(s => s.id !== subscriptionId);
  localStorage.setItem('ALLAIN2MARIE_NEWSLETTER', JSON.stringify(local));

  // 2. Suppression Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('newsletter').doc(subscriptionId).delete();
      console.log('Newsletter supprimée de Firebase:', subscriptionId);
    } catch (err) {
      console.error('Erreur suppression newsletter Cloud:', err);
    }
  }
}

// 7. Configuration Mailchimp
const DEFAULT_MAILCHIMP_CONFIG = {
  apiKey: 'md-WnQPgR39hK_77Wi4H9YHqw',
  listId: '', // Sera configuré dans l'admin
  enabled: true // Activé par défaut avec la clé API fournie
};

function getMailchimpConfig() {
  try {
    const saved = localStorage.getItem('ALLAIN2MARIE_MAILCHIMP_CONFIG');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return DEFAULT_MAILCHIMP_CONFIG;
}

function saveMailchimpConfig(config) {
  localStorage.setItem('ALLAIN2MARIE_MAILCHIMP_CONFIG', JSON.stringify(config));
}

// Intégration Mailchimp API
async function subscribeToMailchimp(email, config = null) {
  const mailchimpConfig = config || getMailchimpConfig();
  
  if (!mailchimpConfig.enabled || !mailchimpConfig.apiKey || !mailchimpConfig.listId) {
    throw new Error('Mailchimp non configuré');
  }

  // Extraire le serveur de la clé API (format: xxx-usxx)
  const apiKeyParts = mailchimpConfig.apiKey.split('-');
  if (apiKeyParts.length < 2) {
    throw new Error('Clé API Mailchimp invalide');
  }
  const server = apiKeyParts[1];

  const url = `https://${server}.api.mailchimp.com/3.0/lists/${mailchimpConfig.listId}/members`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa('anystring:' + mailchimpConfig.apiKey)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: '',
          LNAME: ''
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Mailchimp: Abonnement réussi pour', email);
      return { success: true, data };
    } else {
      // Gérer les erreurs spécifiques Mailchimp
      if (data.title === 'Member Exists') {
        console.log('Mailchimp: Email déjà existant', email);
        return { success: true, alreadyExists: true, data };
      }
      throw new Error(data.detail || 'Erreur Mailchimp');
    }
  } catch (error) {
    console.error('Erreur Mailchimp:', error);
    throw error;
  }
}



// 9. Vérification Admin (sécurisée)
function dbIsAdminUser(email) {
  if (!email || typeof email !== 'string') {
    console.warn('dbIsAdminUser: email invalide ou manquant');
    return false;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validation du format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    console.warn('dbIsAdminUser: format email invalide:', normalizedEmail);
    return false;
  }
  
  const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);
  
  if (!isAdmin) {
    console.warn('dbIsAdminUser: accès refusé pour email:', normalizedEmail);
  } else {
    console.log('dbIsAdminUser: accès autorisé pour email:', normalizedEmail);
  }
  
  return isAdmin;
}

// Initialisation immédiate au chargement du script
initFirebaseDB();
