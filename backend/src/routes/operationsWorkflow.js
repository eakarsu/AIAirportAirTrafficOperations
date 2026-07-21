'use strict';

const pool = require('../db');
const auth = require('../middleware/auth').authenticateToken;
const config = require('../config/operationsWorkflow');

module.exports = require('./governedWorkflow')({ db: pool, auth, config });
