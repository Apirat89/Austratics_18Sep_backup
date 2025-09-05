const path = require('path');

function loadAuthTokens() {
  // Import the auth-tokens module from TypeScript source
  return require(path.join(__dirname, '..', 'src', 'lib', 'auth-tokens.ts'));
}

module.exports = { loadAuthTokens }; 