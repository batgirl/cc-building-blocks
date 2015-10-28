var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');
var db = require('monk')('localhost/building-blocks');
var Courses = db.get('courses');
var Textbooks = db.get('textbooks');
var Classrooms = db.get('classrooms');
var Professors = db.get('professors');

router.use(function ensureProfessor(req, res, next) {
  if (req.session.user) {
    Professors.findOne({_id: req.session.user._id}, function(err, user) {
      if (err) return err;
      if (!user) res.redirect("/")
      else {
        res.locals.user = user;
        next();
      }
    })
  } else {
    res.redirect('/login');
  }
})

router.get('/', function(req, res, next) {
  Courses.find({}, function(err, courses) {
    if (err) return err;
    Courses.findOne({_id: req.session.user.courseId}, function(err, course) {
      if (err) return err;
      res.render('professors/index', {courses: courses, professorCourse: course});
    })
  })
});

router.post('/', function(req, res, next) {
  Professors.update({_id: req.session.user._id}, {$set: {courseId: req.body.courseId}}, function(err, user) {
    req.session.user.courseId = req.body.courseId;
    res.redirect('/professors/courses')
  })
})

router.post('/removeCourse', function(req, res, next) {
  Professors.update({_id: req.session.user._id}, {$set: {courseId: ""}}, function(err, user) {
    req.session.user.courseId = "";
    res.redirect('/professors/courses')
  })
})

module.exports = router;