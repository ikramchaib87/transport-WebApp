const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.160.220';
const LDAP_SEARCH_BASE = 'ou=users,dc=contoso-lab,dc=com';
const LDAP_GROUP_BASE = 'ou=Group,dc=contoso-lab,dc=com';

module.exports = {
  ldap,
  LDAP_URL,
  LDAP_SEARCH_BASE,
  LDAP_GROUP_BASE
};