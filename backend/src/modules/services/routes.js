const express = require('express');
const router = express.Router();
const servicesController = require('./controller');

router.get('/', servicesController.getAllServices);
router.get('/:id', servicesController.getService);
router.post('/', servicesController.createService);
router.put('/:id', servicesController.updateService);
router.delete('/:id', servicesController.deleteService);
router.post('/test', servicesController.testService);

module.exports = router;
