// server.js
const express = require('express');
const ldap = require('ldapjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration LDAP
const LDAP_URL = 'ldap://172.20.10.2';
const LDAP_SEARCH_BASE = 'ou=users,dc=contoso-lab,dc=com';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'transport_app',
  password: process.env.DB_PASSWORD,
  port: 5432,
});
// Vérifier la connexion à PostgreSQL
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  } else {
    console.log('Connexion à PostgreSQL établie avec succès');
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Configuration du stockage pour multer (gestion des uploads d'images)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
  fileFilter: function (req, file, cb) {
    // Accepter seulement les images et PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou PDF.'));
    }
  }
});

// Servir les fichiers statiques du répertoire uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Store verification codes temporarily (in a real app, use Redis or a database)
const verificationCodes = new Map();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Remplacer par votre serveur SMTP
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'bouchraboukhalfa013@gmail.com', // Remplacer par votre email
    pass: process.env.EMAIL_PASS // Remplacer par votre mot de passe
  }
});

// Route pour vérifier l'existence d'un matricule dans LDAP
app.post('/api/verify-matricule', async (req, res) => {
  const { matricule } = req.body;
  
  if (!matricule) {
    return res.status(400).json({ 
      success: false, 
      message: 'Matricule requis' 
    });
  }
  
  // Connexion au serveur LDAP
  const client = ldap.createClient({
    url: LDAP_URL
  });
  
  // Configuration de la recherche pour trouver un utilisateur avec ce matricule
  const searchOptions = {
    filter: `(uidNumber=${matricule})`,
    scope: 'sub',
    attributes: ['uid', 'sn', 'givenName','employeeNumber']
  };
  
  client.search(LDAP_SEARCH_BASE, searchOptions, (searchErr, searchRes) => {
    if (searchErr) {
      console.error('Erreur de recherche LDAP:', searchErr);
      client.unbind();
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la recherche dans le serveur LDAP' 
      });
    }
    
    let userFound = false;
    let userData = null;
    
    searchRes.on('searchEntry', (entry) => {
      userFound = true;
      userData = {};
      
      entry.attributes.forEach(attr => {
        const key = attr.type;
        const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
        userData[key] = value;
      });
      
      console.log('Utilisateur LDAP trouvé avec matricule:', matricule);
    });
    
    searchRes.on('error', (err) => {
      console.error('Erreur lors de la recherche LDAP:', err);
      client.unbind();
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur pendant la recherche LDAP' 
      });
    });
    
    searchRes.on('end', () => {
      client.unbind();
      
      if (!userFound) {
        console.log('Matricule non trouvé dans LDAP:', matricule);
        return res.json({
          success: true,
          exists: false,
          message: 'Matricule non trouvé'
        });
      }
      
      // Mapper les données LDAP au format attendu par le frontend
      const formattedData = {
        firstName: userData.givenName || '',
        lastName: userData.sn || '',
        matricule: userData.employeeNumber || matricule
      };
      
      return res.json({
        success: true,
        exists: true,
        data: formattedData,
        message: 'Matricule vérifié avec succès'
      });
    });
  });
});

