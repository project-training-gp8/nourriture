var route = require("express").Router();
var IngredientSchema = require("../models/ingredient");
var RecipeSchema = require("../models/recipe");
var jwt = require("express-jwt-token");
var tError = require("../error/application.js").tError;
var handle = require("../error/application.js").handle;
var ObjectId = require('mongoose').Types.ObjectId;//Nasty mongoose bussiness
route.get("/", function(req, res, next){
	/*
	** Get the lastest user submited/favorited recipes
	**
	** Params: token(optional)
	** Return values:
	**	- 200 : User authenticated -> their recipes
	**	- 200 : Anonymous user -> homepage recipes
	** TODO: plug authorization (we need an error sent back to an unauthenticated user)
	*/
	var query = RecipeSchema.find();
	query.select({_id: 1, name:1, user: 1, desc: 1, image: 1});
	query.limit(10);
	query.exec(function(err, result){
		if (!handle.database(err, req, res, next, result)){
			res.generic.data = result;
			res.send(res.generic);
		}
	});
});

//Should params be imported from yet another sourcefile ?
route.param("user", function(req, res, next, uid){
	var User = require('./models/user');
	User.findOne({name: uid}, function(err, userResult){
		if (err) next(new tError(500, tError.list.dbError, err));//No user found or something
		if (!err && !userResult) next(new tError(404, tError, null));
		req.locals.userParam = userResult;
		next();
	});
});

route.param("recipename", function(req, res, next, recipename){
	req.rcn = recipename;
	RecipeSchema.find({name: new RegExp(recipename)},
		function(err, recipeResults){
			if (err) next(new tError(500, tError.dbError, err));//db error or some shit
			req.searchYield = {error: err, Yield: recipeResults};
			next();
	});
});

route.param("id", function(req, res, next, recipeId){
	if (!ObjectId.isValid(req.params.id)) {
		next(new tError(400, "Bad parameter: recipe id", null));
	}
	next();
});

route.get("/s/:recipename", function(req, res){
	//RecipeSchema.find({name: new RegExp(req.rcn)}, function(err, results){
		res.json({err: req.searchYield.err, results: req.searchYield.Yield});
			//err2: err, res: results, rek: req.rcn
		//});
	//});
});

route.get("/:id/:requestDetailed?", function(req, res, next){
	if (req.params.requestDetailed &&
		req.params.requestDetailed != "detailed"){
		next();
	}
	var query = RecipeSchema.findOne({_id: req.params.id});
	if (req.params.requestDetailed == undefined){
		query.select({name: 1, user: 1, desc: 1, image: 1});
	}
	query.exec(function(err, recipeResult){
			if (err){
				next(new tError(500, "Database error, please try again later.", err));
			}else if (!recipeResult){
				next(new tError(404, "recipe not found.", null));
			}else {
				res.generic.data = recipeResult;
				return res.send(res.generic);
			}
		});
});

//!!
//!!
//Testing routes plz remove them!!!
route.param("itmn", function(req, res, itmname){
	req.itemName = itmname;
});
route.get("/test/create/:itmn", function(req, res){
	var testRecipes = new RecipeSchema ({
			name: req.itemName,
			//user: 1,
			//ingredients: [1],
			//comments: [1],
			directions: [{text:"This is an example recipe"},{text: "just fucking spread it on bread retard."}],
			favorites: {
				number: 9001//,
				//schema: 1
			}
		});
	testRecipes.save(function(err, whatever){
		res.json({err: err, otherdata: whatever});
	});
});
route.put("/test/cripple", jwt.jwtAuthProtected, function(req, res){
	res.json({user: req.user});
});
module.exports = route;