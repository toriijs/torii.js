var express = require('express');
var router = express.Router();
var rbac = require('mongoose-rbac');
var permission = rbac.Permission;
var _ = require('underscore');

/// List
router.get('/list', function(req, res) {

  permission.find({}, function(err, perms) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
      return;
    }

    res.json({
      success: true,
      permission: _.groupBy(perms, 'subject')
    });

  });
});

module.exports = router;
