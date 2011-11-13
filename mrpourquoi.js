// **Mr Pourquoi** est un projet lancé par [jraigneau](http://blog.zeneffy.fr) pour tester différentes technologies, notamment
//
//  - Le serveur/framework [node.js](http://nodejs.org) en javascript basé sur le moteur [V8](http://code.google.com/p/v8/)
//  - Le framework web [express](http://expressjs.com) utilisant les mêmes idées que [sinatra](http://sinatrarb.com)
//  - La base de donnée NoSQL [mongodb](http://mongodb.org) via [mongoose](http://mongoosejs.com/)
//  - les fonctionnalités de [map/reduce](http://www.mongodb.org/display/DOCS/MapReduce#MapReduce-Overview) de mongodb
//  - Le moteur de template [jade](https://github.com/visionmedia/jade)
//  - le kit de démarrage css/javascript [bootstrap](http://twitter.github.com/bootstrap/) de Twitter
//  - (à venir) La connexion à facebook via la librairie [everyauth](https://github.com/bnoguchi/everyauth)

// Configuration de l'application
// ------------------------------

// Déclaration des dépendances
var express = require('express');       //le framework web express
var mongoose = require('mongoose');     //La librairie pour accéder à mongodb
var csrf = require('express-csrf');     //la protection anti csrf

// Création de l'application express
var app = module.exports = express.createServer();

// Déclaration d'un helper dynamique pour la protection [cross-site request forgery](http://fr.wikipedia.org/wiki/Cross-site_request_forgery)
app.dynamicHelpers({
    csrf: csrf.token
});

// Configuration de l'application, notamment des modules (ou middleware) express utilisés
// 
// Cette configuration est commune à l'environnement de développement et à l'environnement de production
app.configure(function(){
  app.set('views', __dirname + '/views');                       //définition du répertoire contenant les vues
  app.set('view engine', 'jade');                               //le moteur de template - Jade
  app.use(express.favicon());                                   // un favicon automatique (pour éviter des erreurs 404 systématiques dans les logs)
  app.use(express.bodyParser());                                // Pour gérer les formulaires
  app.use(express.cookieParser());                              // Pour la gestion des cookies et des sessions
  app.use(express.session({ secret: 'awfjepnnkqyionn14962' })); // clé d'encodage pour les cookies et les sessions
  app.use(express.methodOverride());                            // middleware pour la gestion des actions http (post/get/put/delete)
  app.use(app.router);                                          // Routage des urls
  app.use(express.static(__dirname + '/public'));               // le répertoire contenant les images, javascript et css
  app.use(csrf.check());                                        // le module anti-csrf
  // Utilisation de page 404 customisée (cf views/404.jade)
  app.use(function(req, res, next){
    res.render('404', { status: 404, url: req.url, title: "Erreur" });
  });
  // Utilisation de page 40x et 50x customisée (cf views/500.jade)
  app.use(function(err, req, res, next){
    res.render('500', {
      status: err.status || 500
    , error: err
    , title: "Erreur"
    });
  });

});

// Déclaration de la configuration spécifique à l'environnement de développement: 
// Ici on décide de faire apparaître clairement les erreurs avec les traces
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});


// Déclaratio de la configuration spécifique à l'environnement de production: 
// Pas de trace affichée en production
app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Préparation de la gestion des données
// -------------------------------------

// Connexion à la base de donnée mongodb
mongoose.connect('mongodb://express-test:express-test@dbh83.mongolab.com:27837/express-test');

// Déclaration des modèles MongoDB
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Le modèle des réponses **Answers** qui sera inclus dans chaque question (embedded document pour mongodb)
// Le champ **author** est un index
var Answers = new Schema({
    author    : { type: String, index:  true  }
  , body      : String
  , date      : Date
  , votes : Number
});

// Le modèle des questions **Question**, vous noterez la liste des réponses **answers** incluse
var Questions = new Schema({
    author    : { type: String, index:  true  }
  , body      : String
  , date      : Date
  , answers   : [Answers]
  , votes : Number
});

// Déclaration des modèles pour utilisation dans le code
var Question = mongoose.model('Questions', Questions)
var Answer = mongoose.model('Answers', Answers)


