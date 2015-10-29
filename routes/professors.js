var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');
var db = require('monk')('localhost/building-blocks');
var Courses = db.get('courses');
var Textbooks = db.get('textbooks');
var Classrooms = db.get('classrooms');
var Professors = db.get('professors');
var Students = db.get('students');
var ObjectId = require('mongodb').ObjectID;

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

function matchup(courses, students) {
  courses.forEach(function(course) {
    course.students = [];
    students.forEach(function(student) {
      student.courseIds.forEach(function(courseId) {
        if (courseId.toString() === course._id.toString()) {
          course.students.push(student)
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
      matchup(courses, students);
      var allCourseIdStrings = [];
      courses.forEach(function(elem) {
        allCourseIdStrings.push(elem._id.toString());
      })
      Professors.find({courseId: {$in: allCourseIdStrings}}, function(err, professors) {
        matchupProfs(courses, professors);
        Courses.findOne({_id: req.session.user.courseId}, function(err, userCourse) {
          if (err) return err;
          res.render('professors/index', {courses: courses, userCourse: userCourse});
        })
      })
    })
  })
})

// router.get('/', function(req, res, next) {
//   Courses.find({}, function(err, courses) {
//     if (err) return err;
//     Courses.findOne({_id: req.session.user.courseId}, function(err, course) {
//       if (err) return err;
//       res.render('professors/index', {courses: courses, professorCourse: course});
//     })
//   })
// });

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

router.get('/new', function(req, res, next) {
  res.render('professors/new', {errors: "", inputTitle: "", inputDept: "", inputBlock: "", inputDescription: ""});
})

router.post('/new', function(req, res, next) {
  var errors = [];
  if (!req.body.title || !req.body.department || !req.body.block) {
    errors.push("Title, department, and block cannot be blank");
  }
  if (errors.length) {
    res.render('professors/new', {errors: errors, inputTitle: req.body.title, inputDept: req.body.department, inputBlock: req.body.block, inputDescription: req.body.description});
  } else {
    Courses.insert({title: req.body.title, department: req.body.department, block: req.body.block, description: req.body.description, locationId: "", textbookIds: []}, function() {
      res.redirect("/professors/courses");
    })
  }
})

router.get('/:id', function(req, res, next) {
  Courses.findOne({_id: req.params.id.toString()}, function(err, course) {
    Students.find({courseIds: {$in: [course._id.toString()]}}, function(err, students) {
      Professors.find({courseId: course._id.toString()}, function(err, professors) {
      if (err) console.log(err);
      res.render('professors/show', {course: course, students: students, professors: professors});  
      })
    })
  })
})

router.get('/:id/edit', function(req, res, next) {
  Courses.findOne({_id: req.params.id}, function(err, course) {
    if (err) console.log(err);
    res.render('professors/edit', {course: course, errors: ""});  
  })
})

router.post('/:id/edit', function(req, res, next) {
  Courses.findOne({_id: req.params.id}, function(err, thisCourse) {
    if (err) console.log(err);
    var errors = [];
    if (!req.body.title || !req.body.department || !req.body.block) {
      errors.push("All fields must not be blank");
    }
    if (errors.length) res.render('/:id/edit', {course: thisCourse, errors: errors})
    Courses.update({_id: req.params.id}, {title: req.body.title, department: req.body.department, block: req.body.block, description: req.body.description}, function(err, course) {
      if (err) return err;
      res.redirect('/professors/courses/' + thisCourse._id.toString());
    })
  })
})

router.post('/:id/remove', function(req, res, next) {
  Courses.remove({_id: req.params.id}, function(err, course) {
    Professors.update({_id: req.session.user._id}, {$set: {courseId: ""}}, function() {
      req.session.user.courseId = "";
      res.redirect('/professors/courses');
    })
  })
})

module.exports = router;