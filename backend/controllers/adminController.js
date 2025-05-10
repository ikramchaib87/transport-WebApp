const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const pool = require('../config/db');

// Get all sous-admins from LDAP and synchronize with database
exports.getSousAdmins = async (req, res) => {
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
      client.unbind();
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
      client.unbind();
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
};