// API to send email verification code
app.post('/api/send-verification-code', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email requis' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Format d\'email invalide' });
  }
  
  try {
    // Generate a random 6-digit code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Store the code with the email (expires in 10 minutes)
    verificationCodes.set(email, {
      code: verificationCode,
      expiry: Date.now() + 10 * 60 * 1000 // 10 minutes from now
    });
    
    // Send verification email
    const mailOptions = {
      from: '"Sonatrach Transport" <no-reply@sonatrach.dz>',
      to: email,
      subject: 'Code de vérification - Demande de transport',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #003366;">Vérification de votre email - Demande de transport</h2>
          <p>Bonjour,</p>
          <p>Votre code de vérification pour votre demande de transport est:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${verificationCode}
          </div>
          <p>Ce code est valide pendant 10 minutes.</p>
          <p>Si vous n'avez pas demandé ce code, veuillez ignorer ce message.</p>
          <p>Cordialement,<br>L'équipe Transport Sonatrach</p>
        </div>
      `
    };
    
    // For development purposes, log the code instead of sending an email
    console.log(`Code de vérification pour ${email}: ${verificationCode}`);
    
    // In production, uncomment the following to send real emails
    await transporter.sendMail(mailOptions);
    
    return res.json({
      success: true,
      message: 'Code de vérification envoyé à votre adresse email'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code de vérification:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du code de vérification' });
  }
});

// API to verify the code provided by user
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email et code requis' });
  }
  
  const storedVerification = verificationCodes.get(email);
  
  if (!storedVerification) {
    return res.json({
      success: false,
      verified: false,
      message: 'Aucun code de vérification n\'a été envoyé à cette adresse email'
    });
  }
  
  if (storedVerification.expiry < Date.now()) {
    verificationCodes.delete(email);
    return res.json({
      success: false,
      verified: false,
      message: 'Le code de vérification a expiré. Veuillez demander un nouveau code.'
    });
  }
  
  if (storedVerification.code !== code) {
    return res.json({
      success: false,
      verified: false,
      message: 'Code de vérification incorrect'
    });
  }
  
  // Code is valid
  verificationCodes.delete(email); // Use the code only once
  return res.json({
    success: true,
    verified: true,
    message: 'Email vérifié avec succès'
  });
});


// API pour soumettre la demande de transport avec upload d'image

 // API pour soumettre la demande de transport avec upload d'image
app.post('/api/submit-transport-request', upload.single('image'), async (req, res) => {
  try {
    const {
      name, prenom, email, phone, adresse, commune, wilaya, 
      itineraire, matricule, fonction, post, affectation,
      indemnity, prime
    } = req.body;
    
    // Validation des champs obligatoires
    const requiredFields = ['name', 'prenom', 'email', 'phone', 'adresse', 'commune', 'wilaya', 
                           'itineraire', 'matricule', 'fonction', 'post'];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `Le champ ${field} est requis` 
        });
      }
    }
    
    
    // Conversion des valeurs de type chaîne en booléen
    const indemnityBool = indemnity === 'true' || indemnity === true;
    const primeBool = prime === 'true' || prime === true;
    
    // Préparer le chemin de l'image s'il y en a une
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Insérer la demande dans la base de données
    const query = `
      INSERT INTO transport_requests 
      (nom, prenom, email, phone, adresse, commune, wilaya, itineraire, 
       matricule, fonction, post, affectation, indemnity, prime, image_path, date_soumission, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), 'En attente')
      RETURNING id
    `;
    
    const values = [
      name, prenom, email, phone, adresse, commune, wilaya, itineraire,
      matricule, fonction, post, affectation || '', indemnityBool, primeBool, imagePath
    ];
    
    const result = await pool.query(query, values);
    const requestId = result.rows[0].id;
    
    // Envoyer un email de confirmation à l'utilisateur
    const confirmationMailOptions = {
      from: '"Sonatrach Transport" <no-reply@sonatrach.dz>',
      to: email,
      subject: 'Confirmation de votre demande de transport',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #003366;">Confirmation de demande de transport</h2>
          <p>Bonjour ${prenom} ${name},</p>
          <p>Nous avons bien reçu votre demande de transport. Votre demande porte le numéro de référence: <strong>TR-${requestId}</strong>.</p>
          <p>Statut actuel: <strong>En attente</strong></p>
          <p>Vous serez informé(e) par email de tout changement de statut de votre demande.</p>
          <p>Cordialement,<br>L'équipe Transport Sonatrach</p>
        </div>
      `
    };
    
    // Envoyer l'email de confirmation
    await transporter.sendMail(confirmationMailOptions);
    
    // Répondre au client
    return res.json({
      success: true,
      message: 'Demande de transport soumise avec succès',
      requestId: requestId
    });
    
  } catch (error) {
    console.error('Erreur lors de la soumission de la demande:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la soumission de la demande de transport' 
    });
  }
});

// API pour récupérer toutes les demandes de transport (pour l'admin)
app.get('/api/transport-requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Construire la requête avec filtres optionnels
    let query = `
      SELECT * FROM transport_requests
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    // Ajouter le filtre de statut si fourni
    if (status) {
      query += ` WHERE statut = $${paramCounter++}`;
      queryParams.push(status);
    }
    
    // Ajouter le tri et la pagination
    query += ` ORDER BY date_soumission DESC LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
    queryParams.push(limit, offset);
    
    // Exécuter la requête
    const result = await pool.query(query, queryParams);
    
    // Compter le nombre total de demandes pour la pagination
    const countQuery = `
      SELECT COUNT(*) FROM transport_requests
      ${status ? 'WHERE statut = $1' : ''}
    `;
    
    const countResult = await pool.query(countQuery, status ? [status] : []);
    const totalCount = parseInt(countResult.rows[0].count);
    
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des demandes de transport' 
    });
  }
});