// Début de la déclaration des Routes
// ----------------------------------
// Il est important de noter que nous utilisons du javascript, par conséquent tout fonctionne via
// [callbacks](http://www.coursweb.ch/javascript/callbacks.html)

// Page d'erreur 404
app.get('/404', function(req, res, next){
  next(); // Permet d'aller à l'action suivante (cf la configuration et les fonctions définies plus haut)
});

// Page d'erreur 500
app.get('/500', function(req, res, next){
  next(new Error('Holy guacamole!'));
});


// Index de MrPourquoi
app.get('/', function(req, res){
   res.render('index', {          // on utilise le template index.jade
    title: 'Accueil',             // Le titre (champ utilisé dans layout.jade)
    locals: {flash: req.flash()}  // Pour s'assurer que les messages flash seront bien transmis
  });
});



// Gestion du vote pour une question
//
// En entrée nous avons l'**id** de la question
app.get('/question/:id/vote', function(req, res){

  if(req.params.id == null || req.params.id == ''){           // Vérification que l'id est bien dans la requête, sinon un message d'erreur
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){     // Recherche de la question correspondant à l'id en base
      if(err != null) {                                       // Une erreur est survenue pendant la recherche en base
        console.log("Error in GET /Question/:id/vote" + err); 
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {                                // Aucune question ne correspond à l'id => envoi d'un message d'erreur
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
          res.redirect('back');
      } else {
        doc.votes = doc.votes + 1;                            // On ajoute un vote supplémentaire à la question
        doc.save(function (err) {                             // Sauvegarde de la question en base
          if(err == null) {                                   // Tout s'est bien passé: retour à la page précédente avec un message
            req.flash('success', 'Bravo! vous avez voté pour la question qui devient ainsi un peu plus populaire gràce à vous');
            res.redirect('back');
          } else {                                            // La sauvegarde a échoué - retour à la page précédente avec un message d'alerte
            console.log("Error in GET /Question/:id/vote" + err);
            req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre vote n\'a pas été enregistré. Pourquoi ne pas réessayer ?');
            res.redirect('back');
          }
        });
      }
    });
  }
});

// Gestion du vote pour une réponse
//
// En entrée nous l'**id** de la question et l'**id_answer** de la réponse correspondante
app.get('/question/:id/answer/:id_answer/vote', function(req, res){

  if(req.params.id == null || req.params.id == '' || req.params.id_answer == null || req.params.id_answer == ''){ // Vérification que l'id et l'id_answer sont bien dans la requête, sinon un message d'erreur
    req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question :( ');
    res.redirect('back');
  } else {
  
    Question.findById(req.params.id, function (err, doc){            // Recherche de la question correspondant à l'id en base
      if(err != null) {                                              // Une erreur est survenue pendant la recherche en base
        console.log("Error in GET /question/:id/answer/:id_answer/vote'" + err);
        req.flash('error', 'Bloody tzatziki! Une erreur est survenue et votre question n\'a pas été trouvée dans la base. Pourquoi ne pas réessayer ?');
        res.redirect('back');
      } else if(doc == null) {                                       // Aucune question ne correspond à l'id=> envoi d'un message d'erreur
          req.flash('error', 'Holy guacamole! Nous sommes désolé mais nous n\'avons pas trouvé la question dans la base :( ');
          res.redirect('back');
      } else {
        if(doc.answers.id(req.params.id_answer) == null) {           // Aucune réponse ne correspond à l'id_answer => envoi d'un message d'erreur
          req.flash('error', 'Mille millions de mille sabords! Nous sommes désolé mais nous n\'avons pas trouvé la réponse dans la base :( ');
          res.redirect('back');
        } else {
          doc.answers.id(req.params.id_answer) .votes = doc.answers.id(req.params.id_answer).votes + 1;  // Mise à jour des votes de la réponse
          doc.save(function (err) {                                  // Sauvegarde de la question et des réponses en base
            if(err == null) {                                        // Tout s'est bien passé: retour à la page précédente avec un message
              req.flash('success', 'Bravo! vous avez voté pour la réponse qui devient ainsi un peu plus populaire gràce à vous');
              res.redirect('back');
            } else {                                                 // La sauvegarde a échoué - retour à la page précédente avec un message d'alerte
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
