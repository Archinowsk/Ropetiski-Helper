"use strict";

const Datastore = require("nedb");
const alasql = require("alasql");

var sorted_games = [];
var advertisement_index = 0;

$(document).ready(function() {
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href") // activated tab
        if(target === "#log_book"){
            loadMessages()
        }
        //alert(target);
    });
});

function randomize(){

    var priority_players = $("#priority_players").val();
    var max_players = $("#max_players").val();
    var current_players = $("#current_players").val();

    if(priority_players === ""){
        priority_players = 0;
    }

    // Too many players - randomize some out
    if(current_players > max_players){

        // Number to take out
        var extras_count = current_players - max_players;
        var extras = [];

        // Take out number is bigger than number of non-priorities
        // Remove non-priorities and randomize out some priorities
        if(priority_players > extras_count){

            var non_priority_count = current_players-max_players;

            if(non_priority_count > 0){
                var non_priority_players_list = [];

                // Remove non-pririties and priorities
                if(priority_players > max_players){
                    var non_priorities_to_remove = current_players-priority_players;
                }
                // Remove only non-priorities
                else if (priority_players < max_players) {
                    var non_priorities_to_remove = current_players-max_players;
                }

                // Remove all non-priority
                for(var i = 0; i < non_priorities_to_remove; i++){
                    var extra = randomIntFromInterval(1, current_players);

                    // Priority player - skip round
                    if(extra <= priority_players){
                        i--;
                    }
                    // Number in array - skip round
                    else if(non_priority_players_list.includes(extra) === true){
                        i--;
                    }
                    // Number not in array - store value
                    else {
                        non_priority_players_list.push(extra);
                    }
                }

                non_priority_players_list.sort();

                $("#extras").text(non_priority_players_list);
            }

            // Too many priority players - randomize some out
            if (priority_players > max_players) {
                //var priority_count = priority_players-max_players
                var priority_players_list = [];
                var priorities_to_remove = priority_players-max_players

                for(var i = 0; i < priorities_to_remove; i++)
                {
                    var extra = randomIntFromInterval(1, priority_players);
                    // Number in array - skip round
                    if(priority_players_list.includes(extra) === true){
                        i--;
                    }
                    // Number not in array - store value
                    else {
                        priority_players_list.push(extra);
                    }
                }

                priority_players_list.sort();

                var message = "";

                if(non_priority_players_list !== undefined){
                    message += "Non-priority: " + non_priority_players_list + "\n";
                }

                message += "Priority: " + priority_players_list;

                $("#extras").text(message);
            }

        }

        // Randomize non-priority players out
        else {
            for(var i = 0; i < extras_count; i++)
            {
                var extra = randomIntFromInterval(1, current_players);

                // Priority player - skip round
                if(extra <= priority_players){
                    i--;
                }
                // Number in array - skip round
                else if(extras.includes(extra) === true){
                    i--;
                }
                // Number not in array - store value
                else {
                    extras.push(extra);
                }
            }

            extras.sort();
            $("#extras").text(extras);
        }
    }
    else{
        $("#extras").text("All player fit to the game");
    }
};

function randomIntFromInterval(min, max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function addTicket(operation){
    var ticket_number = $("#ticket_number").val();

    if(ticket_number !== ""){
        var message = "";

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
                message = "Ticket number " + ticket_number + " saved.";
            }
            $("#ticket_status").text(message);
        });
    }
}

function removeTicket(){
    var ticket_number = $("#ticket_number").val();

    if(ticket_number !== ""){
        var message = "";

        var ticket_db = new Datastore({
            filename: "./data/priority_tickets.json",
            timestampData: true,
            autoload: true
        })

        ticket_db.find({ticket_number : ticket_number}, function (err,docs){
            // Check if ticket is in db
            if(typeof docs != "undefined" && docs != null && docs.length > 0){
                ticket_db.remove({ticket_number : ticket_number});
                message = "Ticket number " + ticket_number + " removed.";
            }
            // Else remove ticket from db
            else {
                message = "Error: ticket number " + ticket_number + " not in database.";
            }
            $("#ticket_status").text(message);
        });
    }
}

