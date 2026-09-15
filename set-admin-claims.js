/**
 * Script pour définir les Custom Claims Firebase pour les administrateurs
 * 
 * Ce script doit être exécuté avec Node.js et Firebase Admin SDK
 * Il nécessite un compte de service Firebase avec les permissions appropriées
 * 
 * Usage:
 * 1. Créer un compte de service dans la console Firebase
 * 2. Télécharger le fichier JSON du compte de service
 * 3. Renommer le fichier en 'service-account-key.json'
 * 4. Installer les dépendances: npm install firebase-admin
 * 5. Exécuter: node set-admin-claims.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Liste des emails administrateurs
const ADMIN_EMAILS = [
  'mokepatrickarmel@gmail.com',
  'allain2marie@gmail.com',
  'thesouscote@gmail.com',
  'sidibemohamedlamine60@gmail.com',
  'Jeannoelehoussou@gmail.com'
];

// Initialiser Firebase Admin avec le compte de service
let auth;
try {
  const serviceAccount = require('./service-account-key.json');
  console.log('Fichier de compte de service chargé:', serviceAccount.project_id);
  
  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  
  auth = getAuth(app);
  console.log('Firebase Admin initialisé avec succès');
} catch (error) {
  console.error('Erreur lors de l\'initialisation Firebase Admin:');
  console.error('Détail de l\'erreur:', error.message);
  console.error('Veuillez télécharger le fichier service-account-key.json depuis la console Firebase');
  console.error('Console Firebase: Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

async function setAdminClaims() {
  console.log('Définition des Custom Claims pour les administrateurs...');
  
  for (const email of ADMIN_EMAILS) {
    try {
      // Récupérer l'utilisateur par email
      const user = await auth.getUserByEmail(email);
      
      // Définir le custom claim admin
      await auth.setCustomUserClaims(user.uid, { admin: true });
      
      console.log(`✓ Custom claim admin défini pour: ${email} (UID: ${user.uid})`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`⚠ Utilisateur non trouvé: ${email}`);
        console.warn(`  L'utilisateur doit d'abord se connecter via l'interface avant de pouvoir recevoir les claims`);
      } else {
        console.error(`✗ Erreur pour ${email}:`, error.message);
      }
    }
  }
  
  console.log('\nOpération terminée');
  console.log('Les utilisateurs devront se reconnecter pour que les nouveaux claims prennent effet');
}

async function verifyAdminClaims() {
  console.log('Vérification des Custom Claims administrateurs...\n');
  
  for (const email of ADMIN_EMAILS) {
    try {
      const user = await auth.getUserByEmail(email);
      const customClaims = user.customClaims || {};
      
      if (customClaims.admin === true) {
        console.log(`✓ ${email}: ADMIN (UID: ${user.uid})`);
      } else {
        console.log(`○ ${email}: Pas admin (UID: ${user.uid})`);
      }
    } catch (error) {
      console.error(`✗ Erreur pour ${email}:`, error.message);
    }
  }
}

// Menu interactif
const args = process.argv.slice(2);
const command = args[0];

if (command === 'verify') {
  verifyAdminClaims().then(() => process.exit(0));
} else if (command === 'set') {
  setAdminClaims().then(() => process.exit(0));
} else {
  console.log('Usage:');
  console.log('  node set-admin-claims.js set    - Définir les claims admin');
  console.log('  node set-admin-claims.js verify - Vérifier les claims existants');
  console.log('\nNote: Les utilisateurs doivent d\'abord se connecter via l\'interface avant de pouvoir recevoir les claims');
  process.exit(0);
}
