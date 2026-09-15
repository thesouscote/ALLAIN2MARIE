/**
 * Script pour définir le statut du site sur Firebase
 * Utilisation : node set-site-status.js open
 *            : node set-site-status.js close
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialiser Firebase Admin avec le compte de service
let db;
try {
  const serviceAccount = require('./service-account-key.json');
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: 'allain2marie'
  });
  db = getFirestore(app);
} catch (error) {
  console.error('Erreur lors de l\'initialisation Firebase Admin:', error);
  console.error('Assurez-vous que le fichier service-account-key.json existe');
  process.exit(1);
}

async function setSiteStatus(status) {
  try {
    const isOpen = status === 'open';
    
    await db.collection('settings').doc('site').set({
      isOpen: isOpen,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Statut du site mis à jour sur Firebase : ${isOpen ? 'OUVERT' : 'FERMÉ'}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut :', error);
    process.exit(1);
  }
}

// Récupérer l'argument de ligne de commande
const command = process.argv[2];

if (command === 'open') {
  setSiteStatus('open');
} else if (command === 'close') {
  setSiteStatus('close');
} else {
  console.log('Usage: node set-site-status.js [open|close]');
  console.log('  open  : Ouvrir le site');
  console.log('  close : Fermer le site');
  process.exit(1);
}
