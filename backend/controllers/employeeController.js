const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const pool = require('../config/db');

exports.getEmployees = async (req, res) => {
  // 1. Create LDAP client (identical to your original code)
  const client = ldap.createClient({
    url: LDAP_URL
  });

  // 2. Search for 'employe' group members (exact copy)
  const groupSearchOptions = {
    filter: `(&(objectClass=posixGroup)(cn=employe))`,
    scope: 'sub',
    attributes: ['memberUid']
  };

  client.search(LDAP_GROUP_BASE, groupSearchOptions, (groupErr, groupRes) => {
    if (groupErr) {
      console.error('Erreur de recherche du groupe LDAP:', groupErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la recherche du groupe dans LDAP' 
      });
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
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur pendant la recherche du groupe LDAP' 
      });
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

      // 3. Fetch all employee users (exact copy of your original user search)
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
          
          // 4. Return response (identical to your original)
          res.json({
            success: true,
            employes: employes,
            message: 'Employés récupérés depuis LDAP'
          });
        });
      });
    });
  });
};