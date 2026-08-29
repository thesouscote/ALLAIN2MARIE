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

let db = null;
let isFirebaseInitialized = false;

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
      console.log('⚡ Base de données Firebase Firestore connectée avec succès !');
    } catch (err) {
      console.warn('⚠️ Erreur initialisation Firebase, utilisation du mode local:', err);
      isFirebaseInitialized = false;
    }
  } else {
    isFirebaseInitialized = false;
  }
}

// 2. Gestion des Produits (Catalogue & Stocks)
async function dbGetProducts() {
  const local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_PRODUCTS') || '[]');
  if (!isFirebaseInitialized || !db) return local;

  try {
    // PAS de orderBy — evite les erreurs si certains produits n'ont pas createdAt
    const snapshot = await db.collection('products').get();
    const cloudProducts = [];
    snapshot.forEach(doc => {
      cloudProducts.push({ id: doc.id, ...doc.data() });
    });

    if (cloudProducts.length > 0) {
      // Tri côte client par date décroissante (safe meme sans createdAt)
      cloudProducts.sort((a, b) => {
        const da = a.createdAt || a.updatedAt || '';
        const db2 = b.createdAt || b.updatedAt || '';
        return da < db2 ? 1 : -1;
      });
      localStorage.setItem('ALLAIN2MARIE_PRODUCTS', JSON.stringify(cloudProducts));
      return cloudProducts;
    }
    // Firestore vide mais pas d'erreur → retourner le local
  } catch (err) {
    console.warn('⚠️ Récupération Cloud impossible, utilisation du cache local:', err);
  }
  return local;
}

async function dbSaveProduct(product) {
  // 1. Sauvegarde locale immédiate
  let local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_PRODUCTS') || '[]');
  const idx = local.findIndex(p => p.id === product.id);
  if (idx !== -1) {
    local[idx] = product;
  } else {
    local.unshift(product);
  }
  localStorage.setItem('ALLAIN2MARIE_PRODUCTS', JSON.stringify(local));

  // 2. Synchronisation Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('products').doc(product.id).set(product);
      console.log('☁️ Produit synchronisé sur Firebase Firestore:', product.id);
    } catch (err) {
      console.error('❌ Erreur sauvegarde Cloud:', err);
    }
  }
}

async function dbDeleteProduct(productId) {
  // 1. Suppression locale
  let local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_PRODUCTS') || '[]');
  local = local.filter(p => p.id !== productId);
  localStorage.setItem('ALLAIN2MARIE_PRODUCTS', JSON.stringify(local));

  // 2. Suppression Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('products').doc(productId).delete();
      console.log('☁️ Produit supprimé de Firebase Firestore:', productId);
    } catch (err) {
      console.error('❌ Erreur suppression Cloud:', err);
    }
  }
}

// 3. Gestion des Commandes & Coordonnées de Livraison
function sanitizeLocalOrders() {
  try {
    const raw = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
    const uniqueMap = new Map();
    raw.forEach(o => {
      if (o && o.id && !uniqueMap.has(o.id)) {
        uniqueMap.set(o.id, o);
      }
    });
    const uniqueOrders = Array.from(uniqueMap.values());
    localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(uniqueOrders.slice(0, 50)));
    return uniqueOrders;
  } catch (e) {
    return [];
  }
}

async function dbGetOrders() {
  const local = sanitizeLocalOrders();
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
      localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(mergedOrders));
      return mergedOrders;
    }
  } catch (err) {
    console.warn('⚠️ Récupération commandes Cloud impossible, cache local utilisé:', err);
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
  localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(local));

  // 2. Sauvegarde Cloud Firebase
  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(order.id).set(order);
      console.log('☁️ Commande enregistrée dans Firebase Firestore:', order.id);
    } catch (err) {
      console.error('❌ Erreur enregistrement commande Cloud:', err);
    }
  }
}

async function dbUpdateOrderStatus(orderId, newStatus) {
  let local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
  const found = local.find(o => o.id === orderId);
  if (found) {
    found.deliveryStatus = newStatus;
    localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(local));
  }

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(orderId).update({ deliveryStatus: newStatus });
      console.log('☁️ Statut commande mis à jour sur Firebase:', orderId, newStatus);
    } catch (err) {
      console.error('❌ Erreur mise à jour statut Cloud:', err);
    }
  }
}

async function dbDeleteOrder(orderId) {
  let local = JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
  local = local.filter(o => o.id !== orderId);
  localStorage.setItem('ALLAIN2MARIE_ORDERS', JSON.stringify(local));

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('orders').doc(orderId).delete();
      console.log('☁️ Commande supprimée de Firebase:', orderId);
    } catch (err) {
      console.error('❌ Erreur suppression commande Cloud:', err);
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
      localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(cloudList));
      return cloudList;
    } else {
      // Seed Firebase with default collections if not yet present
      await db.collection('settings').doc('collections').set({
        list: local,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('⚠️ Récupération collections Cloud impossible, cache local utilisé:', err);
  }
  return local;
}

async function dbSaveCollections(collections) {
  localStorage.setItem('ALLAIN2MARIE_COLLECTIONS', JSON.stringify(collections));

  if (isFirebaseInitialized && db) {
    try {
      await db.collection('settings').doc('collections').set({
        list: collections,
        updatedAt: new Date().toISOString()
      });
      console.log('☁️ Collections synchronisées sur Firebase Firestore !');
    } catch (err) {
      console.error('❌ Erreur sauvegarde collections Cloud:', err);
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

function dbGetPromoCodes() {
  try {
    const raw = localStorage.getItem('ALLAIN2MARIE_PROMOS');
    if (!raw) {
      localStorage.setItem('ALLAIN2MARIE_PROMOS', JSON.stringify(DEFAULT_PROMOS));
      return DEFAULT_PROMOS;
    }
    return JSON.parse(raw);
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

// Initialisation immédiate au chargement du script
initFirebaseDB();
