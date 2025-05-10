const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const { AUTHORIZED_GROUPS } = require('../config/constants');
const pool = require('../config/db');

// 1. Check LDAP group membership
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

// 2. Check transport request status
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

// 3. Escape LDAP special characters
function escapeLDAPFilter(input) {
  if (!input) return input;
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\*/g, '\\*')
    .replace(/\0/g, '\\0');
}

module.exports = {
  checkGroupMembership,
  checkTransportRequest,
  escapeLDAPFilter
};