// API pour récupérer les détails d'une demande spécifique
app.get('/api/transport-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM transport_requests WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }
    
    return res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de la demande de transport' 
    });
  }
});

// API pour mettre à jour le statut d'une demande (admin)
app.put('/api/transport-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    
    if (!statut || !['En attente', 'Approuvée', 'Rejetée'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Valeurs acceptées: En attente, Approuvée, Rejetée'
      });
    }
    
    // Mettre à jour le statut et la date de décision
    const query = `
      UPDATE transport_requests 
      SET statut = $1, date_decision = NOW(), is_new = false 
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [statut, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }
    
    const updatedRequest = result.rows[0];
    
    // Envoyer un email de notification à l'utilisateur
    const notificationMailOptions = {
      from: '"Sonatrach Transport" <no-reply@sonatrach.dz>',
      to: updatedRequest.email,
      subject: `Mise à jour de votre demande de transport - ${statut}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #003366;">Mise à jour de votre demande de transport</h2>
          <p>Bonjour ${updatedRequest.prenom} ${updatedRequest.nom},</p>
          <p>Le statut de votre demande de transport (référence: TR-${updatedRequest.id}) a été mis à jour:</p>
          <p>Nouveau statut: <strong>${statut}</strong></p>
          ${statut === 'Approuvée' ? 
            `<p>Votre demande a été approuvée. Un responsable du service transport vous contactera prochainement.</p>` : 
            statut === 'Rejetée' ? 
            `<p>Votre demande a été rejetée. Pour plus d'informations, veuillez contacter le service transport.</p>` : 
            ''}
          <p>Cordialement,<br>L'équipe Transport Sonatrach</p>
        </div>
      `
    };
    
    // Envoyer l'email de notification
    await transporter.sendMail(notificationMailOptions);
    
    return res.json({
      success: true,
      message: `Statut de la demande mis à jour avec succès: ${statut}`,
      data: updatedRequest
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour du statut de la demande' 
    });
  }
});


// API pour récupérer les demandes d'un utilisateur spécifique (par email ou matricule)
app.get('/api/my-requests', async (req, res) => {
  try {
    const { email, matricule } = req.query;
    
    if (!email && !matricule) {
      return res.status(400).json({
        success: false,
        message: 'Email ou matricule requis'
      });
    }
    
    let query = 'SELECT * FROM transport_requests WHERE ';
    const params = [];
    
    if (email) {
      query += 'email = $1';
      params.push(email);
    } else {
      query += 'matricule = $1';
      params.push(matricule);
    }
    
    query += ' ORDER BY date_soumission DESC';
    
    const result = await pool.query(query, params);
    
    return res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des demandes' 
    });
  }
});

// Route de test simple pour vérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
  res.json({ message: 'Serveur API fonctionnel' });
});

// Middleware de gestion des erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Une erreur interne est survenue sur le serveur' 
  });
});
// Modifications de la route API verify-matricule
app.post('/api/verify-matricule', async (req, res) => {
  const { matricule } = req.body;
  
  console.log('API verify-matricule appelée avec matricule:', matricule);
  
  if (!matricule) {
    console.log('Erreur: Matricule manquant dans la requête');
    return res.status(400).json({ 
      success: false, 
      message: 'Matricule requis' 
    });
  }
  
  // Connexion au serveur LDAP
  let client;
  try {
    client = ldap.createClient({
      url: LDAP_URL,
      timeout: 5000,
      connectTimeout: 10000
    });
    
    console.log('Client LDAP créé');
    
    // Gestion explicite des erreurs de connexion
    client.on('error', (err) => {
      console.error('Erreur de connexion LDAP:', err);
      // Ne pas envoyer de réponse ici car on pourrait envoyer une double réponse
    });
    
    // Configuration de la recherche pour trouver un utilisateur avec ce matricule
    const searchOptions = {
      filter: `(uidNumber=${matricule})`,
      scope: 'sub',
      attributes: ['uid', 'sn', 'givenName', 'mail', 'employeeNumber']
    };
    
    console.log('Lancement de la recherche LDAP avec options:', searchOptions);
    
    // Promisify la recherche LDAP pour une meilleure gestion des erreurs
    const searchResult = await new Promise((resolve, reject) => {
      let userFound = false;
      let userData = null;
      
      const searchRes = client.search(LDAP_SEARCH_BASE, searchOptions, (searchErr) => {
        if (searchErr) {
          console.error('Erreur initiale de recherche LDAP:', searchErr);
          reject(searchErr);
        }
      });
      
      searchRes.on('searchEntry', (entry) => {
        console.log('Entrée LDAP trouvée pour matricule:', matricule);
        userFound = true;
        userData = {};
        
        entry.attributes.forEach(attr => {
          const key = attr.type;
          const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
          userData[key] = value;
        });
        
        console.log('Données utilisateur récupérées:', userData);
      });
      
      searchRes.on('error', (err) => {
        console.error('Erreur pendant la recherche LDAP:', err);
        reject(err);
      });
      
      searchRes.on('end', () => {
        console.log('Recherche LDAP terminée. Utilisateur trouvé:', userFound);
        resolve({ userFound, userData });
      });
    });
    
    // Libérer la connexion LDAP
    try {
      client.unbind();
      console.log('Client LDAP déconnecté');
    } catch (unbindErr) {
      console.error('Erreur lors de la déconnexion LDAP:', unbindErr);
    }
    
    // Construire la réponse en fonction du résultat
    if (!searchResult.userFound) {
      console.log('Aucun utilisateur trouvé pour matricule:', matricule);
      const response = {
        success: true,
        exists: false,
        message: 'Matricule non trouvé'
      };
      console.log('Envoi de la réponse:', response);
      return res.json(response);
    }
    
    // Mapper les données LDAP au format attendu par le frontend
    const formattedData = {
      firstName: searchResult.userData.givenName || '',
      lastName: searchResult.userData.sn || '',
      email: searchResult.userData.mail || '',
      matricule: searchResult.userData.employeeNumber || matricule
    };
    
    const response = {
      success: true,
      exists: true,
      data: formattedData,
      message: 'Matricule vérifié avec succès'
    };
    
    console.log('Envoi de la réponse de succès:', response);
    return res.json(response);
    
  } catch (error) {
    console.error('Erreur générale dans verify-matricule:', error);
    
    // Si le client LDAP existe, essayer de le déconnecter
    if (client) {
      try {
        client.unbind();
        console.log('Client LDAP déconnecté après erreur');
      } catch (unbindErr) {
        console.error('Erreur lors de la déconnexion LDAP après erreur:', unbindErr);
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification dans le serveur LDAP',
      error: error.message
    });
  }
});

// Route pour vérifier si une demande existe déjà
app.post('/api/check-existing-request', async (req, res) => {
  console.log('API check-existing-request appelée avec données:', req.body);
  
  try {
    const { matricule } = req.body;
    
    if (!matricule) {
      console.log('Erreur: Matricule manquant dans check-existing-request');
      return res.status(400).json({ 
        success: false, 
        message: 'Matricule requis' 
      });
    }
    
    // Vérifier si une demande active existe déjà (en attente ou approuvée)
    const query = `
      SELECT id FROM transport_requests 
      WHERE matricule = $1 AND statut IN ('En attente', 'Approuvée')
      LIMIT 1
    `;
    
    console.log('Exécution de la requête SQL pour vérifier les demandes existantes');
    const result = await pool.query(query, [matricule]);
    const hasExistingRequest = result.rows.length > 0;
    
    const response = {
      success: true,
      hasExistingRequest,
      message: hasExistingRequest ? 'Une demande existe déjà pour ce matricule' : 'Aucune demande active trouvée'
    };
    
    console.log('Réponse check-existing-request:', response);
    return res.json(response);
  } catch (error) {
    console.error('Erreur lors de la vérification de demande existante:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification de demande existante',
      error: error.message
    });
  }
});

// Route de test simple pour vérifier la connexion
app.post('/api/test-connection', (req, res) => {
  console.log('Test de connexion reçu:', req.body);
  return res.json({
    success: true,
    message: 'Connexion testée avec succès',
    receivedData: req.body
  });
});
//------------------------------------------------

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});