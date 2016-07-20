// Count all documents in the datastore
db.count({}, function (err, count) {
  // Number of documents in db
});

// Find all documents in the collection
games_db.find({}, function (err, docs) {

});

// Read json from local file
var jsonfile = require('jsonfile');
var file = 'https://conbase.ropecon.fi/programs/export.json';
jsonfile.readFile(file, function(err, obj) {

    for(var i = 0 ; i < obj.length ; i++){
        for(var j = 0 ; j < obj[i].tags.length ; j++){
            if(obj[i].tags[j] === "Pöytäpelit"){
                games.push(obj[i]);
            }
        }
    }

    var games_db = new Datastore({
        filename: "./data/games.json",
        timestampData: true,
        autoload: true
    });

    for(var i = 0; i < games.length ; i++){

        games_db.insert(games[i], function (err, newDoc) {
            // Callback is optional
            // newDoc is the newly inserted document, including its _id
            // newDoc has no key called notToBeSaved since its value was undefined
        });
    }

    console.log(games)
    //console.log(games.length);

})
