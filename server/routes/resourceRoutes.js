const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const makeResourceController = require('../controllers/resourceController');

// Builds a router for a simple "list (anyone authenticated) / create (faculty)" resource.
function buildResourceRouter(table, uploadFields) {
  const router = express.Router();
  const controller = makeResourceController(table, uploadFields);

  router.use(authenticate);
  router.get('/', controller.list);
  router.post('/', authorize('faculty', 'admin'), controller.create);

  return router;
}

module.exports = buildResourceRouter;