function loadExportToDb(){
    $("#setting_load").attr("disabled", disabled)
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
                    // Add these games to other program
                    if(obj[i].title !== "#7–00: The Sky Key Solution (1-11)" && obj[i].title !== "Charlie ei surffaa" && obj[i].title !== "Garnet Town Gambit: All-Star Game"){
                        games.push(obj[i]);
                    }
                    else {
                        programs.push(obj[i]);
                    }
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

                    alasql('SELECT * FROM XLSX("./data/pelinjohtajat.xlsx",{headers:true})',[],function(data){

                        for(var i = 0; i<games.length;i++){

                            for(var j = 0; j<data.length;j++){

                                var data_name = data[j].Sukunimi + " " + data[j].Etunimi;

                                if(games[i].people[0].name === data_name){
                                        var data_location = data[j].Paikka;
                                        //games[i].push("table":data_location);
                                        games[i]["table"] = data_location;
                                }
                            }
                        }

                        console.log("Games with undefined room: ")
                        for(var i = 0; i<games.length;i++){
                            if(games[i].table === undefined){
                                console.log(games[i].title)
                            }
                        }
                        var games_db = new Datastore({
                            filename: "./data/games.json",
                            timestampData: true,
                            autoload: true
                        });

                        // Delete local games db and insert updated version
                        games_db.remove({}, { multi: true }, function (err, numRemoved) {
                            games_db.insert(games, function (err, newDoc) {
                                $("#load_status").text("Data loaded succesfully");
                            });
                        });
                    });
                });
            });


        }
        else{
            $("#load_status").text("Error" + error);
        }

        // TODO: Add tables to games
        // Parse excel to JSON and add as a new attribute

        $("#setting_load").removeAttrattr("disabled")
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

    // TODO: Sort by: game name, GM name
    //games_db.find(obj).sort({title:1}).exec(function (err,docs){

    // Load games and sort by title
    games_db.find(obj).sort({"people.0.name":1}).exec(function (err,docs){
        var GmHours = 0;
        var otherHours = 0;
        var gamesList = "";
        var otherProgramList = "";

        for(var i = 0; i < docs.length ; i++){
            var names = [];
            for(var j = 0; j < docs[i].people.length; j++){
                names.push(docs[i].people[j].name);
            }

            var namesAsString = names.join(', ');

            gamesList += namesAsString + " - " + docs[i].title + "\n";
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
            var tags = [];
            var names = [];

            for(var j = 0; j < docs[i].tags.length; j++){
                tags.push(docs[i].tags[j]);
            }
            for(var j = 0; j < docs[i].people.length; j++){
                names.push(docs[i].people[j].name);
            }

            var tagsAsString = tags.join(', ');
            var namesAsString = names.join(', ');

            otherProgramList += namesAsString + " - " + docs[i].title +  " - " + docs[i].mins/60 + "h" + " (" + tagsAsString + ")" + "\n";
            otherHours += parseInt(docs[i].mins);
        }

        $("#other_program_hours").text("Total other program hours: " + otherHours/60 + "h");
        $("#other_program_count").text("Number of other programs: " + docs.length);
        $("#other_program_list").text(otherProgramList);
    });
}

function loadStartingGames(){

    var games = [];
    var gameDate = $("#schedule_date").val().trim();
    var gameStartTime = $("#schedule_start_time").val().trim();
    var queryString = "{";
    var obj = {};

    $("#unchecked_game_masters").empty();

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
    games_db.find(obj).sort({"people.0.name":1}).exec(function (err,docs){
        var gamesList = "";
        var gameCount = 0;
        var uncheckedGMs = [];

        for(var i = 0; i < docs.length ; i++){
            uncheckedGMs.push(docs[i]);
        }

        var appendElements = "";

        for(var i = 0; i < uncheckedGMs.length ; i++){

            var names = [];
            for(var j = 0; j < uncheckedGMs[i].people.length; j++){
                names.push(uncheckedGMs[i].people[j].name);
            }

            var namesAsString = names.join(', ');

            appendElements += "<p>" + "<input type='checkbox' id='" + i + "'>"
            + "</input>" + " " + namesAsString + " - "
            + uncheckedGMs[i].title + "</p>" + "\n";
        }

        $("#unchecked_game_masters").append(appendElements);

        var starting_games_db = new Datastore({
            filename: "./data/starting_games.json",
            timestampData: true,
            autoload: true
        });

        starting_games_db.remove({}, { multi: true }, function (err, numRemoved) {
            // Remove all
            removeCheckInGM({}, { multi: true });
        });

        var advertised_games_db = new Datastore({
            filename: "./data/advertised_games.json",
            timestampData: true,
            autoload: true
        });

        advertised_games_db.remove({}, { multi: true }, function (err, numRemoved) {
            advertised_games_db.insert(docs, function (err, newDoc) {
                $("#startAdvertisement").removeAttr("disabled");
            });
        });

        var checkboxes = document.querySelectorAll("input[type='checkbox']");
        for(var i = 0; i < checkboxes.length; i++){
            checkboxes[i].addEventListener("change", function(){
                // Check checked, add to starting games list
                if ($(this).prop("checked") === true) {
                    checkInGM(uncheckedGMs[this.id]);
                }
                // Checkbox unchecked, remove from starting games list
                else if ($(this).prop("checked") === false) {
                    removeCheckInGM(uncheckedGMs[this.id]);
                }
            });
        }

        $("#startIntroduction").removeAttr("disabled");

        // TODO: show spontaneous games after other games

    });
}

