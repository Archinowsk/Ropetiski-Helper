"use strict";

const Datastore = require("nedb");

function randomize(){

    var max_players = $("#max_players").val();
    var current_players = $("#current_players").val();

    if(current_players > max_players){
        var extras_count = current_players - max_players;
        var extras = [];

        for(var i = 0; i < extras_count; i++)
        {
            var extra = randomIntFromInterval(1, current_players);

            // Number in array - skip round
            if(extras.includes(extra) === true){
                i--;
            }
            // Number not in array - store value
            else {
                extras.push(extra);
            }
        }
        $("#extras").text(extras);
    }
};

function randomIntFromInterval(min, max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function checkDb(){
    // Check if ticket no in db
    var message = "";
    var ticket_number = $("#ticket_number").val();

    var ticket_db = new Datastore({
        filename: "./data/priority_tickets.json",
        timestampData: true,
        autoload: true
    })

    ticket_db.find({ticket_number : ticket_number}, function (err,docs){
        // If ticket number is already in db, show error
        if(typeof docs != "undefined" && docs != null && docs.length > 0){
            message = "Error: ticket number " + ticket_number + " already in database. Created " + docs[0].createdAt;
        }
        // Else add ticket number to db
        else {
            ticket_db.insert({ticket_number : ticket_number});
            message = "Ticket number saved.";
        }
        $("#ticket_status").text(message);
    });

}

function loadExportToDb(){
    var games = [];
    var jsonfile = require('jsonfile');
    var file = './data/export.json';
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
}

function loadGameInfo(){

    var games = [];
    var gameMasterName = $("#game_master_name").val();
    var gameName = $("#game_name").val();
    var gameRoom = $("#game_room").val();
    var gameDate = $("#game_date").val();
    var gameStartTime = $("#game_start_time").val();
    var queryString = "{";
    var obj = {};

    var games_db = new Datastore({
        filename: "./data/games.json",
        timestampData: true,
        autoload: true
    });

    /*
    // Count all documents in the datastore
    db.count({}, function (err, count) {
      // Number of documents in db
    });
    */

    /*
    // Find all documents in the collection
    games_db.find({}, function (err, docs) {

    });
    */

    if(gameMasterName.length !== 0){
        queryString += '"people.name": ' + '"' + gameMasterName + '"';
    }

    if(gameName.length !== 0) {
        if(queryString !== "{"){
            queryString += ", ";
        }
        queryString += '"title": ' + '"' + gameName + '"';
    }

    if(gameRoom.length !== 0) {
        // Don't add anything, if searching for all rooms
        if(gameRoom !== "All"){
            if(queryString !== "{"){
                queryString += ", ";
            }
            queryString += '"loc.0": ' + '"' + gameRoom + '"';
        }
    }

    if(gameDate.length !== 0) {
        // Don't add anything, if searching for all dates
        if(gameDate !== "All"){
            if(queryString !== "{"){
                queryString += ", ";
            }
            queryString += '"date": ' + '"' + gameDate + '"';
        }
    }

    if(gameStartTime.length !== 0) {
        // Don't add anything, if searching for all times
        if(gameStartTime !== "All"){
            if(queryString !== "{"){
                queryString += ", ";
            }
            queryString += '"time": ' + '"' + gameStartTime + '"';
        }
    }

    queryString += "}";

    if(queryString.length > 0)
    {
        obj = JSON.parse(queryString);
    }

    games_db.find(obj , function (err,docs){
        for(var i = 0; i < docs.length ; i++){
            games.push(docs[i].title);
        }

        $("#game_info").text(games);
    });

}
