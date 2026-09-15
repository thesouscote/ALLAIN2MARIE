# Guide de Sécurité ALLAIN2MARIE

Ce guide explique comment sécuriser l'application ALLAIN2MARIE avec Firebase.

## 🚨 Problèmes de sécurité actuels

1. **Liste d'admins en clair** dans `db.js`
2. **Vérification côté client uniquement** - contournable par un hacker
3. **Pas de règles Firestore** - données non protégées côté serveur

## ✅ Solution implémentée

### 1. Règles de sécurité Firestore (`firestore.rules`)

Les règles Firestore protègent vos données côté serveur :
- Seuls les utilisateurs avec `admin: true` peuvent modifier les produits
- Les clients peuvent créer des commandes mais ne peuvent les modifier
- Protection complète des données sensibles

### 2. Firebase Custom Claims

Au lieu de vérifier les emails côté client, nous utilisons Firebase Custom Claims :
- Les claims sont stockés côté serveur par Firebase
- Impossible à falsifier par un hacker
- Vérification automatique dans les règles Firestore

## 📋 Étapes d'installation

### Étape 1: Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### Étape 2: Connecter Firebase CLI

```bash
firebase login
```

### Étape 3: Initialiser le projet Firebase

```bash
firebase init
```

Sélectionnez :
- Firestore: Configure security rules
- Hosting: Configure files for Firebase Hosting

Utilisez le projet existant: `allain2marie`

### Étape 4: Déployer les règles de sécurité

```bash
firebase deploy --only firestore:rules
```

### Étape 5: Configurer les Custom Claims Admin

#### 5.1 Créer un compte de service Firebase

1. Allez dans la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez le projet `allain2marie`
3. Allez dans **Project Settings** > **Service Accounts**
4. Cliquez sur **Generate New Private Key**
5. Téléchargez le fichier JSON
6. Renommez-le en `service-account-key.json`
7. Placez-le à la racine du projet (NE PAS COMMIT SUR GITHUB!)

#### 5.2 Installer les dépendances

```bash
npm install firebase-admin
```

#### 5.3 Faire connecter les admins d'abord

**IMPORTANT**: Les utilisateurs doivent d'abord se connecter via l'interface admin avant de pouvoir recevoir les Custom Claims.

1. Demandez à chaque admin de se connecter via `login.html`
2. Une fois connectés, leurs comptes Firebase seront créés

#### 5.4 Exécuter le script pour définir les claims

```bash
node set-admin-claims.js set
```

#### 5.5 Vérifier les claims

```bash
node set-admin-claims.js verify
```

### Étape 6: Mettre à jour le code client

Le fichier `db.js` doit être modifié pour utiliser les Custom Claims au lieu de la liste d'emails en clair.

## 🔒 Sécurisation du fichier service-account-key.json

**NE JAMAIS COMMIT ce fichier sur GitHub!**

Ajoutez-le à `.gitignore` :

```bash
echo "service-account-key.json" >> .gitignore
```

## 🧪 Tester la sécurité

### Test 1: Vérifier que les règles Firestore fonctionnent

1. Connectez-vous avec un compte admin
2. Essayez de modifier un produit - devrait fonctionner
3. Connectez-vous avec un compte non-admin
4. Essayez de modifier un produit - devrait être refusé

### Test 2: Vérifier que les Custom Claims fonctionnent

```bash
node set-admin-claims.js verify
```

## 🔄 Maintenance

### Ajouter un nouvel admin

1. Faire connecter le nouvel admin via `login.html`
2. Ajouter son email dans `set-admin-claims.js`
3. Réexécuter: `node set-admin-claims.js set`

### Retirer un admin

1. Modifier `set-admin-claims.js` pour retirer l'email
2. Réexécuter: `node set-admin-claims.js set`
3. OU retirer manuellement le claim via la console Firebase

## 📝 Notes importantes

- Les Custom Claims ne prennent effet qu'après reconnexion de l'utilisateur
- Les règles Firestore sont appliquées immédiatement après déploiement
- Gardez toujours votre `service-account-key.json` en sécurité
- Révocation des clés compromise dans la console Firebase

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez que Firebase CLI est bien installé
2. Vérifiez que vous êtes connecté au bon projet Firebase
3. Vérifiez que les utilisateurs se sont connectés au moins une fois
4. Consultez les logs Firebase dans la console