function checkInGM(game){

    var starting_games_db = new Datastore({
        filename: "./data/starting_games.json",
        timestampData: true,
        autoload: true
    });

    starting_games_db.insert(game, function (err, newDoc) {
        starting_games_db.find({}).sort({"people.0.name":1}).exec(function (err, docs){
            var gamesList = "";
            var startingGamesCount = 0;

            for(var i = 0; i < docs.length ; i++){

                var names = [];
                for(var j = 0; j < docs[i].people.length; j++){
                    names.push(docs[i].people[j].name);
                }

                var namesAsString = names.join(', ');

                gamesList += namesAsString + " - " + docs[i].title + "\n";
                startingGamesCount ++;
            }

            $("#schedule_game_count").text("Number of games starting: " + startingGamesCount);
            $("#checked_game_masters").text(gamesList);
        });
    });
}

function removeCheckInGM(game){

    var starting_games_db = new Datastore({
        filename: "./data/starting_games.json",
        timestampData: true,
        autoload: true
    });

    starting_games_db.remove(game, function (err, newDoc) {
        starting_games_db.find({}).sort({"people.0.name":1}).exec(function (err, docs){

            var gamesList = "";
            var startingGamesCount = 0;

            for(var i = 0; i < docs.length ; i++){

                var names = [];
                for(var j = 0; j < docs[i].people.length; j++){
                    names.push(docs[i].people[j].name);
                }

                var namesAsString = names.join(', ');
                gamesList += namesAsString + " - " + docs[i].title + "\n";
                startingGamesCount ++;
            }

            $("#schedule_game_count").text("Number of games starting: " + startingGamesCount);
            $("#checked_game_masters").text(gamesList);
        });
    });

}

function startIntroduction(){
    // Change to "Game introduction" tab
    var tab = "signup_and_randomize";
    $('#appTabs a[href="#' + tab + '"]').tab('show');

    $("#introduction_status").text("Setting up");

    var starting_games_db = new Datastore({
        filename: "./data/starting_games.json",
        timestampData: true,
        autoload: true
    });

    starting_games_db.find({}).sort({title:1}).exec(function (err, docs){

        var englishGames = [];
        var pathfinderGames = [];
        var shortGames = [];
        var longGames = [];
        var spontaneousGames = [];

        loop1:
        for(var i = 0; i < docs.length ; i++){

            // TODO: if spontaneous game

            // English language games
            for(var j = 0 ; j < docs[i].tags.length ; j++){
                if(docs[i].tags[j] === "Englanninkielinen"){
                  englishGames.push(docs[i]);
                  continue loop1;
                }
            }

            // Pathfinder Society games
            for(var j = 0 ; j < docs[i].attributes.length ; j++){
                if(docs[i].attributes[j] === "Pathfinder Society"){
                  pathfinderGames.push(docs[i]);
                  continue loop1;
                }
            }

            // 2-3 hour games
            if(docs[i].mins <= 180){
                shortGames.push(docs[i]);
                continue loop1;
            }
            // 4h+ games
            else if(docs[i].mins > 180){
                longGames.push(docs[i]);
                continue loop1;
            }
        }

        // TODO: Remove global variable
        // Combine lists to global variable
        sorted_games = englishGames.concat(pathfinderGames, shortGames, longGames);

        $("#maxIndex").text(sorted_games.length-1);

        $("#currentIndex").text("0")
        $("#introduction_status").text("");
        showIntroduction();

        /*
        var starting_games_db = new Datastore({
            filename: "./data/starting_games.json",
            timestampData: true,
            autoload: true
        });


        starting_games_db.remove({}, { multi: true }, function (err, numRemoved) {
            starting_games_db.insert(games, function (err, newDoc) {
                $("#currentIndex").text("0")
                $("#introduction_status").text("");
                showIntroduction();
            });
        });
        */
    });

    // TODO:
    // Collect statistics: number of players, priority tickets used
    // rescheduled games, games without players

}

