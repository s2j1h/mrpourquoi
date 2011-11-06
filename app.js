
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
mongoose.connect('mongodb://express-test:express-test@dbh83.mongolab.com:27837/express-test');

//MongoDB model

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var Answers = new Schema({
    body      : String
  , date      : Date
  , votes : Number
});

var Questions = new Schema({
    author    : String
  , body      : String
  , date      : Date
  , answers   : [Answers]
  , votes : Number
});
var Question = mongoose.model('Questions', Questions)
var Answer = mongoose.model('Answers', Answers)


var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

//index
app.get('/', function(req, res){
   res.render('index', {
    title: 'Accueil'
  });
});

//get question
app.get('/question', function(req, res){
  res.render('question', {
    title: 'Poser une question',
    locals: {flash: req.flash()}
  });
});

//get questions list
app.get('/questions', function(req, res){
  res.render('questions', {
    title: 'Liste des questions',
    locals: {flash: req.flash()}
  });
});

//get questions list
app.get('/question/:id', function(req, res){
  res.render('question', {
    title: 'Question et réponses',
    locals: {flash: req.flash()}
  });
});



//post question
app.post('/question', function(req, res){

  //console.log("req.body:" + req.body.question); 
  if(req.body.question.text==null || req.body.question.text==''){
    req.flash('error', 'Holy guacamole! Pour poser une question, il faut remplir le champ correspondant !');
    res.redirect('/question');
  } else {
    var question = new Question();
    question.date = new Date();
    question.votes = 0;
    question.body = req.body.question
    //question.answers.push({body:'Une réponse',date: new Date(),votes: 76});
   
    question.save(function (err) {
      if(err == null) {
        req.flash('info', 'Bien joué! Votre question a bien été posée');
      } else {
        console.log("Error in POST /Question:" + err);
        req.flash('error', 'Holy guacamole! Une erreur est survenue et votre question n\'a pas été posée');
        res.redirect('back');
      }
  
    });
    res.redirect('/question/'+question._id);
  }

});


var port = process.env.PORT || 3210;
app.listen(port, function(){
  console.log("Listening on " + port);
});
console.log("Express server listening on port %d", app.address().port);
