const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const pool = require('../config/db');

exports.getDrivers = async (req, res) => {
  try {
    // Connect to LDAP server
    const client = ldap.createClient({
      url: LDAP_URL
    });

    // Search for members of the chauffeur group
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

        // Create filter to search for all users who are members of the group
        const userFilter = `(|${memberUids.map(uid => `(uid=${uid})`).join('')})`;
        
        // Add jpegPhoto to the attributes list to fetch photos
        const userSearchOptions = {
          filter: userFilter,
          scope: 'sub',
          attributes: [
            'uid', 'cn', 'sn', 'givenName', 'mail', 'telephoneNumber', 
            'uidNumber', 'accountStatus', 'userAccountControl', 'jpegPhoto'
          ]
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
              // Default values to ensure all driver objects have the same structure
              ldap_id: null,
              matricule: null,
              nom: null,
              prenom: null,
              email: '',
              tel: '',
              statut: 'Actif',
              is_active: true,
              disponibilite: 'Disponible',
              photo_url: '' // Default empty photo URL
            };
            
            entry.attributes.forEach(attr => {
              const value = attr.values && attr.values.length > 0 ? attr.values[0] : null;
              
              switch(attr.type) {
                case 'uid':
                  chauffeur.ldap_id = value;
                  chauffeur.id = value; // Add ID for React
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
                case 'jpegPhoto':
  if (value) {
    try {
      // Vérifier si c'est un buffer valide
      const photoBuffer = Buffer.isBuffer(value) 
        ? value 
        : Buffer.from(value, 'binary');
      
      // Vérifier la taille du buffer
      if (photoBuffer.length > 0) {
        const base64Photo = photoBuffer.toString('base64');
        chauffeur.photo_url = `data:image/jpeg;base64,${base64Photo}`;
      } else {
        chauffeur.photo_url = '';
      }
    } catch (error) {
      console.error('Erreur conversion photo:', error);
      chauffeur.photo_url = '';
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
              // Strict filtering of drivers with all required fields
              const validChauffeurs = [];
              const invalidChauffeurs = [];
              
              for (const chauffeur of ldapChauffeurs) {
                // Strict check to ensure required fields are not null or empty strings
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
              
              // Detailed logging of invalid drivers
              if (invalidChauffeurs.length > 0) {
                console.warn('Chauffeurs ignorés car ils n\'ont pas tous les champs requis:');
                invalidChauffeurs.forEach((c, index) => {
                  console.warn(`${index + 1}. LDAP ID: ${c.ldap_id || 'NULL'}, Matricule: ${c.matricule || 'NULL'}, Nom: ${c.nom || 'NULL'}, Prénom: ${c.prenom || 'NULL'}`);
                });
              }
              
              // Get availability information from the database
              const dbChauffeurs = await pool.query('SELECT ldap_id, disponibilite, photo_url FROM chauffeurs');
              const chauffeurInfoMap = {};
              
              // Create a map of availabilities and stored photo URLs
              dbChauffeurs.rows.forEach(chauffeur => {
                chauffeurInfoMap[chauffeur.ldap_id] = {
                  disponibilite: chauffeur.disponibilite,
                  photo_url: chauffeur.photo_url
                };
              });
              
              // Update drivers with DB values
              validChauffeurs.forEach(chauffeur => {
                const dbInfo = chauffeurInfoMap[chauffeur.ldap_id];
                if (dbInfo) {
                  // Prefer LDAP photo but fall back to DB photo if LDAP has none
                  if (!chauffeur.photo_url && dbInfo.photo_url) {
                    chauffeur.photo_url = dbInfo.photo_url;
                  }
                  chauffeur.disponibilite = dbInfo.disponibilite;
                }
                // Otherwise, keep default 'Disponible' value
              });
              
              // Synchronize database in the background without waiting to respond to user
              validChauffeurs.forEach(async (chauffeur) => {
                try {
                  // Double check before insertion
                  if (!chauffeur.matricule) {
                    console.error(`ERREUR CRITIQUE: Tentative d'insertion d'un chauffeur sans matricule après filtrage: ${chauffeur.ldap_id}`);
                    return;
                  }
                  
                  await pool.query(
                    `INSERT INTO chauffeurs 
                    (ldap_id, matricule, nom, prenom, email, tel, statut, disponibilite, is_active, photo_url) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                    ON CONFLICT (ldap_id) 
                    DO UPDATE SET 
                      matricule = EXCLUDED.matricule,
                      nom = EXCLUDED.nom,
                      prenom = EXCLUDED.prenom,
                      email = EXCLUDED.email,
                      tel = EXCLUDED.tel,
                      statut = EXCLUDED.statut,
                      is_active = EXCLUDED.is_active,
                      photo_url = CASE 
                      WHEN EXCLUDED.photo_url != '' THEN EXCLUDED.photo_url 
                      ELSE chauffeurs.photo_url
                      END,
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
                      chauffeur.is_active,
                      chauffeur.photo_url
                    ]
                  );
                } catch (insertError) {
                  console.error(`Erreur lors de l'insertion/mise à jour du chauffeur en SQL:`, insertError);
                  console.error(`Données chauffeur problématiques:`, JSON.stringify(chauffeur));
                }
              });
              
              // Return LDAP drivers directly (with DB availabilities if they exist)
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
}