function showIntroduction(){

    $("#game_introduction_info").empty();

    var index = parseInt($("#currentIndex").text());

    $("#currentIndex").text()

    var gameNumber = index+1;

    /*
    var starting_games_db = new Datastore({
        filename: "./data/starting_games.json",
        timestampData: true,
        autoload: true
    });
    */

    var tags = [];
    var people = [];
    var attributes = [];

    for(var i = 0 ; i < sorted_games[index].tags.length ; i++){
        tags.push(sorted_games[index].tags[i]);
    }
    for(var i = 0 ; i < sorted_games[index].people.length ; i++){
        people.push(sorted_games[index].people[i].name);
    }
    for(var i = 0 ; i < sorted_games[index].attributes.length ; i++){
        attributes.push(sorted_games[index].attributes[i]);
    }

    var tagsAsString = tags.join(', ');
    var peopleAsString = people.join(', ');
    var attributesAsString = attributes.join(', ');

    // Show game
    var appendElements =
    "<p>"
    + "<b>Game number:</b> " + gameNumber + "/" + sorted_games.length + "\n"
    + "<b>Game name:</b> " + sorted_games[index].title + "\n"
    + "<b>GM:</b> " + peopleAsString + "\n"
    //+ "<b>Location:</b> " + sorted_games[index].loc + "\n"
    + "<b>Location:</b> " + sorted_games[index].table + "\n"
    + "<b>Duration:</b> " + sorted_games[index].mins/60 + "h" + "\n"
    + "<b>Tags:</b> " + tagsAsString + "\n"
    + "<b>Number of players:</b> " + sorted_games[index].attendance + "\n"
    + "<b>Attributes:</b> " + attributesAsString + "\n"
    + "<b>Description:</b> " + sorted_games[index].desc + "\n"
    + "</p>";

    $("#game_introduction_info").append(appendElements);
}

function previousGameIntroduction(){
    var index = parseInt($("#currentIndex").text());

    if(index !== 0){
        var newIndex = index-1;
        $("#currentIndex").text(newIndex)
        showIntroduction();
    }
}

function nextGameIntroduction(){
    var index = parseInt($("#currentIndex").text());
    var maxIndex = parseInt($("#maxIndex").text());

    if(index !== maxIndex){
        var newIndex = index+1;
        $("#currentIndex").text(newIndex)
        showIntroduction();
    }
}

function startAdvertisement(){
    // Change to "Game advertisement" tab
    var tab = "advertisement_view";
    $('#appTabs a[href="#' + tab + '"]').tab('show');
    $("#advertisement_status").text("");
    $("#advertisement_title").text("Games starting at: " + $("#schedule_start_time").val());

    // TODO: Fix advertisement list view
    /*
    $("#game_advertisement_list").empty();

    var advertised_games_db = new Datastore({
        filename: "./data/advertised_games.json",
        timestampData: true,
        autoload: true
    });

    advertised_games_db.find({}).sort({title:1}).exec(function (err, docs){

        var tags = [];
        var people = [];
        var attributes = [];
        var appendElements = "";


        for(var i=0;i<docs.length;i++){

            for(var i = 0 ; i < docs[i].tags.length ; i++){
                tags.push(docs[i].tags[i]);
            }
            for(var i = 0 ; i < docs[i].people.length ; i++){
                people.push(docs[i].people[i].name);
            }
            for(var i = 0 ; i < docs[i].attributes.length ; i++){
                attributes.push(docs[i].attributes[i]);
            }

            var tagsAsString = tags.join(', ');
            var peopleAsString = people.join(', ');
            var attributesAsString = attributes.join(', ');

            appendElements +=
            "<p>"
            + "<b>Game name:</b> " + docs[i].title + "\n"
            + "<b>GM:</b> " + peopleAsString + "\n"
            + "<b>Duration:</b> " + docs[i].mins/60 + "h" + "\n"
            + "<b>Tags:</b> " + tagsAsString + "\n"
            + "<b>Number of players:</b> " + docs[i].attendance + "\n"
            + "<b>Attributes:</b> " + attributesAsString + "\n"
            + "</p>";
        }

        $("#game_advertisement_list").append(appendElements);

        advertisement_index = 0;
        showAdvertisement();

        var advertisement_timer = setInterval(showAdvertisement, 3000);
    });
    */

    advertisement_index = 0;
    showAdvertisement();

    var advertisement_timer = setInterval(showAdvertisement, 10000);
}

