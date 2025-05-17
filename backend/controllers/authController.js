const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { ldap, LDAP_URL, LDAP_SEARCH_BASE } = require('../config/ldap');
const { escapeLDAPFilter, checkGroupMembership, checkTransportRequest } = require('../utils/ldapUtils');
const { AUTHORIZED_GROUPS } = require('../config/constants');

// 1. Handle external driver login (PostgreSQL)
async function handleExternalLogin(username, password) {
  const result = await pool.query(
    `SELECT eb.id, eb.chauffeur_nom, eb.chauffeur_prenom, eb.password, tc.name as company_name 
     FROM external_buses eb 
     JOIN transport_companies tc ON eb.company_id = tc.id 
     WHERE eb.username = $1 AND eb.statut = $2`,
    [username, 'Actif']
  );
  
  if (result.rows.length === 0) return null;
  
  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password);
  
  return passwordMatch ? {
    username,
    displayName: `${user.chauffeur_nom} ${user.chauffeur_prenom || ''}`.trim(),
    role: 'chauffeur',
    isExternal: true,
    companyName: user.company_name
  } : null;
}

// 2. Handle LDAP login (internal users)
async function handleLDAPLogin(username, password) {
  const escapedUsername = escapeLDAPFilter(username);
  const client = ldap.createClient({ url: LDAP_URL });

  return new Promise((resolve, reject) => {
    // Step 1: Search for user in LDAP
    client.search(LDAP_SEARCH_BASE, {
      filter: `(uid=${escapedUsername})`,
      scope: 'sub',
      attributes: ['dn']
    }, (searchErr, searchRes) => {
      if (searchErr) {
        console.error('Erreur de recherche LDAP:', searchErr);
        client.unbind();
        return reject(new Error('Erreur lors de la recherche dans le serveur LDAP'));
      }

      let userFound = false;
      let userDN = null;

      searchRes.on('searchEntry', (entry) => {
        userFound = true;
        userDN = entry.objectName;
        console.log('Utilisateur LDAP trouvé avec DN:', userDN);
      });

      searchRes.on('error', (err) => {
        console.error('Erreur pendant la recherche LDAP:', err);
        client.unbind();
        reject(err);
      });

      searchRes.on('end', () => {
        if (!userFound) {
          console.log('Utilisateur non trouvé dans LDAP:', username);
          client.unbind();
          return resolve({
            error: {
              status: 401,
              message: 'Nom d\'utilisateur inconnu',
              errorType: 'username'
            }
          });
        }

        // Step 2: Authenticate with LDAP
        const authClient = ldap.createClient({ url: LDAP_URL });
        const explicitUserDN = `uid=${username},ou=users,dc=contoso-lab,dc=com`;

        authClient.bind(explicitUserDN, password, async (bindErr) => {
          if (bindErr) {
            console.error('Échec d\'authentification LDAP:', bindErr.message);
            authClient.unbind();
            return resolve({
              error: {
                status: 401,
                message: 'Mot de passe incorrect',
                errorType: 'password'
              }
            });
          }

          console.log('Authentification LDAP réussie pour:', username);

          // Step 3: Fetch user details
          authClient.search(LDAP_SEARCH_BASE, {
            filter: `(uid=${escapedUsername})`,
            scope: 'sub',
            attributes: ['uid', 'uidNumber', 'cn', 'givenName', 'sn', 'mail']
          }, async (userErr, userRes) => {
            if (userErr) {
              console.error('Erreur lors de la récupération des données utilisateur:', userErr);
              authClient.unbind();
              return reject(new Error('Erreur serveur'));
            }

            let userData = null;

            userRes.on('searchEntry', (entry) => {
              userData = {};
              entry.attributes.forEach(attr => {
                userData[attr.type] = attr.values[0];
              });
              console.log('Données utilisateur LDAP:', JSON.stringify(userData, null, 2));
            });

            userRes.on('error', (err) => {
              console.error('Erreur pendant la recherche des données:', err);
              authClient.unbind();
              reject(err);
            });

            userRes.on('end', async () => {
              if (!userData) {
                console.log('Aucune donnée utilisateur trouvée');
                authClient.unbind();
                return resolve({
                  error: {
                    status: 404,
                    message: 'Utilisateur non trouvé'
                  }
                });
              }

              try {
                // Step 4: Check group membership
                const roles = await checkGroupMembership(authClient, username);
                const rolePriority = ['supadmin', 'admin', 'chauffeur', 'employe'];
                let userRole = null;

                for (const role of rolePriority) {
                  if (roles[role]) {
                    userRole = role;
                    break;
                  }
                }

                if (!userRole) {
                  console.log('Utilisateur non autorisé:', username);
                  authClient.unbind();
                  return resolve({
                    error: {
                      status: 403,
                      message: 'Vous n\'avez pas l\'autorisation d\'accéder au système.'
                    }
                  });
                }

                // Step 5: Special handling for employees
                if (userRole === 'employe') {
                  console.log(`[AUTH] Vérification transport pour employé: ${username}`);
                  const request = await checkTransportRequest(username);

                  if (!request.exists) {
                    console.log('[AUTH] Refus - aucune demande trouvée');
                    authClient.unbind();
                    return resolve({
                      error: {
                        status: 403,
                        message: 'Aucune demande de transport enregistrée pour votre compte',
                        errorType: 'transport_request'
                      }
                    });
                  }

                  if (!request.approved) {
                    console.log(`[AUTH] Refus - statut: ${request.rawStatus}`);
                    authClient.unbind();
                    return resolve({
                      error: {
                        status: 403,
                        message: request.rawStatus.toLowerCase().includes('rejet') ?
                          'Votre demande a été refusée. Contactez le service transport.' :
                          `Votre demande est en cours de traitement (statut: ${request.rawStatus})`,
                        errorType: 'transport_request'
                      }
                    });
                  }
                }

                authClient.unbind();
                resolve({
                  user: {
                    username: userData.uid,
                     uidNumber: userData.uidNumber, // Ajouter le uidNumber
                    displayName: userData.cn || `${userData.givenName} ${userData.sn}`,
                    role: userRole,
                    isExternal: false
                  }
                });

              } catch (error) {
                console.error('[ERREUR AUTH] Vérification demande:', error);
                authClient.unbind();
                reject(error);
              }
            });
          });
        });
      });
    });
  });
}

// Main login controller
exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nom d\'utilisateur et mot de passe requis' 
    });
  }

  try {
    // 1. Try external driver login first
    const externalUser = await handleExternalLogin(username, password);
    if (externalUser) {
      return res.json({ success: true, user: externalUser });
    }

    // 2. Try LDAP login
    const result = await handleLDAPLogin(username, password);
    
    if (result.error) {
      return res.status(result.error.status).json({ 
        success: false,
        message: result.error.message,
        errorType: result.error.errorType 
      });
    }

    res.json({ success: true, user: result.user });

  } catch (error) {
    console.error('[ERREUR] login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur système lors de l\'authentification' 
    });
  }
};

// logout
exports.logout = async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    console.error('[ERREUR] logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la déconnexion' 
    });
  }
};

