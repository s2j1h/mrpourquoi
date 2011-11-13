/**
 *  * Mr Pourquoi *
 *
 */

// @api: test

var express = require('express');
var mongoose = require('mongoose');
csrf = require('express-csrf');
mongoose.connect('mongodb://express-test:express-test@dbh83.mongolab.com:27837/express-test');

//MongoDB model
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var Answers = new Schema({
    author    : { type: String, index:  true  }
  , body      : String
  , date      : Date
  , votes : Number
});

var Questions = new Schema({
    author    : { type: String, index:  true  }
  , body      : String
  , date      : Date
  , answers   : [Answers]
  , votes : Number
});
var Question = mongoose.model('Questions', Questions)
var Answer = mongoose.model('Answers', Answers)


var app = module.exports = express.createServer();

app.dynamicHelpers({
    csrf: csrf.token
});

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(csrf.check());
  app.use(function(req, res, next){
    res.render('404', { status: 404, url: req.url, title: "Erreur" });
  });

  app.use(function(err, req, res, next){
    res.render('500', {
      status: err.status || 500
    , error: err
    , title: "Erreur"
    });
  });

});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

//errors
app.get('/404', function(req, res, next){
  next();
});

app.get('/500', function(req, res, next){
  next(new Error('Holy guacamole!'));
});


//index
app.get('/', function(req, res){
   res.render('index', {
    title: 'Accueil',
    locals: {flash: req.flash()}
  });
});



//vote for a question by id
app.get('/question/:id/vote', function(req, res){

  if(req.params.id == null || req.params.id == ''){
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){
      if(err != null) {
        console.log("Error in GET /Question/:id/vote" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
          res.redirect('back');
      } else {
        doc.votes = doc.votes + 1;
        doc.save(function (err) {
          if(err == null) {
            req.flash('success', 'Bravo! vous avez voté pour la question qui devient ainsi un peu plus populaire gràce à vous');
            res.redirect('back');
          } else {
            console.log("Error in GET /Question/:id/vote" + err);
            req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre vote n\'a pas été enregistré. Pourquoi ne pas réessayer ?');
            res.redirect('back');
          }
        });
      }
    });
  }
});

//vote for a answer by id
app.get('/question/:id/answer/:id_answer/vote', function(req, res){

  if(req.params.id == null || req.params.id == '' || req.params.id_answer == null || req.params.id_answer == ''){
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){
      if(err != null) {
        console.log("Error in GET /question/:id/answer/:id_answer/vote'" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question dans la base :( ');
          res.redirect('back');
      } else {
        if(doc.answers.id(req.params.id_answer) == null) {
          req.flash('error', 'Mille millions de mille sabords! Nous sommes désolé mais nous n\'avons pas trouvé la réponse dans la base :( ');
          res.redirect('back');
        } else {
          doc.answers.id(req.params.id_answer) .votes = doc.answers.id(req.params.id_answer).votes + 1;
          doc.save(function (err) {
            if(err == null) {
              req.flash('success', 'Bravo! vous avez voté pour la réponse qui devient ainsi un peu plus populaire gràce à vous');
              res.redirect('back');
            } else {
              console.log("Error in GET /question/:id/answer/:id_answer/vote'" + err);
              req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre vote n\'a pas été enregistré. Pourquoi ne pas réessayer ?');
              res.redirect('back');
            }
          });
        }
      }
    });
  }
});


//answer to a question by id
app.post('/question/:id/answer', function(req, res){

  if(req.params.id == null || req.params.id == ''){
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question pour y apporter une réponse :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){
      if(err != null) {
        console.log("Error in GET /Question/:id/answer" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
          res.redirect('back');
      } else {

         if(req.body.answer.text==null || req.body.answer.text==''){
            req.flash('error', 'Holy guacamole! Pour répondre à une question, il faut d\'abord remplir le champ correspondant ci-dessous !');
            res.redirect('back');
          } else {
          var answer = new Answer();
          answer.author = "anonynme";
          answer.date = new Date();
          answer.votes = 0;
          answer.body = req.body.answer.text;
          doc.answers.push(answer);
          doc.save(function (err) {
            if(err == null) {
              req.flash('success', 'Bravo! vous avez donné une réponse à la question - pourquoi ne pas essayer de répondre à une autre question?');
              res.redirect('back');
            } else {
              console.log("Error inGET /Question/:id/answer" + err);
              req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre réponse n\'a pas été enregistrée. Pourquoi ne pas réessayer ?');
              res.redirect('back');
            }
          });
        }
      }
    });
  }
});




//get a question by id
app.get('/question/:id/show', function(req, res){

  if(req.params.id == null || req.params.id == ''){
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){
      if(err != null) {
        console.log("Error in GET /Question/:id" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
          res.redirect('back');
      } else {
          res.render('view_question', {
            title: 'Une question et ses réponses',
            question: doc,
            locals: {flash: req.flash()}
          });
      }
    });
  }
});


//get question
app.get('/question', function(req, res){
  res.render('question', {
    title: 'Poser une question',
    locals: {flash: req.flash()}
  });
});

//post question
app.post('/question', function(req, res){

  //console.log("req.body:" + req.body.question.text); 
  if(req.body.question.text==null || req.body.question.text==''){
    req.flash('error', 'Holy guacamole! Pour poser une question, il faut d\'abord remplir le champ correspondant ci-dessous !');
    res.redirect('back');
  } else {
    var question = new Question();
    question.author = "anonynme";
    question.date = new Date();
    question.votes = 0;
    question.body = req.body.question.text;
    //question.answers.push({body:'Une réponse',date: new Date(),votes: 76});
   
    question.save(function (err) {
      if(err == null) {
        req.flash('info', 'Bien joué! Votre question a bien été posée');
      } else {
        console.log("Error in POST /Question:" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été posée. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      }
    });
    res.redirect('/question/'+question._id+'/show');
  }
});

//get questions list
app.get('/question/list', function(req, res){

  Question.find(function (err, doc){
    if(err != null) {
      console.log("Error in GET /Question/list" + err);
      req.flash('error', 'Bloody tzatziki! Une erreur est survenue et la liste de questions n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
      res.redirect('back');
    } else if(doc == null) {
      req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé de question en base - pourquoi ne pas en rédiger une ? ');
      res.redirect('back');
    } else {
      res.render('list_questions', {
            title: 'Les questions',
            questions: doc,
            locals: {flash: req.flash()}
          });
      }
    });
});



var port = process.env.PORT || 3210;
app.listen(port, function(){
  console.log("Listening on " + port);
});
console.log("Express server listening on port %d", app.address().port);
