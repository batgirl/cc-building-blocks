var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');
var db = require('monk')('localhost/building-blocks');
var Students = db.get('students');
var Professors = db.get('professors');
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

function ensureNotLoggedIn(req, res, next) {
  if (req.session.user) {
    res.redirect('/');
  } else {
    next();
  }
}

function Student() {
  this.email;
  this.password;
  this.name;
  this.year;
  this.courseIds = [];
}

function Professor() {
  this.email;
  this.password;
  this.name;
  this.office;
  this.courseId;
}

// some bugs when re-rendering errors

router.get('/', function(req, res, next) {
  if (req.session.user) {
    Students.findOne({_id: req.session.user._id}, function(err, user) {
      if (err) return err;
      if (!user) {
        Professors.findOne({_id: req.session.user._id}, function(err, u) {
          if (err) return err;
          res.render('index', {user: u, accountType: "professor"})
        })
      } else {
        res.render('index', {user: user, accountType: "student"});
      };
    });
  } else {
    res.render('index', {user: "", accountType: ""});
  }
})

router.get('/signup', ensureNotLoggedIn, function(req, res, next) {
  res.render('signup', {errors: "", email: "", inputEmail: "", inputName: "", inputOffice: ""});
});

router.post('/signup', function(req, res, next) {
  var errors = [];
  if (req.body.email.split("").indexOf("@") == -1 || !req.body.email) errors.push("Email can't be blank");
  // use professional regex to check if its a valid email
  if (!req.body.password || !req.body.passwordConfirm) errors.push("Password can't be blank");
  if (req.body.password !== req.body.passwordConfirm) errors.push("Passwords must match");
  if (errors.length) res.render('signup', {errors: errors, email: "", inputEmail: req.body.email, inputName: req.body.name});
  Students.findOne({email: req.body.email}, function(err, user) {
    if (err) return err;
    if (user) errors.push("Email is already in use");
    if (errors.length) res.render('signup', {errors: errors, email: "", inputEmail: req.body.email, inputName: req.body.name, inputOffice: req.body.office});
    Professors.findOne({email: req.body.email}, function(err, u) {
      if (err) return err;
      if (user) errors.push("Email is already in use");
      if (errors.length) res.render('signup', {errors: errors, email: "", inputEmail: req.body.email, inputName: req.body.name, inputOffice: req.body.office});
      else {
        var normalizedEmail = req.body.email.trim().toLowerCase();
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
          if (err) return err;
          bcrypt.hash(req.body.password, salt, function(err, hash) {
            if (err) return err;
            if (req.body.accountType === "student") {
              Students.insert({email: normalizedEmail, name: req.body.name, password: hash, year: req.body.year, courseIds: []}, function(err, user) {
                if (err) return err;
                req.session.user = user;
                res.redirect('/students/courses');
              })
            } else if (req.body.accountType === "professor") {
              Professors.insert({email: normalizedEmail, name: req.body.name, password: hash, office: req.body.office, courseId: ""}, function(err, user) {
                if (err) return err;
                req.session.user = user;
                res.redirect('/professors/courses');
              })
            }
          })
        })
      }
    })
  })
})

router.get('/login', ensureNotLoggedIn, function(req, res, next) {
  res.render('login', {errors: "", email: "", inputEmail: ""});
});

router.post('/login', function(req, res, next) {
  var errors = [];
  if (req.body.email.split("").indexOf("@") == -1 || !req.body.email || !req.body.password) errors.push("Email / Password are invalid");
  if (errors.length) res.render('login', {errors: errors, email: "", inputEmail: req.body.email});
  else {
    var normalizedEmail = req.body.email.trim().toLowerCase();
    Students.findOne({email: normalizedEmail}, function(err, user) {
      if (err) return err;
      if (!user) {
        Professors.findOne({email: normalizedEmail}, function(err, u) {
          if (err) return err;
          if (!u) errors.push("Email / Password are invalid");
          if (errors.length) res.render('login', {errors: errors, email: "", inputEmail: req.body.email});
          else {
            bcrypt.compare(req.body.password, u.password, function(err, boo) {
              if (boo) {
                req.session.user = u;
                res.redirect("/professors/courses");                
              } else {
                errors.push("Email / Password are invalid");
                res.render('login', {errors: errors, email: "", inputEmail: req.body.email});
              }
            })
          }
        });
      } else {
        bcrypt.compare(req.body.password, user.password, function(err, boo) {
          if (boo) {
            req.session.user = user;
            res.redirect("/students/courses");                
          } else {
            errors.push("Email / Password are invalid");
            res.render('login', {errors: errors, email: "", inputEmail: req.body.email});
          }
        })
      }
    })
  }
})

router.get('/signout', function(req, res, next) {
  req.session = null;
  res.redirect("/");
});


module.exports = router;
