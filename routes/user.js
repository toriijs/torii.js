var express = require('express');
var router = express.Router();
var account = require('../models/account');
var rbac = require('mongoose-rbac');
var role = rbac.Role;
var permission = rbac.Permission;
var tori = require('../conf/tori.conf.js').tori;
var _ = require('underscore');

// registration
router.post('/register', function(req, res) {
  account.register(new account({
    username: req.body.usernamereg
  }), req.body.password, function(err, account) {

    if (err) {
      res.send(err);
      return;
    }

    if (req.body.name) {
      account.name = req.body.name;
    }

    if (req.body.surname) {
      account.surname = req.body.surname;
    }

    // extra check for current user to avoid any injection by public
    // registration form
    if (req.body.isAdmin && req.user.isDev) {
      account.isAdmin = true;
    }

    if (req.body.isDev && req.user.isDev) {
      account.isDev = true;
    }

    account.save();

    // on role attribution check if current user is Admin or Dev
    // this will decrease risk of injections
    if (req.body.role && (req.user.isDev || req.user.isAdmin)) {
      account.addRole(req.body.role, function(err) {});
    }

    var mailOptions = {
      from: tori.conf.mail.from,
      to: req.body.usernamereg,
      subject: tori.conf.core.title + ' - Password Confirmation',
      text: 'Dear ' + (req.body.name ? req.body.name : req.body.username) + '\n here your password: ' + req.body.password + '\n\nPlease note that down!'
    };

    req.mail.sendMail(mailOptions, function(err, info) {
      if (err) {
        console.log(err);
        return;
      }

      console.log(info);
    });

    res.send({
      username: req.body.usernamereg
    });

  });
});


// update
router.post('/update', function(req, res) {

  account.findById(req.body.userid, function(err, user) {

    if (err) {
      res.send(err);
      return;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.surname) {
      user.surname = req.body.surname;
    }

    if (req.body.isAdmin) {
      if (req.user.isDev) {
        user.isAdmin = req.body.isAdmin;
      } else {
        res.send({
          error: 'You are not allowed to change user privileges'
        });
        return;
      }
    }

    if (req.body.isDev) {
      if (req.user.isDev) {
        user.isDev = req.body.isDev;
      } else {
        res.send({
          error: 'You are not allowed to change user privileges'
        });
        return;
      }
    }

    // store all changes
    user.save();

    if (req.body.role) {
      if (req.user.isDev || req.user.isAdmin) {
        user.removeAllRoles(function(err) {
          if (err) {
            console.log(err);
          }
        });

        user.addRole(req.body.role, function(err) {
          if (err) {
            console.log(err);
          }
        });
      } else {
        res.send({
          error: 'You are not allowed to change user roles'
        });
        return;
      }
    }

    if (req.body.password) {
      user.setPassword(req.body.password, function(err) {
        if (err) {
          console.log(err);
        } else {
          user.save();
        }
      });
    }

    // TODO: handle extra fields

    res.send({
      user: user.username

    });
  });
});

// user logged
router.post('/islogged', function(req, res) {
  res.send({
    confirm: 'ok',
    role: req.user.role
  });
});



// list
router.post('/list.json', function(req, res) {
  var query = {};

  if (req.body.sSearch) {
    query = {
      'name': req.body.sSeach
    };
  }

  role.find({}, function(err, roles) {
    if (err) {
      res.send(err);
      return;
    }

    account.find(query, '_id username roles token name surname', function(err, users) {
      if (err) {
        res.send({
          error: 'User list not found'
        });
        return;
      }

      var totalElements = users.length;


      if (req.body.page) {
        users = users.slice((req.body.page - 1) * req.body.count, req.body.page * req.body.count);
        console.log(users);
      }

      // TODO: order via underscore
      //
      // req.body.filter
      // req.body.sorting

      users.forEach(function(user) {
        roles.forEach(function(role) {
          if (JSON.stringify(user.roles[0]) == JSON.stringify(role._id)) {
            user.roles[0] = role.name;
          }
        });
      });

      /*res.send({
        sEcho: parseInt(req.query.sEcho),
        iTotalRecords: totElementi,
        iTotalDisplayRecords: users.length,
        aaData: users,
        serverTime: new Date().getTime()
      });*/

      res.send({
        result: users,
        total: totalElements
      });

    });
  });
});


module.exports = router;
