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

function matchup(courses, students) {
  courses.forEach(function(course) {
    course.students = [];
    students.forEach(function(student) {
      console.log("almost")
      console.log(student.courseIds);
      console.log(course._id, "yo");
      student.courseIds.forEach(function(courseId) {
        if (courseId.toString() === course._id.toString()) {
          course.students.push(student)
          console.log("worked! ", course.students)
        }
      })
    })
  })
  return courses;
}

function matchupProfs(courses, professors) {
  courses.forEach(function(course) {
    course.professors = [];
    professors.forEach(function(professor) {
      if (professor.courseId === course._id.toString()) {
        course.professors.push(professor);
      }
    })
  })
  return courses;
}

router.get('/', function(req, res, next) {
  Courses.find({}, function(err, courses) {
    if (err) return err;
    var allCourseIds = [];
    courses.forEach(function(elem) {
      allCourseIds.push(elem._id);
    })
    Students.find({courseIds: {$in: allCourseIds}}, function(err, students) {
      console.log("students: ",students)
      matchup(courses, students);
      var allCourseIdStrings = [];
      courses.forEach(function(elem) {
        allCourseIdStrings.push(elem._id.toString());
      })
      Professors.find({courseId: {$in: allCourseIdStrings}}, function(err, professors) {
        matchupProfs(courses, professors);
        Students.findOne({_id: req.session.user._id}, function(err, student) {
          Courses.find({_id: {$in: student.courseIds}}, function(err, userCourses) {
            if (err) console.log(err);
            res.render('students/index', {courses: courses, userCourses: userCourses});
          })            
        })
      })
    })
  })
})

// make sure can only add once!!!
// sort courses by block

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