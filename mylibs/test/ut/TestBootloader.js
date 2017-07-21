var req = require.context('./specs', true, /\.(j|t)s$/);

//require API first to initialize promises
require("../../CarbonApi");

req.keys().forEach(req);

module.exports = req;
