const express = require('express');
const ldap = require('ldapjs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
app.use(cors());
app.use(bodyParser.json());
const path = require('path');
const fs = require('fs');
const multer = require('multer');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====================================================
// CONFIGURATIONS
// ====================================================

// Configuration LDAP
const LDAP_URL = 'ldap://192.168.100.5';
const LDAP_SEARCH_BASE = 'ou=users,dc=contoso-lab,dc=com';
const LDAP_GROUP_BASE = 'ou=Group,dc=contoso-lab,dc=com';

// les groupes autorisés pour LDAP
const AUTHORIZED_GROUPS = {
  'admin': 'cn=admin,ou=Group,dc=contoso-lab,dc=com',
  'supadmin': 'cn=supadmin,ou=Group,dc=contoso-lab,dc=com',
  'chauffeur': 'cn=chauffeur,ou=Group,dc=contoso-lab,dc=com',
  'employe': 'cn=employe,ou=Group,dc=contoso-lab,dc=com'
};

// Configuration PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'transport_app',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  } else {
    console.log('Connexion à PostgreSQL établie avec succès');
  }
});

// ====================================================
// INITIALISATION DE LA BASE DE DONNÉES
// ====================================================

/**
 * Initialise les tables de la base de données si elles n'existent pas
 */
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS lines (
        id SERIAL PRIMARY KEY,
        number VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        depart VARCHAR(255) NOT NULL,
        arrivee VARCHAR(255) NOT NULL,
        distance VARCHAR(50),
        duree VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS stops (
        id SERIAL PRIMARY KEY,
        line_id INTEGER REFERENCES lines(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL,
        coordinates JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS bus_line_assignments (
        id SERIAL PRIMARY KEY,
        bus_id INTEGER NOT NULL REFERENCES external_buses(id) ON DELETE CASCADE,
        line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(bus_id, line_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS trajets (
        id SERIAL PRIMARY KEY,
        ligne_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
        ligne_number VARCHAR(10),
        depart VARCHAR(255) NOT NULL,
        arrivee VARCHAR(255) NOT NULL,
        jours VARCHAR(100) NOT NULL,
        heure_depart TIME NOT NULL,
        heure_arrivee TIME NOT NULL,
        duree VARCHAR(50) NOT NULL,
        chauffeur VARCHAR(255),
        vehicule VARCHAR(255),
        statut VARCHAR(50) DEFAULT 'Actif',
        arrets JSONB,
        remarques TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tables vérifiées/créées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables:', error);
  } finally {
    client.release();
  }
}

initDatabase();

// ====================================================
// FONCTIONS UTILITAIRES
// ====================================================

/**
 * Récupère une ligne complète avec ses arrêts
 * ID de la ligne
 * Ligne avec ses arrêts ou null si non trouvée
 */
async function getCompleteLineById(id) {
  const lineResult = await pool.query('SELECT * FROM lines WHERE id = $1', [id]);
  
  if (lineResult.rows.length === 0) {
    return null;
  }
  
  const line = lineResult.rows[0];
  const stopsResult = await pool.query(
    'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
    [id]
  );
  
  line.stops = stopsResult.rows;
  return line;
}

// Fonction pour vérifier si un utilisateur est membre d'un groupe
async function checkGroupMembership(client, username) {
  return new Promise((resolve) => { 
    const roles = {};
    let completed = 0;
    const totalGroups = Object.keys(AUTHORIZED_GROUPS).length;
    
    console.log(`Checking group membership for user: ${username}`);
    
    // Vérifier chaque groupe
    for (const [role, groupDN] of Object.entries(AUTHORIZED_GROUPS)) {
      // Extraire le cn du groupe depuis le DN
      const groupName = groupDN.split(',')[0].split('=')[1];
      console.log(`Checking if ${username} is in group: ${groupName}`);
      
      const searchOptions = {
        // Modification de la recherche pour correspondre à votre structure LDAP
        filter: `(&(objectClass=posixGroup)(cn=${groupName})(memberUid=${username}))`,
        scope: 'sub',
        attributes: ['cn', 'memberUid']
      };
      
      client.search(LDAP_GROUP_BASE, searchOptions, (err, res) => {
        if (err) {
          console.error(`Erreur lors de la recherche du groupe ${role}:`, err);
          completed++;
          if (completed === totalGroups) resolve(roles);
          return;
        }
        
        let groupFound = false;
        
        res.on('searchEntry', (entry) => {
          groupFound = true;
          console.log(`Found user ${username} in group ${role}`);
          
          // Vérifier si l'utilisateur est bien membre du groupe
          const memberUids = [];
          entry.attributes.forEach(attr => {
            if (attr.type === 'memberUid') {
              memberUids.push(...attr.values);
            }
          });
          
          console.log(`Group ${role} members:`, memberUids);
          if (memberUids.includes(username)) {
            console.log(`Confirmed user ${username} is in group ${role}`);
            roles[role] = true;
          }
        });
        
        res.on('error', (err) => {
          console.error(`Erreur pendant la recherche du groupe ${role}:`, err);
        });
        
        res.on('end', () => {
          if (!groupFound) {
            console.log(`User ${username} not found in group ${role}`);
          }
          completed++;
          if (completed === totalGroups) {
            console.log(`Final roles for ${username}:`, roles);
            resolve(roles);
          }
        });
      });
    }
  });
}

async function checkTransportRequest(username) {
  try {
    console.log(`[LDAP] Recherche des infos employé pour: ${username}`);
    
    // 1. Créer une connexion LDAP propre
    const client = ldap.createClient({ url: LDAP_URL });
    
    try {
      // 2. Récupérer le matricule depuis LDAP
      const userInfo = await new Promise((resolve, reject) => {
        client.search(LDAP_SEARCH_BASE, {
          filter: `(uid=${username})`,
          scope: 'sub',
          attributes: ['uidNumber', 'uid'] // uidNumber est utilisé comme matricule
        }, (err, res) => {
          if (err) return reject(err);
          
          let userData = { username };
          
          res.on('searchEntry', (entry) => {
            entry.attributes.forEach(attr => {
              if (attr.type === 'uidNumber') {
                userData.matricule = attr.values[0];
              }
            });
          });
          
          res.on('error', reject);
          res.on('end', () => resolve(userData));
        });
      });

      if (!userInfo.matricule) {
        console.log('[ERREUR] Aucun matricule (uidNumber) trouvé dans LDAP');
        return { exists: false, approved: false };
      }

      console.log(`[LDAP] Matricule trouvé: ${userInfo.matricule} pour ${username}`);

      // 3. Vérifier la demande avec le matricule
      const requestCheck = await pool.query(
        `SELECT statut FROM transport_requests 
         WHERE matricule = $1 
         ORDER BY date_soumission DESC 
         LIMIT 1`,
        [userInfo.matricule]
      );

      if (requestCheck.rows.length === 0) {
        console.log('[POSTGRES] Aucune demande trouvée pour ce matricule');
        return { exists: false, approved: false };
      }

      const status = requestCheck.rows[0].statut;
      console.log(`[POSTGRES] Statut trouvé: "${status}"`);

      // 4. Comparaison insensible à la casse pour "Approuvée"
      // Utilisation de trim() pour supprimer les espaces supplémentaires
      const isApproved = status.toString().trim().toLowerCase() === 'approuvée';
      
      return {
        exists: true,
        approved: isApproved,
        rawStatus: status
      };
    } finally {
      // 5. S'assurer que la connexion LDAP est toujours fermée
      client.unbind();
    }
  } catch (error) {
    console.error('[ERREUR] checkTransportRequest:', error);
    throw error;
  }
}

// Fonction pour échapper les caractères spéciaux dans les filtres LDAP
function escapeLDAPFilter(input) {
  if (!input) return input;
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\*/g, '\\*')
    .replace(/\0/g, '\\0');
}

// ====================================================
// ROUTES D'AUTHENTIFICATION ET UTILISATEURS
// ====================================================

// Authentification hybride (PostgreSQL + LDAP)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nom d\'utilisateur et mot de passe requis' 
    });
  }
  
  // Vérifier d'abord dans PostgreSQL pour les chauffeurs externes
  try {
    const externalUserResult = await pool.query(
      'SELECT eb.id, eb.chauffeur_nom, eb.chauffeur_prenom, eb.password, tc.name as company_name ' +
      'FROM external_buses eb ' +
      'JOIN transport_companies tc ON eb.company_id = tc.id ' +
      'WHERE eb.username = $1 AND eb.statut = $2',
      [username, 'Actif']
    );
    
    if (externalUserResult.rows.length > 0) {
      const externalUser = externalUserResult.rows[0];
      
      // Utiliser bcrypt pour comparer le mot de passe
      if (externalUser.password) {
        const passwordMatch = await bcrypt.compare(password, externalUser.password);
        
        if (passwordMatch) {
          return res.json({
            success: true,
            user: {
              username: username,
              displayName: `${externalUser.chauffeur_nom} ${externalUser.chauffeur_prenom || ''}`.trim(),
              role: 'chauffeur',
              isExternal: true,
              companyName: externalUser.company_name
            }
          });
        } else {
          return res.status(401).json({ 
            success: false, 
            errorType: 'password', 
            message: 'Mot de passe incorrect' 
          });
        }
      }
    }
    
    // Si on arrive ici, c'est que l'utilisateur n'a pas été trouvé dans PostgreSQL
    // On continue avec LDAP
    console.log("Utilisateur non trouvé dans PostgreSQL, tentative d'authentification LDAP");
    
  } catch (err) {
    console.error('Erreur lors de la vérification dans PostgreSQL:', err);
    // En cas d'erreur PostgreSQL, continuer avec LDAP
  }
  
  // Si nous arrivons ici, c'est qu'il faut essayer l'authentification LDAP
  const escapedUsername = escapeLDAPFilter(username);
  const client = ldap.createClient({
    url: LDAP_URL
  });

  // Rechercher l'utilisateur dans LDAP
  const searchOptions = {
    filter: `(uid=${escapedUsername})`,
    scope: 'sub',
    attributes: ['dn']
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
    let userDN = null;

    searchRes.on('searchEntry', (entry) => {
      userFound = true;
      userDN = entry.objectName;
      console.log('Utilisateur LDAP trouvé avec DN:', userDN);
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
      if (!userFound) {
        // L'utilisateur n'a pas été trouvé dans LDAP
        console.log('Utilisateur non trouvé dans LDAP:', username);
        client.unbind();
        return res.status(401).json({
          success: false, 
          errorType: 'username', 
          message: 'Nom d\'utilisateur inconnu'
        });
      }

      // Construire explicitement le DN de l'utilisateur pour l'authentification
      const explicitUserDN = `uid=${username},ou=users,dc=contoso-lab,dc=com`;
      console.log('Tentative d\'authentification LDAP avec DN explicite:', explicitUserDN);
      
      // Créer un nouveau client pour l'authentification
      const authClient = ldap.createClient({
        url: LDAP_URL
      });

      // Vérification du mot de passe LDAP
      authClient.bind(explicitUserDN, password, async (bindErr) => {
        if (bindErr) {
          // Le mot de passe LDAP est incorrect
          console.error('Échec d\'authentification LDAP:', bindErr.message);
          authClient.unbind();
          return res.status(401).json({ 
            success: false, 
            errorType: 'password', 
            message: 'Mot de passe incorrect' 
          });
        }

        console.log('Authentification LDAP réussie pour:', username);

        try {
          // Récupérer les informations de l'utilisateur
          const userSearchOptions = {
            filter: `(uid=${escapedUsername})`,
            scope: 'sub',
            attributes: ['dn', 'cn', 'uid', 'sn', 'givenName', 'mail']
          };

          authClient.search(LDAP_SEARCH_BASE, userSearchOptions, async (err, userRes) => {
            if (err) {
              console.error('Erreur lors de la récupération des données utilisateur:', err);
              authClient.unbind();
              return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la récupération des données' 
              });
            }

            let userData = null;

            userRes.on('searchEntry', (entry) => {
              userData = {};
              entry.attributes.forEach(attr => {
                userData[attr.type] = attr.values;
              });
              console.log('LDAP User Data:', JSON.stringify(userData, null, 2));
            });

            userRes.on('error', (err) => {
              console.error('Erreur pendant la recherche des données:', err);
              authClient.unbind();
              return res.status(500).json({ 
                success: false, 
                message: 'Erreur pendant la recherche' 
              });
            });

            userRes.on('end', async () => {
              if (!userData) {
                authClient.unbind();
                return res.status(404).json({ 
                  success: false, 
                  message: 'Utilisateur non trouvé' 
                });
              }

              // Vérifier l'appartenance aux groupes
              try {
                const username = Array.isArray(userData.uid) ? userData.uid[0] : userData.uid;
                console.log(`Vérification des rôles pour l'utilisateur: ${username}`);
                
                const userRoles = await checkGroupMembership(authClient, username);
                console.log(`Rôles de l'utilisateur ${username}:`, userRoles);
                
                // Déterminer le rôle le plus élevé de l'utilisateur
                let role = null;
                let isAuthorized = false;
                
                // Priorité des rôles (du plus élevé au plus faible)
                const rolePriority = ['supadmin', 'admin', 'chauffeur', 'employe'];
                
                for (const r of rolePriority) {
                  if (userRoles[r]) {
                    role = r;
                    isAuthorized = true;
                    break;
                  }
                }
                
                console.log(`Rôle final attribué à ${username}: ${role}`);
                console.log(`L'utilisateur ${username} est ${isAuthorized ? 'autorisé' : 'non autorisé'}`);
                
                // Si l'utilisateur n'est pas autorisé, refuser l'accès
                if (!isAuthorized) {
                  authClient.unbind();
                  return res.status(403).json({ 
                    success: false, 
                    message: 'Vous n\'avez pas l\'autorisation d\'accéder au système.' 
                  });
                }
                
                if (role === 'employe') {
                  try {
                    console.log(`[AUTH] Vérification transport pour employé: ${username}`);
                    
                    const request = await checkTransportRequest(username);
                    
                    if (!request.exists) {
                      console.log('[AUTH] Refus - aucune demande trouvée');
                      authClient.unbind();
                      return res.status(403).json({
                        success: false,
                        errorType: 'transport_request',
                        message: 'Aucune demande de transport enregistrée pour votre compte'
                      });
                    }
                
                    if (!request.approved) {
                      console.log(`[AUTH] Refus - statut: ${request.rawStatus}`);
                      authClient.unbind();
                      
                      return res.status(403).json({
                        success: false,
                        errorType: 'transport_request',
                        message: request.rawStatus.toLowerCase().includes('rejet') ?
                          'Votre demande a été refusée. Contactez le service transport.' :
                          'Votre demande est en cours de traitement (statut: ' + request.rawStatus + ')'
                      });
                    }
                
                    console.log('[AUTH] Demande valide - accès autorisé');
                    
                  } catch (error) {
                    console.error('[ERREUR AUTH] Vérification demande:', error);
                    authClient.unbind();
                    return res.status(500).json({
                      success: false,
                      message: 'Erreur système lors de la vérification de votre demande de transport'
                    });
                  }
                }
             
                authClient.unbind();
                
                return res.json({
                  success: true,
                  user: {
                    username: Array.isArray(userData.uid) ? userData.uid[0] : userData.uid,
                    displayName: Array.isArray(userData.cn) ? userData.cn[0] : userData.cn,
                    role: role,
                    isExternal: false
                  }
                });
              } catch (error) {
                console.error('Erreur lors de la vérification des groupes:', error);
                authClient.unbind();
                return res.status(500).json({ 
                  success: false, 
                  message: 'Erreur lors de la vérification des autorisations' 
                });
              }
            });
          });
        } catch (error) {
          console.error('Erreur lors de la vérification des groupes:', error);
          authClient.unbind();
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la vérification des autorisations' 
          });
        }
      });
    });
  });
});
//--------------------------------------------- liste chauffeur ---------------------------------------------------------------
// Route pour récupérer tous les chauffeurs directement depuis LDAP
app.get('/api/chauffeurs', async (req, res) => {
  try {
    // Connexion au serveur LDAP
    const client = ldap.createClient({
      url: LDAP_URL
    });

    // Rechercher les membres du groupe chauffeur
    const groupSearchOptions = {
      filter: `(&(objectClass=posixGroup)(cn=chauffeur))`,
      scope: 'sub',
      attributes: ['memberUid']
    };

    client.search(LDAP_GROUP_BASE, groupSearchOptions, (groupErr, groupRes) => {
      if (groupErr) {
        console.error('Erreur de recherche du groupe LDAP:', groupErr);
        return res.status(500).json({ success: false, message: 'Erreur lors de la recherche du groupe dans LDAP' });
      }

      let memberUids = [];

      groupRes.on('searchEntry', (entry) => {
        const attribute = entry.attributes.find(attr => attr.type === 'memberUid');
        if (attribute && attribute.values) {
          memberUids = attribute.values;
        }
      });

      groupRes.on('error', (err) => {
        console.error('Erreur lors de la recherche du groupe:', err);
        return res.status(500).json({ success: false, message: 'Erreur pendant la recherche du groupe LDAP' });
      });

      groupRes.on('end', () => {
        if (memberUids.length === 0) {
          client.unbind();
          return res.json({
            success: true,
            chauffeurs: [],
            message: 'Aucun chauffeur trouvé dans LDAP'
          });
        }

        // Créer un filtre pour rechercher tous les utilisateurs qui sont membres du groupe
        const userFilter = `(|${memberUids.map(uid => `(uid=${uid})`).join('')})`;
        
        const userSearchOptions = {
          filter: userFilter,
          scope: 'sub',
          attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'uidNumber', 'accountStatus', 'userAccountControl']
        };

        client.search(LDAP_SEARCH_BASE, userSearchOptions, async (searchErr, searchRes) => {
          if (searchErr) {
            console.error('Erreur de recherche utilisateurs LDAP:', searchErr);
            client.unbind();
            return res.status(500).json({ 
              success: false, 
              message: 'Erreur lors de la recherche des utilisateurs dans LDAP' 
            });
          }

          const ldapChauffeurs = [];

          searchRes.on('searchEntry', (entry) => {
            const chauffeur = {
              // Définir des valeurs par défaut pour s'assurer que tous les objets chauffeur ont la même structure
              ldap_id: null,
              matricule: null,
              nom: null,
              prenom: null,
              email: '',
              tel: '',
              statut: 'Actif',
              is_active: true,
              disponibilite: 'Disponible'  // Valeur par défaut
            };
            
            entry.attributes.forEach(attr => {
              const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
              
              switch(attr.type) {
                case 'uid':
                  chauffeur.ldap_id = value;
                  chauffeur.id = value; // Ajouter un ID pour React
                  break;
                case 'sn':
                  chauffeur.nom = value;
                  break;
                case 'givenName':
                  chauffeur.prenom = value;
                  break;
                case 'uidNumber':
                  chauffeur.matricule = value;
                  break;
                case 'telephoneNumber':
                  chauffeur.tel = value || '';
                  break;
                case 'mail':
                  chauffeur.email = value || '';
                  break;
                case 'accountStatus':
                  chauffeur.statut = value || 'Actif';
                  break;
                case 'userAccountControl':
                  if (value) {
                    try {
                      const uac = parseInt(value.toString());
                      if (!isNaN(uac)) {
                        chauffeur.statut = (uac & 0x0002) ? 'Désactivé' : 'Actif';
                        chauffeur.is_active = !((uac & 0x0002));
                      }
                    } catch (error) {
                      console.error('Erreur lors du traitement de userAccountControl:', error);
                    }
                  }
                  break;
              }
            });

            ldapChauffeurs.push(chauffeur);
          });

          searchRes.on('error', (err) => {
            console.error('Erreur lors de la recherche:', err);
            client.unbind();
            return res.status(500).json({ 
              success: false, 
              message: 'Erreur pendant la recherche des utilisateurs LDAP' 
            });
          });

          searchRes.on('end', async () => {
            client.unbind();
            
            try {
              // Filtrage strict des chauffeurs avec tous les champs requis
              const validChauffeurs = [];
              const invalidChauffeurs = [];
              
              for (const chauffeur of ldapChauffeurs) {
                // Vérification stricte pour s'assurer que les champs obligatoires ne sont pas null ou des chaînes vides
                if (chauffeur.ldap_id && 
                    chauffeur.matricule && 
                    chauffeur.nom && 
                    chauffeur.prenom && 
                    chauffeur.ldap_id.toString().trim() !== '' &&
                    chauffeur.matricule.toString().trim() !== '' && 
                    chauffeur.nom.toString().trim() !== '' && 
                    chauffeur.prenom.toString().trim() !== '') {
                  validChauffeurs.push(chauffeur);
                } else {
                  invalidChauffeurs.push({
                    ldap_id: chauffeur.ldap_id,
                    matricule: chauffeur.matricule,
                    nom: chauffeur.nom,
                    prenom: chauffeur.prenom
                  });
                }
              }
              
              console.log(`Nombre total de chauffeurs LDAP : ${ldapChauffeurs.length}`);
              console.log(`Nombre de chauffeurs valides : ${validChauffeurs.length}`);
              console.log(`Nombre de chauffeurs invalides (ignorés) : ${invalidChauffeurs.length}`);
              
              // Logging détaillé des chauffeurs invalides
              if (invalidChauffeurs.length > 0) {
                console.warn('Chauffeurs ignorés car ils n\'ont pas tous les champs requis:');
                invalidChauffeurs.forEach((c, index) => {
                  console.warn(`${index + 1}. LDAP ID: ${c.ldap_id || 'NULL'}, Matricule: ${c.matricule || 'NULL'}, Nom: ${c.nom || 'NULL'}, Prénom: ${c.prenom || 'NULL'}`);
                });
              }
              
              // Récupérer les informations de disponibilité depuis la base de données
              const dbChauffeurs = await pool.query('SELECT ldap_id, disponibilite FROM chauffeurs');
              const disponibiliteMap = {};
              
              // Créer un map des disponibilités
              dbChauffeurs.rows.forEach(chauffeur => {
                disponibiliteMap[chauffeur.ldap_id] = chauffeur.disponibilite;
              });
              
              // Mettre à jour les disponibilités des chauffeurs LDAP avec les valeurs de la BD
              validChauffeurs.forEach(chauffeur => {
                if (disponibiliteMap[chauffeur.ldap_id]) {
                  chauffeur.disponibilite = disponibiliteMap[chauffeur.ldap_id];
                }
                // Sinon, on garde la valeur par défaut 'Disponible'
              });
              
              // Synchroniser la base de données en arrière-plan, sans attendre la fin pour répondre à l'utilisateur
              validChauffeurs.forEach(async (chauffeur) => {
                try {
                  // Double vérification avant l'insertion
                  if (!chauffeur.matricule) {
                    console.error(`ERREUR CRITIQUE: Tentative d'insertion d'un chauffeur sans matricule après filtrage: ${chauffeur.ldap_id}`);
                    return;
                  }
                  
                  await pool.query(
                    `INSERT INTO chauffeurs 
                    (ldap_id, matricule, nom, prenom, email, tel, statut, disponibilite, is_active) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                    ON CONFLICT (ldap_id) 
                    DO UPDATE SET 
                      matricule = EXCLUDED.matricule,
                      nom = EXCLUDED.nom,
                      prenom = EXCLUDED.prenom,
                      email = EXCLUDED.email,
                      tel = EXCLUDED.tel,
                      statut = EXCLUDED.statut,
                      is_active = EXCLUDED.is_active,
                      date_modification = CURRENT_TIMESTAMP
                    `,
                    [
                      chauffeur.ldap_id,
                      chauffeur.matricule,
                      chauffeur.nom,
                      chauffeur.prenom,
                      chauffeur.email,
                      chauffeur.tel,
                      chauffeur.statut,
                      chauffeur.disponibilite,
                      chauffeur.is_active
                    ]
                  );
                  console.log(`Insertion/mise à jour réussie pour le chauffeur ${chauffeur.ldap_id} (Matricule: ${chauffeur.matricule})`);
                } catch (insertError) {
                  console.error(`Erreur lors de l'insertion/mise à jour du chauffeur en SQL:`, insertError);
                  console.error(`Données chauffeur problématiques:`, JSON.stringify(chauffeur));
                }
              });
              
              // Renvoyer directement les chauffeurs du LDAP (avec disponibilités de la BD si elles existent)
              return res.json({
                success: true,
                chauffeurs: validChauffeurs,
                message: `${validChauffeurs.length} chauffeurs récupérés depuis LDAP`
              });
            } catch (error) {
              console.error('Erreur lors du traitement des données LDAP:', error);
              return res.status(500).json({
                success: false,
                message: 'Erreur lors du traitement des données LDAP'
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Erreur générale:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des chauffeurs'
    });
  }
});
//-----------------------------------------------------liste sousadmins ------------------------------------------
app.get('/api/sousadmins', async (req, res) => {
  // Connexion au serveur LDAP
  const client = ldap.createClient({
    url: LDAP_URL
  });

  // Rechercher les membres du groupe admin
  const groupSearchOptions = {
    filter: `(&(objectClass=posixGroup)(cn=admin))`,
    scope: 'sub',
    attributes: ['memberUid']
  };

  client.search(LDAP_GROUP_BASE, groupSearchOptions, (groupErr, groupRes) => {
    if (groupErr) {
      console.error('Erreur de recherche du groupe LDAP:', groupErr);
      return res.status(500).json({ success: false, message: 'Erreur lors de la recherche du groupe dans LDAP' });
    }

    let memberUids = [];

    groupRes.on('searchEntry', (entry) => {
      const attribute = entry.attributes.find(attr => attr.type === 'memberUid');
      if (attribute && attribute.values) {
        memberUids = attribute.values;
      }
    });

    groupRes.on('error', (err) => {
      console.error('Erreur lors de la recherche du groupe:', err);
      return res.status(500).json({ success: false, message: 'Erreur pendant la recherche du groupe LDAP' });
    });

    groupRes.on('end', () => {
      if (memberUids.length === 0) {
        client.unbind();
        return res.json({
          success: true,
          admins: [],
          message: 'Aucun admin trouvé'
        });
      }

      // Créer un filtre pour rechercher tous les utilisateurs qui sont membres du groupe
      const userFilter = `(|${memberUids.map(uid => `(uid=${uid})`).join('')})`;
      
      const userSearchOptions = {
        filter: userFilter,
        scope: 'sub',
        attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'uidNumber', 'accountStatus', 'userAccountControl']
      };

      client.search(LDAP_SEARCH_BASE, userSearchOptions, async (searchErr, searchRes) => {
        if (searchErr) {
          console.error('Erreur de recherche utilisateurs LDAP:', searchErr);
          client.unbind();
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la recherche des utilisateurs dans LDAP' 
          });
        }

        const admins = [];
        const adminPromises = [];

        searchRes.on('searchEntry', (entry) => {
          const admin = {};
          
          entry.attributes.forEach(attr => {
            const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
            
            switch(attr.type) {
              case 'uid':
                admin.id = value;
                admin.ldap_id = value;
                break;
              case 'sn':
                admin.nom = value;
                break;
              case 'givenName':
                admin.prenom = value;
                break;
              case 'uidNumber':
                admin.matricule = value;
                break;
              case 'telephoneNumber':
                admin.tel = value;
                break;
              case 'mail':
                admin.email = value;
                break;
              case 'accountStatus':
                admin.statut = value;
                break;
              case 'userAccountControl':
                if (value) {
                  try {
                    const uac = parseInt(value.toString());
                    if (!isNaN(uac)) {
                      admin.statut = (uac & 0x0002) ? 'Désactivé' : 'Actif';
                      admin.is_active = !((uac & 0x0002));
                    } else {
                      admin.statut = 'Actif';
                      admin.is_active = true;
                    }
                  } catch (error) {
                    console.error('Erreur lors du traitement de userAccountControl:', error);
                    admin.statut = 'Actif';
                    admin.is_active = true;
                  }
                }
                break;
            }
          });

          if (!admin.statut) {
            admin.statut = 'Actif';
            admin.is_active = true;
          }

          admins.push(admin);

          if (admin.ldap_id) {
            const sqlPromise = pool.query(
              `INSERT INTO admins (ldap_id, is_active) 
               VALUES ($1, $2) 
               ON CONFLICT (ldap_id) 
               DO UPDATE SET is_active = $2`,
              [admin.ldap_id, admin.is_active]
            ).catch(err => {
              console.error('Erreur lors de l\'insertion/mise à jour de l\'admin en SQL:', err);
            });
            
            adminPromises.push(sqlPromise);
          }
        });

        searchRes.on('error', (err) => {
          console.error('Erreur lors de la recherche:', err);
          client.unbind();
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur pendant la recherche des utilisateurs LDAP' 
          });
        });

        searchRes.on('end', async () => {
          client.unbind();
          
          try {
            await Promise.all(adminPromises);
            
            return res.json({
              success: true,
              admins: admins,
              message: 'Admins récupérés et synchronisés avec la base de données'
            });
          } catch (error) {
            console.error('Erreur lors de la synchronisation avec la base de données:', error);
            return res.json({
              success: true,
              admins: admins,
              warning: 'Erreur lors de la synchronisation avec la base de données'
            });
          }
        });
      });
    });
  });
});
//-----------------------------------------------------liste employes ------------------------------------------
app.get('/api/employes', async (req, res) => {
  // Connexion au serveur LDAP
  const client = ldap.createClient({
    url: LDAP_URL
  });

  // Rechercher les membres du groupe employe
  const groupSearchOptions = {
    filter: `(&(objectClass=posixGroup)(cn=employe))`,
    scope: 'sub',
    attributes: ['memberUid']
  };

  client.search(LDAP_GROUP_BASE, groupSearchOptions, (groupErr, groupRes) => {
    if (groupErr) {
      console.error('Erreur de recherche du groupe LDAP:', groupErr);
      return res.status(500).json({ success: false, message: 'Erreur lors de la recherche du groupe dans LDAP' });
    }

    let memberUids = [];

    groupRes.on('searchEntry', (entry) => {
      const attribute = entry.attributes.find(attr => attr.type === 'memberUid');
      if (attribute && attribute.values) {
        memberUids = attribute.values;
      }
    });

    groupRes.on('error', (err) => {
      console.error('Erreur lors de la recherche du groupe:', err);
      return res.status(500).json({ success: false, message: 'Erreur pendant la recherche du groupe LDAP' });
    });

    groupRes.on('end', () => {
      if (memberUids.length === 0) {
        client.unbind();
        return res.json({
          success: true,
          employes: [],
          message: 'Aucun employé trouvé'
        });
      }

      // Créer un filtre pour rechercher tous les utilisateurs qui sont membres du groupe
      const userFilter = `(|${memberUids.map(uid => `(uid=${uid})`).join('')})`;
      
      const userSearchOptions = {
        filter: userFilter,
        scope: 'sub',
        attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'uidNumber', 'accountStatus', 'userAccountControl']
      };

      client.search(LDAP_SEARCH_BASE, userSearchOptions, (searchErr, searchRes) => {
        if (searchErr) {
          console.error('Erreur de recherche utilisateurs LDAP:', searchErr);
          client.unbind();
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la recherche des utilisateurs dans LDAP' 
          });
        }

        const employes = [];

        searchRes.on('searchEntry', (entry) => {
          const employe = {};
          
          entry.attributes.forEach(attr => {
            const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
            
            switch(attr.type) {
              case 'uid':
                employe.id = value;
                employe.ldap_id = value;
                break;
              case 'sn':
                employe.nom = value;
                break;
              case 'givenName':
                employe.prenom = value;
                break;
              case 'uidNumber':
                employe.matricule = value;
                break;
              case 'telephoneNumber':
                employe.tel = value;
                break;
              case 'mail':
                employe.email = value;
                break;
              case 'accountStatus':
                employe.statut = value;
                break;
              case 'userAccountControl':
                if (value) {
                  try {
                    const uac = parseInt(value.toString());
                    if (!isNaN(uac)) {
                      employe.statut = (uac & 0x0002) ? 'Désactivé' : 'Actif';
                      employe.is_active = !((uac & 0x0002));
                    } else {
                      employe.statut = 'Actif';
                      employe.is_active = true;
                    }
                  } catch (error) {
                    console.error('Erreur lors du traitement de userAccountControl:', error);
                    employe.statut = 'Actif';
                    employe.is_active = true;
                  }
                }
                break;
            }
          });

          if (!employe.statut) {
            employe.statut = 'Actif';
            employe.is_active = true;
          }

          employes.push(employe);
        });

        searchRes.on('error', (err) => {
          console.error('Erreur lors de la recherche:', err);
          client.unbind();
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur pendant la recherche des utilisateurs LDAP' 
          });
        });

        searchRes.on('end', () => {
          client.unbind();
          
          return res.json({
            success: true,
            employes: employes,
            message: 'Employés récupérés depuis LDAP'
          });
        });
      });
    });
  });
});
//--------------------------------------bus-----------------------------------------
// API pour récupérer tous les bus
app.get('/api/buses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places FROM bus'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour ajouter un nouveau bus
app.post('/api/buses', async (req, res) => {
  try {
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places } = req.body;
    
    // Par défaut, le statut est "disponible" pour un nouveau bus
    const busStatut = statut || 'disponible';
    
    const result = await pool.query(
      'INSERT INTO bus (matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, busStatut, annee, nb_places]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de l\'ajout d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour mettre à jour un bus existant avec condition pour le statut "affecte"
app.put('/api/buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier d'abord si le bus existe et s'il est déjà affecté
    const checkBus = await pool.query('SELECT statut FROM bus WHERE id = $1', [id]);
    
    if (checkBus.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
    // Si le bus est affecté, on ne permet pas la modification
    if (checkBus.rows[0].statut === 'affecté') {
      return res.status(403).json({ 
        error: 'Modification interdite', 
        message: 'Impossible de modifier un bus avec le statut "affecté"' 
      });
    }
    
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places } = req.body;
    
    const result = await pool.query(
      'UPDATE bus SET matricule = $1, marque = $2, modele = $3, type_energie = $4, couleur = $5, kilometrage = $6, type = $7, statut = $8, annee = $9, nb_places = $10 WHERE id = $11 RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour supprimer un bus - Utilisation de l'ID à la place du matricule
app.delete('/api/buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM bus WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
    res.json({ message: 'Bus supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour rechercher des bus
app.get('/api/buses/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM bus WHERE matricule ILIKE $1 OR marque ILIKE $1 OR modele ILIKE $1 OR couleur ILIKE $1 OR type ILIKE $1',
      [`%${query}%`]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la recherche de bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

//-------------------------------------------------Affectation----------------------------------------------------------------------------------

// GET toutes les affectations
app.get('/api/affectations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.statut,
        a.raison_modification,
        a.date_prise_charge,
        b.matricule AS matricule_bus,
        b.marque AS marque_bus,
        b.modele,
        b.nb_places AS places_disponibles,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      ORDER BY a.id DESC
    `);
    
    const affectations = result.rows.map(row => ({
      id: row.id,
      bus_id: row.bus_id,
      chauffeur_id: row.chauffeur_id,
      matriculeBus: row.matricule_bus,
      marqueBus: row.marque_bus,
      modele: row.modele,
      placesDisponibles: row.places_disponibles,
      matriculeChauffeur: row.matricule_chauffeur,
      nomChauffeur: `${row.nom} ${row.prenom}`,
      statut: row.statut,
      date_prise_charge: row.date_prise_charge,
      raison_modification: row.raison_modification
    }));
   
    res.json({ success: true, affectations });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

// Créer une nouvelle affectation
app.post('/api/affectations', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { bus_id, chauffeur_id, date_prise_charge } = req.body;
    
    if (!bus_id || !chauffeur_id || !date_prise_charge) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'affectation incomplètes'
      });
    }

    await client.query('BEGIN');

    // Vérification du bus
    const busCheck = await client.query(
      'SELECT id, statut FROM bus WHERE id = $1',
      [bus_id]
    );
    
    if (busCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Bus non trouvé'
      });
    }
    
    if (busCheck.rows[0].statut !== 'disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le bus sélectionné n\'est pas disponible'
      });
    }

    // Vérification du chauffeur
    const chauffeurCheck = await client.query(
      'SELECT ldap_id, disponibilite FROM chauffeurs WHERE ldap_id = $1',
      [chauffeur_id]
    );
    
    if (chauffeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Chauffeur non trouvé'
      });
    }
    
    if (chauffeurCheck.rows[0].disponibilite !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le chauffeur sélectionné n\'est pas disponible'
      });
    }

    // Création de l'affectation
    const result = await client.query(
      `INSERT INTO affectations 
      (bus_id, chauffeur_id, date_prise_charge, statut, created_at, updated_at) 
      VALUES ($1, $2, $3, 'actif', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *`,
      [bus_id, chauffeur_id, date_prise_charge]
    );

    // Mise à jour du statut du bus
    await client.query(
      'UPDATE bus SET statut = $1 WHERE id = $2',
      ['affecté', bus_id]
    );

    // Mise à jour de la disponibilité du chauffeur
    await client.query(
      'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
      ['En service', chauffeur_id]
    );

    await client.query('COMMIT');

    // Récupération des détails complets
    const details = await client.query(
      `SELECT 
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.date_prise_charge,
        b.matricule AS matricule_bus,
        b.marque,
        b.modele,
        b.nb_places,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      affectation: {
        id: details.rows[0].id,
        bus_id: details.rows[0].bus_id,
        chauffeur_id: details.rows[0].chauffeur_id,
        matriculeBus: details.rows[0].matricule_bus,
        matriculeChauffeur: details.rows[0].matricule_chauffeur,
        placesDisponibles: details.rows[0].nb_places,
        nomChauffeur: `${details.rows[0].nom} ${details.rows[0].prenom}`,
        marqueBus: details.rows[0].marque,
        modele: details.rows[0].modele,
        date_prise_charge: details.rows[0].date_prise_charge
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'affectation',
      error: err.message
    });
  } finally {
    client.release();
  }
});

// Modification de la route PUT pour gérer correctement les dates
app.put('/api/affectations/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { bus_id, chauffeur_id, raison_modification, date_prise_charge } = req.body;
    
    // Logging pour le debug
    console.log("Données reçues:", { 
      id, 
      bus_id, 
      chauffeur_id, 
      raison_modification, 
      date_prise_charge,
      date_type: typeof date_prise_charge 
    });
    
    if (!bus_id || !chauffeur_id || !date_prise_charge) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'affectation incomplètes'
      });
    }

    // Normalisation de la date
    let formattedDate;
    try {
      // S'assurer que la date est au format YYYY-MM-DD pour PostgreSQL
      if (typeof date_prise_charge === 'string' && date_prise_charge.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedDate = date_prise_charge; // Déjà au bon format
      } else {
        // Tenter de parser la date
        const parsedDate = new Date(date_prise_charge);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Format de date invalide');
        }
        formattedDate = parsedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: `Format de date invalide: ${err.message}`
      });
    }

    await client.query('BEGIN');

    // Vérification de l'affectation existante
    const affectationCheck = await client.query(
      'SELECT bus_id, chauffeur_id, date_prise_charge FROM affectations WHERE id = $1',
      [id]
    );
    
    if (affectationCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    const oldBusId = affectationCheck.rows[0].bus_id;
    const oldChauffeurId = affectationCheck.rows[0].chauffeur_id;
    const oldDate = affectationCheck.rows[0].date_prise_charge;

    // Vérification du nouveau bus
    const busCheck = await client.query(
      'SELECT id, statut FROM bus WHERE id = $1',
      [bus_id]
    );
    
    if (busCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Nouveau bus non trouvé'
      });
    }
    
    if (bus_id !== oldBusId && busCheck.rows[0].statut !== 'disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le nouveau bus sélectionné n\'est pas disponible'
      });
    }

    // Vérification du nouveau chauffeur
    const chauffeurCheck = await client.query(
      'SELECT ldap_id, disponibilite FROM chauffeurs WHERE ldap_id = $1',
      [chauffeur_id]
    );
    
    if (chauffeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Nouveau chauffeur non trouvé'
      });
    }
    
    if (chauffeur_id !== oldChauffeurId && chauffeurCheck.rows[0].disponibilite !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le nouveau chauffeur sélectionné n\'est pas disponible'
      });
    }

    // Si aucune modification n'est faite, utiliser la date originale
    const useDateValue = (
      bus_id === oldBusId && 
      chauffeur_id === oldChauffeurId && 
      !raison_modification
    ) ? oldDate : formattedDate;

    console.log("Date utilisée pour la mise à jour:", useDateValue);

    // Mise à jour de l'affectation
    const result = await client.query(
      `UPDATE affectations 
      SET bus_id = $1, chauffeur_id = $2, 
          updated_at = CURRENT_TIMESTAMP, 
          raison_modification = $3,
          date_prise_charge = $4
      WHERE id = $5
      RETURNING *`,
      [bus_id, chauffeur_id, raison_modification, useDateValue, id]
    );

    // Gestion des changements de bus
    if (bus_id !== oldBusId) {
      // Si la raison du changement est "bus_en_panne", mettre l'ancien bus en statut "en panne"
      if (raison_modification === 'bus_en_panne') {
        await client.query(
          'UPDATE bus SET statut = $1 WHERE id = $2',
          ['en panne', oldBusId]
        );
      } else {
        // Sinon, libérer l'ancien bus (disponible)
        await client.query(
          'UPDATE bus SET statut = $1 WHERE id = $2',
          ['disponible', oldBusId]
        );
      }
      
      // Affecter le nouveau bus
      await client.query(
        'UPDATE bus SET statut = $1 WHERE id = $2',
        ['affecté', bus_id]
      );
    }

    // Gestion des changements de chauffeur
    if (chauffeur_id !== oldChauffeurId) {
      // Libérer l'ancien chauffeur
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['Disponible', oldChauffeurId]
      );
      
      // Affecter le nouveau chauffeur
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['En service', chauffeur_id]
      );
    }

    await client.query('COMMIT');

    // Récupération des détails complets
    const details = await client.query(
      `SELECT 
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.date_prise_charge,
        b.matricule AS matricule_bus,
        b.marque,
        b.modele,
        b.nb_places,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(200).json({
      success: true,
      affectation: {
        id: details.rows[0].id,
        bus_id: details.rows[0].bus_id,
        chauffeur_id: details.rows[0].chauffeur_id,
        matriculeBus: details.rows[0].matricule_bus,
        matriculeChauffeur: details.rows[0].matricule_chauffeur,
        placesDisponibles: details.rows[0].nb_places,
        nomChauffeur: `${details.rows[0].nom} ${details.rows[0].prenom}`,
        marqueBus: details.rows[0].marque,
        modele: details.rows[0].modele,
        date_prise_charge: details.rows[0].date_prise_charge,
        raison_modification: raison_modification
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la modification d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification de l\'affectation',
      error: err.message
    });
  } finally {
    client.release();
  }
});
// Supprimer une affectation
app.delete('/api/affectations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const affectationCheck = await pool.query(
      'SELECT bus_id, chauffeur_id FROM affectations WHERE id = $1',
      [id]
    );
    
    if (affectationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }
    
    const busId = affectationCheck.rows[0].bus_id;
    const chauffeurId = affectationCheck.rows[0].chauffeur_id;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        'DELETE FROM affectations WHERE id = $1',
        [id]
      );
      
      await client.query(
        'UPDATE bus SET statut = $1 WHERE id = $2',
        ['disponible', busId]
      );
      
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['Disponible', chauffeurId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Affectation supprimée avec succès'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erreur lors de la suppression d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'affectation'
    });
  }
});
//----------------------------------------------transport externe--------------------------------------------------------
// Transport Companies API
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, contract_start, contract_end FROM transport_companies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, contract_start, contract_end FROM transport_companies WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, contract_start, contract_end } = req.body;
    
    if (!name?.trim() || !contract_start || !contract_end) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and contract dates are required' 
      });
    }
    
    // Check for existing company with same name
    const existing = await pool.query(
      'SELECT id FROM transport_companies WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Company already exists' });
    }

    const result = await pool.query(
      'INSERT INTO transport_companies (name, contract_start, contract_end) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), contract_start, contract_end]
    );
    
    res.status(201).json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error adding company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contract_start, contract_end } = req.body;
    
    if (!name?.trim() || !contract_start || !contract_end) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and contract dates are required' 
      });
    }
    
    // Check for company with same name (excluding current company)
    const existing = await pool.query(
      'SELECT id FROM transport_companies WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Company name already in use' });
    }
    
    const result = await pool.query(
      'UPDATE transport_companies SET name = $1, contract_start = $2, contract_end = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name.trim(), contract_start, contract_end, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // First delete associated buses
    await client.query('DELETE FROM external_buses WHERE company_id = $1', [id]);
    
    // Then delete the company
    const result = await client.query(
      'DELETE FROM transport_companies WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Company and associated buses deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

const uploadDir = path.join(__dirname, 'uploads');
const driversDir = path.join(uploadDir, 'drivers');

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(driversDir)) {
  fs.mkdirSync(driversDir, { recursive: true });
}
// Configure storage for driver photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, driversDir); // Use the directory path variable
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'driver-' + uniqueSuffix + ext);
  }
});

// Create upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// External Buses API
app.get('/api/external-buses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT eb.*, tc.name as company_name 
      FROM external_buses eb
      JOIN transport_companies tc ON eb.company_id = tc.id
      ORDER BY tc.name, eb.matricule
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching external buses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/external-buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT eb.*, tc.name as company_name
      FROM external_buses eb
      JOIN transport_companies tc ON eb.company_id = tc.id
      WHERE eb.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }
    
    res.json({ success: true, bus: result.rows[0] });
  } catch (err) {
    console.error('Error fetching bus:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/companies/:id/buses', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM external_buses WHERE company_id = $1 ORDER BY matricule',
      [id]
    );
    
    res.json({ success: true, buses: result.rows });
  } catch (err) {
    console.error('Error fetching company buses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Basic email validation
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/external-buses', upload.single('photo_chauffeur'), async (req, res) => {
  try {
    const {
      company_id, matricule, marque, modele, type_eng, 
      couleur, kilometrage, annee, nb_places, chauffeur_nom, chauffeur_prenom,
      chauffeur_matricule, email, telephone, 
      username, password, statut
    } = req.body;
    
    // Validate required fields
    if (!company_id || !matricule?.trim() || !marque?.trim() || !modele?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID, matricule, brand and model are required' 
      });
    }
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Photo path if uploaded
    const photo_chauffeur_url = req.file ? `/uploads/drivers/${req.file.filename}` : null;

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      console.log("Mot de passe reçu :", password);
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }
    
    const result = await pool.query(
      `INSERT INTO external_buses (
        company_id, matricule, marque, modele, type_eng, 
        couleur, kilometrage, annee, nb_places, chauffeur_nom, chauffeur_prenom,
        chauffeur_matricule, email, telephone, photo_chauffeur_url,
        username, password, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
      RETURNING *`,
      [
        company_id, 
        matricule.trim(), 
        marque.trim(), 
        modele.trim(), 
        type_eng || null, 
        couleur || null, 
        kilometrage || 0, 
        annee || new Date().getFullYear(),
        nb_places || null,
        chauffeur_nom || null,
        chauffeur_prenom || null,
        chauffeur_matricule || null, 
        email || null, 
        telephone || null,
        photo_chauffeur_url,
        username || null, 
        hashedPassword, 
        statut || 'Actif'
      ]
    );
    
    // Get company name
    const companyName = await pool.query(
      'SELECT name FROM transport_companies WHERE id = $1',
      [company_id]
    );
    
    const newBus = result.rows[0];
    newBus.company_name = companyName.rows[0]?.name;
    
    res.status(201).json({ success: true, bus: newBus });
  } catch (err) {
    console.error('Error adding bus:', err);
    
    if (err.code === '23505' && err.constraint === 'external_buses_matricule_key') {
      return res.status(409).json({ success: false, error: 'Bus with this matricule already exists' });
    }
    
    if (err.code === '23503') {
      return res.status(400).json({ success: false, error: 'Company does not exist' });
    }
    
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.put('/api/external-buses/:id', upload.single('photo_chauffeur'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_id, matricule, marque, modele, type_eng, 
      couleur, kilometrage, annee, nb_places, chauffeur_nom, chauffeur_prenom,
      chauffeur_matricule, email, telephone, 
      username, password, statut
    } = req.body;
    
    // Validate required fields
    if (!company_id || !matricule?.trim() || !marque?.trim() || !modele?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID, matricule, brand and model are required' 
      });
    }
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Get current bus data to check if photo exists
    const currentBus = await pool.query(
      'SELECT photo_chauffeur_url, password FROM external_buses WHERE id = $1',
      [id]
    );
      
    if (currentBus.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }

    // Handle photo: use new photo if uploaded, otherwise keep existing one
    const photo_chauffeur_url = req.file 
      ? `/uploads/drivers/${req.file.filename}` 
      : currentBus.rows[0].photo_chauffeur_url;

    // Handle password: hash new password if provided, otherwise keep existing one
    let passwordParam;
    if (password) {
      // New password provided, hash it
      passwordParam = await bcrypt.hash(password, SALT_ROUNDS);
    } else {
      // No new password, use existing one
      passwordParam = currentBus.rows[0].password;
    }
    
    // Update record with new data
    const result = await pool.query(
      `UPDATE external_buses SET
        company_id = $1, matricule = $2, marque = $3, modele = $4, type_eng = $5, 
        couleur = $6, kilometrage = $7, annee = $8, nb_places = $9, chauffeur_nom = $10, 
        chauffeur_prenom = $11, chauffeur_matricule = $12, email = $13, telephone = $14, 
        photo_chauffeur_url = $15, username = $16, password = $17, statut = $18
      WHERE id = $19
      RETURNING *`,
      [
        company_id, 
        matricule.trim(), 
        marque.trim(), 
        modele.trim(), 
        type_eng || null, 
        couleur || null, 
        kilometrage || 0, 
        annee || new Date().getFullYear(),
        nb_places || null,
        chauffeur_nom || null,
        chauffeur_prenom || null,
        chauffeur_matricule || null, 
        email || null, 
        telephone || null,
        photo_chauffeur_url,
        username || null, 
        passwordParam, 
        statut || 'Actif',
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }
    // Get company name
    const companyName = await pool.query(
      'SELECT name FROM transport_companies WHERE id = $1',
      [company_id]
    );
    
    const updatedBus = result.rows[0];
    updatedBus.company_name = companyName.rows[0]?.name;
    
    res.json({ success: true, bus: updatedBus });
  } catch (err) {
    console.error('Error updating bus:', err);
    
    if (err.code === '23505' && err.constraint === 'external_buses_matricule_key') {
      return res.status(409).json({ success: false, error: 'Bus with this matricule already exists' });
    }
    
    if (err.code === '23503') {
      return res.status(400).json({ success: false, error: 'Company does not exist' });
    }
    
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/external-buses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM external_buses WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus non trouvé' });
    }

    res.json({ success: true, message: 'Bus supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du bus externe:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});
//--------------------------------------------Les lignes---------------------------------
//========================================
// GET - Fetch all lines with stops
app.get('/api/lines', async (req, res) => {
  try {
    const linesResult = await pool.query(
      'SELECT * FROM lines ORDER BY number ASC'
    );
    
    // For each line, get its stops
    const lines = linesResult.rows;
    for (let line of lines) {
      const stopsResult = await pool.query(
        'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
        [line.id]
      );
      line.stops = stopsResult.rows;
    }
    
    res.json(lines);
  } catch (error) {
    console.error('Erreur lors de la récupération des lignes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des lignes' });
  }
});

// GET - Fetch a specific line by ID with its stops
app.get('/api/lines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lineResult = await pool.query(
      'SELECT * FROM lines WHERE id = $1',
      [id]
    );

    if (lineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }

    const line = lineResult.rows[0];
    
    // Get stops associated with this line
    const stopsResult = await pool.query(
      'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
      [id]
    );
    
    line.stops = stopsResult.rows;
    
    res.json(line);
  } catch (error) {
    console.error('Erreur lors de la récupération de la ligne:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la ligne' });
  }
});

// POST - Create a new line with stops
app.post('/api/lines', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { number, name, depart, arrivee, distance, duree, stops } = req.body;
    
    // Check if the number already exists
    const checkNumber = await client.query(
      'SELECT * FROM lines WHERE number = $1',
      [number]
    );
    
    if (checkNumber.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro de ligne existe déjà' });
    }
    
    // Create the line
    const lineResult = await client.query(
      `INSERT INTO lines (number, name, depart, arrivee, distance, duree) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [number, name, depart, arrivee, distance || '', duree || '']
    );

    const newLine = lineResult.rows[0];
    
    // Add stops if provided
    if (stops && Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const coordinates = stop.coordinates ? JSON.stringify(stop.coordinates) : null;
        
        await client.query(
          `INSERT INTO stops (line_id, name, position, coordinates) 
           VALUES ($1, $2, $3, $4)`,
          [newLine.id, stop.name, i + 1, coordinates]
        );
      }
    }
    // Si aucun arrêt n'est fourni, créer au moins les arrêts de départ et d'arrivée
    else if (depart && arrivee) {
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [newLine.id, depart, 1]
      );
      
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [newLine.id, arrivee, 2]
      );
    }
    
    await client.query('COMMIT');
    
    // Get the complete line with its stops
    const completeLine = await getCompleteLineById(newLine.id);
    
    res.status(201).json(completeLine);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la ligne:', error);
    res.status(400).json({ message: 'Erreur lors de la création de la ligne', error: error.message });
  } finally {
    client.release();
  }
});

