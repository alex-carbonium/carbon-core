var req = require.context('./specs', true, /\.(j|t)s$/);

req.keys().forEach(req);

module.exports = req;
