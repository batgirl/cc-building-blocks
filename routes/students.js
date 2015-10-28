var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');
var db = require('monk')('localhost/building-blocks');
var Courses = db.get('courses');
var Students = db.get('students');
var Professors = db.get('professors');
var ObjectId = require('mongodb').ObjectID;

router.use(function ensureStudent(req, res, next) {
  if (req.session.user) {
    Students.findOne({_id: req.session.user._id}, function(err, user) {
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
    console.log(req.session.user.courseIds)
    Students.findOne({_id: req.session.user._id}, function(err, student) {
      Courses.find({_id: {$in: student.courseIds}}, function(err, docs) {
        if (err) console.log(err);
        console.log(docs)
        res.render('students/index', {courses: courses, studentCourses: docs});
      })            
    })
  })
})

// make sure can only add once

router.post('/', function(req, res, next) {
  Students.findOne({_id: req.session.user._id}, function(err, user) {
    if (user.courseIds.indexOf(new ObjectId(req.body.courseId)) > -1) return;
    else {
      Students.update({_id: req.session.user._id}, {$push: {courseIds: new ObjectId(req.body.courseId)}}, function(err, user) {
        if (err) return err;
        req.session.user.courseIds.push(new ObjectId(req.body.courseId));
        res.redirect('/students/courses');
      })      
    }
  })
})

router.post('/removeCourse', function(req, res, next) {
  Students.update({_id: req.session.user._id}, {$pull: {courseIds: new ObjectId(req.body.courseId)}}, function(err, user) {
    var i = req.session.user.courseIds.indexOf(new ObjectId(req.body.courseId));
    req.session.user.courseIds.splice(i, 1);
    res.redirect('/students/courses');
  })
})

router.get('/:id', function(req, res, next) {
  Courses.findOne({_id: req.params.id}, function(err, course) {
    Students.find({courseIds: {$in: [course._id]}}, function(err, students) {
      Professors.find({courseId: course._id.toString()}, function(err, professors) {
      if (err) console.log(err);
      res.render('students/show', {course: course, students: students, professors: professors});  
      })
    })
  })
})


module.exports = router;