// PUT - Update an existing line with its stops
app.put('/api/lines/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { number, name, depart, arrivee, distance, duree, stops } = req.body;
    
    // Check if the number already exists for another line
    const checkNumber = await client.query(
      'SELECT * FROM lines WHERE number = $1 AND id != $2',
      [number, id]
    );
    
    if (checkNumber.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro de ligne existe déjà' });
    }

    // Update the line
    const lineResult = await client.query(
      `UPDATE lines 
       SET number = $1, name = $2, depart = $3, arrivee = $4, 
           distance = $5, duree = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [number, name, depart, arrivee, distance || '', duree || '', id]
    );

    if (lineResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }

    // Delete all existing stops for this line
    await client.query('DELETE FROM stops WHERE line_id = $1', [id]);
    
    // Add new stops
    if (stops && Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const coordinates = stop.coordinates ? JSON.stringify(stop.coordinates) : null;
        
        await client.query(
          `INSERT INTO stops (line_id, name, position, coordinates) 
           VALUES ($1, $2, $3, $4)`,
          [id, stop.name, i + 1, coordinates]
        );
      }
    }
    // Si aucun arrêt n'est fourni, créer au moins les arrêts de départ et d'arrivée
    else if (depart && arrivee) {
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [id, depart, 1]
      );
      
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [id, arrivee, 2]
      );
    }
    
    await client.query('COMMIT');
    
    // Get the complete updated line with its stops
    const updatedLine = await getCompleteLineById(id);
    
    res.json(updatedLine);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour de la ligne:', error);
    res.status(400).json({ message: 'Erreur lors de la mise à jour de la ligne', error: error.message });
  } finally {
    client.release();
  }
});

// DELETE - Delete a line (associated stops will be deleted automatically with ON DELETE CASCADE)
app.delete('/api/lines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the line before deleting it
    const lineToDelete = await getCompleteLineById(id);
    
    if (!lineToDelete) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    // Delete the line (and its stops thanks to ON DELETE CASCADE)
    await pool.query('DELETE FROM lines WHERE id = $1', [id]);

    res.json({ message: 'Ligne supprimée avec succès', deletedLine: lineToDelete });
  } catch (error) {
    console.error('Erreur lors de la suppression de la ligne:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la ligne' });
  }
});

// Routes to manage stops independently

// GET - Get all stops of a line
app.get('/api/lines/:lineId/stops', async (req, res) => {
  try {
    const { lineId } = req.params;
    
    // Check if the line exists
    const lineExists = await pool.query('SELECT id FROM lines WHERE id = $1', [lineId]);
    
    if (lineExists.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    const stopsResult = await pool.query(
      'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
      [lineId]
    );
    
    res.json(stopsResult.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des arrêts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des arrêts' });
  }
});

// POST - Add a new stop to a line
app.post('/api/lines/:lineId/stops', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { name, position, coordinates } = req.body;
    
    // Check if the line exists
    const lineExists = await pool.query('SELECT id FROM lines WHERE id = $1', [lineId]);
    
    if (lineExists.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    // If position is not specified, add to the end
    let finalPosition = position;
    if (!finalPosition) {
      const lastStopResult = await pool.query(
        'SELECT MAX(position) as max_pos FROM stops WHERE line_id = $1',
        [lineId]
      );
      finalPosition = (lastStopResult.rows[0].max_pos || 0) + 1;
    } else {
      // If a position is specified, shift the following stops
      await pool.query(
        'UPDATE stops SET position = position + 1 WHERE line_id = $1 AND position >= $2',
        [lineId, finalPosition]
      );
    }
    
    const coordinatesJson = coordinates ? JSON.stringify(coordinates) : null;
    
    const result = await pool.query(
      'INSERT INTO stops (line_id, name, position, coordinates) VALUES ($1, $2, $3, $4) RETURNING *',
      [lineId, name, finalPosition, coordinatesJson]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un arrêt:", error);
    res.status(400).json({ message: "Erreur lors de l'ajout d'un arrêt", error: error.message });
  }
});

// PUT - Update a stop
app.put('/api/stops/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, position, coordinates } = req.body;
    
    // Get the current stop
    const currentStopResult = await client.query(
      'SELECT * FROM stops WHERE id = $1',
      [id]
    );
    
    if (currentStopResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Arrêt non trouvé' });
    }
    
    const currentStop = currentStopResult.rows[0];
    const lineId = currentStop.line_id;
    
    // If position changes, adjust other stops
    if (position && position !== currentStop.position) {
      if (position > currentStop.position) {
        // Shift upwards stops between old and new position
        await client.query(
          'UPDATE stops SET position = position - 1 WHERE line_id = $1 AND position > $2 AND position <= $3',
          [lineId, currentStop.position, position]
        );
      } else {
        // Shift downwards stops between new and old position
        await client.query(
          'UPDATE stops SET position = position + 1 WHERE line_id = $1 AND position >= $2 AND position < $3',
          [lineId, position, currentStop.position]
        );
      }
    }
    
    const coordinatesJson = coordinates ? JSON.stringify(coordinates) : currentStop.coordinates;
    
    // Update the stop
    const result = await client.query(
      'UPDATE stops SET name = $1, position = $2, coordinates = $3 WHERE id = $4 RETURNING *',
      [name || currentStop.name, position || currentStop.position, coordinatesJson, id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la mise à jour d'un arrêt:", error);
    res.status(400).json({ message: "Erreur lors de la mise à jour d'un arrêt", error: error.message });
  } finally {
    client.release();
  }
});

// DELETE - Delete a stop
app.delete('/api/stops/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get the stop to delete
    const stopToDeleteResult = await client.query(
      'SELECT * FROM stops WHERE id = $1',
      [id]
    );
    
    if (stopToDeleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Arrêt non trouvé' });
    }
    
    const stopToDelete = stopToDeleteResult.rows[0];
    
    // Delete the stop
    await client.query('DELETE FROM stops WHERE id = $1', [id]);
    
    // Reorganize positions of remaining stops
    await client.query(
      'UPDATE stops SET position = position - 1 WHERE line_id = $1 AND position > $2',
      [stopToDelete.line_id, stopToDelete.position]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Arrêt supprimé avec succès', deletedStop: stopToDelete });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la suppression d'un arrêt:", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression d'un arrêt" });
  } finally {
    client.release();
  }
});

// Route pour la recherche d'arrêts par nom
app.get('/api/stops/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Un terme de recherche est requis' });
    }
    
    const searchResult = await pool.query(
      `SELECT s.*, l.number as line_number, l.name as line_name 
       FROM stops s
       JOIN lines l ON s.line_id = l.id
       WHERE s.name ILIKE $1
       ORDER BY l.number, s.position
       LIMIT 20`,
      [`%${query}%`]
    );
    
    res.json(searchResult.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'arrêts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche d\'arrêts' });
  }
});

// Route pour la santé de l'API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.post('/api/assign-bus-to-line', async (req, res) => {
  const { busId, lineId } = req.body;
  
  try {
    // Vérifier si le bus est déjà affecté à n'importe quelle ligne
    const existingAssignment = await pool.query(
      'SELECT id FROM bus_line_assignments WHERE bus_id = $1',
      [busId]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce bus est déjà affecté à une ligne'
      });
    }

    // Vérifier si la combinaison bus/ligne existe déjà
    const existingCombination = await pool.query(
      'SELECT id FROM bus_line_assignments WHERE bus_id = $1 AND line_id = $2',
      [busId, lineId]
    );

    if (existingCombination.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce bus est déjà affecté à cette ligne'
      });
    }

    // Si tout est OK, créer l'affectation
    const result = await pool.query(
      `INSERT INTO bus_line_assignments (bus_id, line_id) 
       VALUES ($1, $2) 
       RETURNING *`,
      [busId, lineId]
    );

    res.status(201).json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Désaffecter un bus d'une ligne
app.post('/api/unassign-bus-from-line', async (req, res) => {
  const { busId, lineId } = req.body;
  
  try {
    const result = await pool.query(
      `DELETE FROM bus_line_assignments 
       WHERE bus_id = $1 AND line_id = $2 
       RETURNING *`,
      [busId, lineId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Affectation non trouvée' });
    }

    res.json({ success: true, message: 'Affectation supprimée' });
  } catch (err) {
    console.error('Erreur lors de la désaffectation:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir les affectations d'un bus
app.get('/api/bus-assignments/:busId', async (req, res) => {
  const { busId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT l.id as line_id, l.number as line_number, l.name as line_name, 
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN lines l ON a.line_id = l.id
       WHERE a.bus_id = $1`,
      [busId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Erreur lors de la récupération des affectations:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Obtenir les bus affectés à une ligne
app.get('/api/line-assignments/:lineId', async (req, res) => {
  const { lineId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT b.id as bus_id, b.matricule, b.marque, b.modele, 
              b.chauffeur_nom, b.chauffeur_prenom, b.statut,
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN external_buses b ON a.bus_id = b.id
       WHERE a.line_id = $1`,
      [lineId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Erreur lors de la récupération des affectations:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.get('/api/bus-line-assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, l.number as line_number, l.name as line_name, 
             l.depart, l.arrivee
      FROM bus_line_assignments a
      JOIN lines l ON a.line_id = l.id
      WHERE a.is_active = TRUE
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get assignments for a specific bus
app.get('/api/bus-assignments/:busId', async (req, res) => {
  const { busId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT l.id as line_id, l.number as line_number, l.name as line_name, 
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN lines l ON a.line_id = l.id
       WHERE a.bus_id = $1 AND a.is_active = TRUE`,
      [busId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Error fetching bus assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get assignments for a specific line
app.get('/api/line-assignments/:lineId', async (req, res) => {
  const { lineId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT b.id as bus_id, b.matricule, b.marque, b.modele, 
              b.chauffeur_nom, b.chauffeur_prenom, b.statut,
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN external_buses b ON a.bus_id = b.id
       WHERE a.line_id = $1 AND a.is_active = TRUE`,
      [lineId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Error fetching line assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

//---------------------------------------------Les trajet----------------------------------------
// Route pour créer un trajet
app.post('/api/trajets', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      ligne_id, ligne_number, depart, arrivee, jours,
      heure_depart, heure_arrivee, duree, chauffeur,
      vehicule, statut, arrets, remarques
    } = req.body;

    // Validate time formats
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(heure_depart) || !timeRegex.test(heure_arrivee)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'Format de temps invalide. Utilisez HH:MM' 
      });
    }

    const result = await client.query(
      `INSERT INTO trajets (
        ligne_id, ligne_number, depart, arrivee, jours,
        heure_depart, heure_arrivee, duree, chauffeur,
        vehicule, statut, arrets, remarques
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        ligne_id || null, 
        ligne_number, 
        depart, 
        arrivee, 
        jours,
        heure_depart, 
        heure_arrivee, 
        duree || '', 
        chauffeur || '',
        vehicule || '', 
        statut || 'Actif', 
        arrets ? JSON.stringify(arrets) : null, 
        remarques || ''
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du trajet:', err);
    
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la création du trajet' 
    });
  } finally {
    client.release();
  }
});

// Route pour récupérer les trajets
app.get('/api/trajets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, l.name as ligne_name 
      FROM trajets t
      LEFT JOIN lines l ON t.ligne_id = l.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des trajets:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur hybride démarré sur le port ${PORT}`);
});