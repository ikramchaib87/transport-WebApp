const express = require ('express');
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

// Configuration LDAP
const LDAP_URL = 'ldap://192.168.1.8';
const LDAP_SEARCH_BASE = 'ou=users,dc=contoso-lab,dc=com';
const LDAP_GROUP_BASE = 'ou=Group,dc=contoso-lab,dc=com';

// Définir les groupes autorisés pour LDAP
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

// Fonction pour vérifier si un utilisateur est membre d'un groupe
async function checkGroupMembership(client, username) {
  return new Promise((resolve, reject) => {
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

//---------------------------------------login-------------------------------------------------------------------
// Route d'authentification hybride
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
app.get('/api/chauffeurs', async (req, res) => {
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
          message: 'Aucun chauffeur trouvé'
        });
      }

      // Créer un filtre pour rechercher tous les utilisateurs qui sont membres du groupe
      const userFilter = `(|${memberUids.map(uid => `(uid=${uid})`).join('')})`;
      
      const userSearchOptions = {
        filter: userFilter,
        scope: 'sub',
        attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'employeeNumber', 'accountStatus', 'userAccountControl']
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

        const chauffeurs = [];
        const chauffeurPromises = [];

        searchRes.on('searchEntry', (entry) => {
          const chauffeur = {};
          
          entry.attributes.forEach(attr => {
            const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
            
            switch(attr.type) {
              case 'uid':
                chauffeur.id = value;
                chauffeur.ldap_id = value;
                break;
              case 'sn':
                chauffeur.nom = value;
                break;
              case 'givenName':
                chauffeur.prenom = value;
                break;
              case 'employeeNumber':
                chauffeur.matricule = value;
                break;
              case 'telephoneNumber':
                chauffeur.tel = value;
                break;
              case 'mail':
                chauffeur.email = value;
                break;
              case 'accountStatus':
                chauffeur.statut = value;
                break;
              case 'userAccountControl':
                if (value) {
                  try {
                    const uac = parseInt(value.toString());
                    if (!isNaN(uac)) {
                      chauffeur.statut = (uac & 0x0002) ? 'Désactivé' : 'Actif';
                      chauffeur.is_active = !((uac & 0x0002));
                    } else {
                      chauffeur.statut = 'Actif';
                      chauffeur.is_active = true;
                    }
                  } catch (error) {
                    console.error('Erreur lors du traitement de userAccountControl:', error);
                    chauffeur.statut = 'Actif';
                    chauffeur.is_active = true;
                  }
                }
                break;
            }
          });

          if (!chauffeur.statut) {
            chauffeur.statut = 'Actif';
            chauffeur.is_active = true;
          }

          chauffeurs.push(chauffeur);

          if (chauffeur.ldap_id) {
            const sqlPromise = pool.query(
              `INSERT INTO chauffeurs (ldap_id, is_active) 
               VALUES ($1, $2) 
               ON CONFLICT (ldap_id) 
               DO UPDATE SET is_active = $2`,
              [chauffeur.ldap_id, chauffeur.is_active]
            ).catch(err => {
              console.error('Erreur lors de l\'insertion/mise à jour du chauffeur en SQL:', err);
            });
            
            chauffeurPromises.push(sqlPromise);
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
            await Promise.all(chauffeurPromises);
            
            return res.json({
              success: true,
              chauffeurs: chauffeurs,
              message: 'Chauffeurs récupérés et synchronisés avec la base de données'
            });
          } catch (error) {
            console.error('Erreur lors de la synchronisation avec la base de données:', error);
            return res.json({
              success: true,
              chauffeurs: chauffeurs,
              warning: 'Erreur lors de la synchronisation avec la base de données'
            });
          }
        });
      });
    });
  });
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
        attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'employeeNumber', 'accountStatus', 'userAccountControl']
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
              case 'employeeNumber':
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
        attributes: ['uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 'employeeNumber', 'accountStatus', 'userAccountControl']
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
              case 'employeeNumber':
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
      'SELECT id, matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee FROM bus'
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
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee } = req.body;
    
    // Par défaut, le statut est "disponible" pour un nouveau bus
    const busStatut = statut || 'disponible';
    
    const result = await pool.query(
      'INSERT INTO bus (matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, busStatut, annee]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de l\'ajout d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour mettre à jour un bus existant - Utilisation de l'ID à la place du matricule
app.put('/api/buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee } = req.body;
    
    const result = await pool.query(
      'UPDATE bus SET matricule = $1, marque = $2, modele = $3, type_energie = $4, couleur = $5, kilometrage = $6, type = $7, statut = $8, annee = $9 WHERE id = $10 RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
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

// API pour vérifier si un bus est réservé - Utilisation de l'ID à la place du matricule
app.get('/api/buses/:id/reservations', async (req, res) => {
  try {
    const { id } = req.params;
    
    // D'abord, récupérez le matricule associé à cet ID
    const busResult = await pool.query('SELECT matricule FROM bus WHERE id = $1', [id]);
    
    if (busResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
    const matricule = busResult.rows[0].matricule;
    
    // Vérifiez s'il existe des réservations actives pour ce bus
    const result = await pool.query(
      'SELECT COUNT(*) FROM reservations WHERE matricule_bus = $1 AND statut = $2',
      [matricule, 'active'] // Ajustez selon votre structure de données
    );
    
    const isReserved = parseInt(result.rows[0].count) > 0;
    
    // Si le bus est réservé, mettre à jour son statut
    if (isReserved) {
      await pool.query(
        'UPDATE bus SET statut = $1 WHERE id = $2',
        ['réservé', id]
      );
    }
    
    res.json({ isReserved });
  } catch (err) {
    console.error('Erreur lors de la vérification des réservations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Écoutez les réservations et mettez à jour le statut des bus en conséquence
app.post('/api/reservations', async (req, res) => {
  try {
    const { matricule_bus, statut } = req.body;
    
    // Insérer la réservation
    await pool.query(
      'INSERT INTO reservations (matricule_bus, statut, date_reservation) VALUES ($1, $2, NOW())',
      [matricule_bus, statut]
    );
    
    // Mettre à jour le statut du bus si la réservation est active
    if (statut === 'active') {
      // Récupérer l'ID du bus à partir du matricule
      const busResult = await pool.query('SELECT id FROM bus WHERE matricule = $1', [matricule_bus]);
      
      if (busResult.rows.length > 0) {
        const busId = busResult.rows[0].id;
        
        await pool.query(
          'UPDATE bus SET statut = $1 WHERE id = $2',
          ['réservé', busId]
        );
      }
    }
    
    res.status(201).json({ message: 'Réservation créée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la création de la réservation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
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


// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur hybride démarré sur le port ${PORT}`);
});