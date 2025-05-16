const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const pool = require('../config/db');

exports.getDrivers = async (req, res) => {
  try {
    // 1. Connexion au serveur LDAP
    const client = ldap.createClient({ url: LDAP_URL });

    // 2. Recherche du groupe 'chauffeur'
    const groupSearchOptions = {
      filter: '(&(objectClass=posixGroup)(cn=chauffeur))',
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
}