// TODO: Stop timer
/*
function stopTimer() {
    clearInterval(advertisement_timer);
}
*/

function showAdvertisement(){

    $("#game_advertisements").empty();

    var advertised_games_db = new Datastore({
        filename: "./data/advertised_games.json",
        timestampData: true,
        autoload: true
    });

    advertised_games_db.find({}).sort({title:1}).exec(function (err, docs){

        // Start from beginning
        if(advertisement_index > docs.length-1){
            advertisement_index = 0;
        }

        var gameNumber = advertisement_index+1;

        var tags = [];
        var people = [];
        var attributes = [];

        // Detailed info for one game
        for(var i = 0 ; i < docs[advertisement_index].tags.length ; i++){
            tags.push(docs[advertisement_index].tags[i]);
        }
        for(var i = 0 ; i < docs[advertisement_index].people.length ; i++){
            people.push(docs[advertisement_index].people[i].name);
        }
        for(var i = 0 ; i < docs[advertisement_index].attributes.length ; i++){
            attributes.push(docs[advertisement_index].attributes[i]);
        }

        var tagsAsString = tags.join(', ');
        var peopleAsString = people.join(', ');
        var attributesAsString = attributes.join(', ');

        var shortDescription = docs[advertisement_index].desc.substr(1,200) + "...";

        // Show game
        var appendElements =
        "<p>"
        + "<b>Game number:</b> " + gameNumber + "/" + docs.length + "\n"
        + "<b>Game name:</b> " + docs[advertisement_index].title + "\n"
        + "<b>GM:</b> " + peopleAsString + "\n"
        //+ "<b>Location:</b> " + sorted_games[advertisement_index].loc + "\n"
        + "<b>Location:</b> " + docs[advertisement_index].table + "\n"
        + "<b>Duration:</b> " + docs[advertisement_index].mins/60 + "h" + "\n"
        + "<b>Tags:</b> " + tagsAsString + "\n"
        + "<b>Number of players:</b> " + docs[advertisement_index].attendance + "\n"
        + "<b>Attributes:</b> " + attributesAsString + "\n"
        + "<b>Description:</b> " + shortDescription + "\n"
        + "</p>"
        ;

        $("#game_advertisements").append(appendElements);

        advertisement_index++
    });
}

function loadMessages(){

    $("#message_log").empty();

    var message_db = new Datastore({
        filename: "./data/messages.json",
        timestampData: true,
        autoload: true
    });

    var appendElements = "";

    message_db.find({}, function (err,docs){
        for(var i=0;i<docs.length;i++){
            appendElements +=
            "<p>"
            + "<b>Message sender:</b> " + docs[i].name + "\n"
            + "<b>Time:</b> " + docs[i].createdAt + "\n"
            + "<b>Message:</b> " + docs[i].message + "\n"
            + "</p>"
            + "<button onclick=\"removeMessage(" + "'" + docs[i]._id + "'" + ");\" class='btn btn-default'>Delete</button>" + "\n\n"
            ;
        }
        $("#message_log").append(appendElements);
        $("#message_number").text("Number of messages: " + docs.length);
    });
}

function addMessage(){
    var name = $("#message_sender_name").val();
    var message = $("#message").val();

    var message_db = new Datastore({
        filename: "./data/messages.json",
        timestampData: true,
        autoload: true
    });

    message_db.insert({name : name, message : message}, function (err, newDoc) {
        loadMessages();
    });
}

function removeMessage(id){

    var message_db = new Datastore({
        filename: "./data/messages.json",
        timestampData: true,
        autoload: true
    });

    message_db.remove({_id:id}, function (err, numRemoved) {
        loadMessages();
    });
}
