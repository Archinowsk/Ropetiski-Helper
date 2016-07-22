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
    var programs = [];
    var games = [];
    var request = require("request");
    var url = "https://conbase.ropecon.fi/programs/export.json";

    $("#load_status").text("Loading...");

    request({
        url: url,
        json: true
    }, function (error, response, obj) {

        if (!error && response.statusCode === 200) {
            var roleplaying = false;
            var experiencePoint = false;

            // Store games and other programs to different arrays
            for(var i = 0; i < obj.length ; i++){
                roleplaying = false;
                experiencePoint = false;

                for(var j = 0 ; j < obj[i].tags.length ; j++){
                    if(obj[i].tags[j] === "Pöytäpelit"){
                      roleplaying = true;
                    }
                    else if(obj[i].tags[j] === "Kokemuspiste"){
                      experiencePoint = true;
                    }
                }

                if(roleplaying === true && experiencePoint === false){
                    games.push(obj[i]);
                }
                else {
                    programs.push(obj[i]);
                }
            }

            var programs_db = new Datastore({
                filename: "./data/program.json",
                timestampData: true,
                autoload: true
            });

            // Delete local program db and insert updated version
            programs_db.remove({}, { multi: true }, function (err, numRemoved) {
                programs_db.insert(programs, function (err, newDoc) {
                });
            });

            var games_db = new Datastore({
                filename: "./data/games.json",
                //timestampData: true,
                autoload: true
            });


            // Delete local games db and insert updated version
            games_db.remove({}, { multi: true }, function (err, numRemoved) {
                games_db.insert(games, function (err, newDoc) {
                });
            });

            $("#load_status").text("Data loaded succesfully");

            console.log(programs)
            console.log(programs.length);

            console.log(games);
            console.log(games.length);
        }
        else{
            $("#load_status").text("Error" + error);
        }
    });
}

function loadGameInfo(){

    var games = [];
    var otherProgram = [];
    var gameMasterName = $("#game_master_name").val().trim();
    var gameName = $("#game_name").val().trim();
    var gameRoom = $("#game_room").val().trim();
    var gameDate = $("#game_date").val().trim();
    var gameStartTime = $("#game_start_time").val().trim();
    var queryString = "{";
    var obj = {};

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

    // End JSON string
    queryString += "}";

    if(queryString.length > 0)
    {
        obj = JSON.parse(queryString);
    }

    var games_db = new Datastore({
        filename: "./data/games.json",
        timestampData: true,
        autoload: true
    });

    // Load games and sort by title
    games_db.find(obj).sort({title:1}).exec(function (err,docs){
        var GmHours = 0;
        var otherHours = 0;
        var gamesList = "";
        var otherProgramList = "";

        for(var i = 0; i < docs.length ; i++){
            gamesList += docs[i].title + "\n";
            GmHours += parseInt(docs[i].mins);
        }

        $("#gm_hours").text("Total GM hours: " + GmHours/60 + "h");
        $("#game_count").text("Number of games: " + docs.length);
        $("#game_list").text(gamesList);
    });

    var program_db = new Datastore({
        filename: "./data/program.json",
        timestampData: true,
        autoload: true
    });

    // Load games and sort by title
    program_db.find(obj).sort({title:1}).exec(function (err,docs){
        var GmHours = 0;
        var otherHours = 0;
        var gamesList = "";
        var otherProgramList = "";

        for(var i = 0; i < docs.length ; i++){
            otherProgramList += docs[i].title + " (" + docs[i].tags + ")" + "\n";
            otherHours += parseInt(docs[i].mins);
        }

        $("#other_program_hours").text("Total other program hours: " + otherHours/60 + "h");
        $("#other_program_count").text("Number of other programs: " + docs.length);
        $("#other_program_list").text(otherProgramList);

    });
}

function loadStartingGames(){

    var games = [];
    var gameMasterName = $("#game_master_name").val().trim();
    var gameName = $("#game_name").val().trim();
    var gameRoom = $("#game_room").val().trim();
    var gameDate = $("#game_date").val().trim();
    var gameStartTime = $("#game_start_time").val().trim();
    var queryString = "{";
    var obj = {};

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

    // End JSON string
    queryString += "}";

    if(queryString.length > 0)
    {
        obj = JSON.parse(queryString);
    }

    var games_db = new Datastore({
        filename: "./data/games.json",
        timestampData: true,
        autoload: true
    });

    // Load games and sort by title
    games_db.find(obj).sort({title:1}).exec(function (err,docs){
        var GmHours = 0;
        var otherHours = 0;
        var gamesList = "";
        var otherProgramList = "";

        for(var i = 0; i < docs.length ; i++){
            gamesList += docs[i].title + "\n";
            GmHours += parseInt(docs[i].mins);
        }

        $("#gm_hours").text("Total GM hours: " + GmHours/60 + "h");
        $("#game_count").text("Number of games: " + docs.length);
        $("#game_list").text(gamesList);
    });
}
