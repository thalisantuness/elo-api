const crypto = require('crypto');

function canonicalize(obj) {
  // Ordena chaves alfabeticamente para JSON determinístico
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return JSON.stringify(sorted);
}

function generateSignature(payload, secret) {
  const payloadStr = canonicalize(payload);
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
}

module.exports = { canonicalize, generateSignature };