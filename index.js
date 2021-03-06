// Dag Reaguurder! Dit alles was niet mogelijk geweest zonder @Dyon, @Ruben en @Polatic
// Niet te kritisch op de code a.u.b., haast, drank, brak, je kent het wel..
// Let even goed op entries.json, deze is niet langer up to date, die op de server wel, de eerste paar keer zal de app op zijn bek gaan, run hem een paar keer en entries.json loopt synchroon
// Run "npm install https://github.com/woor/discord.io/tarball/gateway_v6" nog even met de hand, op de server had ik problemen met installatie hiervan.. Is wel nodig
// Eeeeeeeen, create service account op: https://support.google.com/a/answer/7378726?hl=en
// Eeeeeeeen, vraag even iemand in het technisch-geneuzel kanaal om token.js
// creds/google-creds.json => service account info
// creds/token.js => token van de bot (die je moet dus even vragen)

// Node v10.14.2 - Kan denk ik belangrijk zijn, check dit even met "node -v", update indien noodzakelijk, bij voorkeur exact deze versie als je tegen problemen aanloopt..

// Voeg bot toe aan je eigen testkanaal: https://discordapp.com/oauth2/authorize?&client_id=528873409497661441&scope=bot&permissions=8

// TODO: Automatically get channelID ( // to: [Object.keys(bot.channels)], ?)
// const channelID = "528606323089211404"; // Exquickie test
// const channelID = "528521165057032202"; // Dumpert top zoveel // Hier liever niet mee kutten, tenzij je echt weet wat je doet, dit is het echt kanaal...



// IMPORTANT!!!!!!!!!!!! Vul hier je testkanaal ID in...
// const channelID = '361198857289334786';

require("dotenv").config();
const channelID = process.env.CHANNEL_ID;

const googleCredentials = require('./creds/google-creds.json');
const token = require('./creds/token.json').token;

const Discord = require('discord.io');
const logger = require('winston');
const async = require('async');
const GoogleSpreadsheet = require('google-spreadsheet');
const fs = require('fs');

// Real Dumpert TopZoveel ID
const spreadsheetId = process.env.SPREADSHEET_ID;

// Test Dumpert TopZoveel ID
// const spreadsheetId = '1LdwTUOxlHaeNrK4FJFsMu5tjpqvBy0i6196vHLPiink';

const trackerFile = './entries.json';
const notifyFile = './notify.json';

// Create the files required for use if they don't exist
if (!fs.existsSync(notifyFile)) {
  fs.writeFileSync(notifyFile, "[]");
}

const doc = new GoogleSpreadsheet(spreadsheetId);
const postedObject = readPostedObjectFromFile();

let checking = false;
const intervalCheck = 5 * 1000;

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

logger.info('Dumpert TopZoveel - Link uploader initialized...');

// Initialize Discord Bot
const bot = new Discord.Client({
  token: token,
  autorun: true
});
bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info(bot.username + ' - (' + bot.id + ')');
  initCheckForNewEntries();
});

function initCheckForNewEntries() {
  setInterval(function () {
    checkForNewEntries();
  }, intervalCheck);
}

function checkForNewEntries() {
  if (checking === false) {
    async.series([
      function setAuth(step) {
        doc.useServiceAccountAuth(googleCredentials, step);
      },
      function checkEntries(step) {
        logger.info('Checking entries...');
        checking = true;
        doc.getInfo(function (err, content) {
          sheet = content.worksheets[0];
          sheet.getRows({
            offset: 1,
            // limit: 1,
          }, function(err, rows) {
            let newEntry = false;
            logger.info('Checking rows...');
            rows.forEach(row => {
              const topZoveelPositie = row.nummer;
              // console.log(row);
              fillPostedObject(row);
              if (postedObject[topZoveelPositie].postedInDiscord === false && row['dumpert-link'] && row.titel) {
                logger.info('New entry!');
                newEntry = true;
                sendDiscordMessage(`${topZoveelPositie}: ${row.titel} - ${row['dumpert-link']}`, topZoveelPositie);
              }
            });
            if (newEntry === false) {
              logger.info('All entries posted...');
            }
          });
        });
        checking = false;
      }
    ], function(error) {
      if (error) {
        logger.error('Error: ' + error);
      }
    });
  }
}

function readPostedObjectFromFile() {
  let rawdata = fs.readFileSync(trackerFile);  
  let data = JSON.parse(rawdata);  
  return data;
}

function writeIdToFile(id) {
  logger.info('Writing bot post to file!');
  postedObject[id].postedInDiscord = true;
  const newData = JSON.stringify(postedObject);  
  fs.writeFile(trackerFile, newData, function (err) {
    if (err) {
      return logger.error(err);
    }
  });
}

function sendDiscordMessage(message, topZoveelPositie) {
  logger.info('New topZoveel posted! ' + message);
  
  notifyUsers(message);
  
  bot.sendMessage({
    to: channelID,
    message: message
  }, function(error, response) {
    if (error) {
      logger.error('Error in sendDiscordMessage: ' + error);
      setTimeout(function() {
        sendDiscordMessage(message);
      }, 5000);
    } else {
      writeIdToFile(topZoveelPositie);
    }
  });
}

/// vvvvv DUMMY FUNCTIONS vvvvvv ///

const startScriptFromId = 653;
function newCreatePostedTrackerFromId(id) {
  let jsonData = {};
  for (let i = 1337; i > 0; i--) {
    if (i > id) {
      jsonData[i] = {
        postedInDiscord: true
      };
    } else {
      jsonData[i] = {
        postedInDiscord: false
      };
    }
  }
  writeDataToFile(jsonData);
}

function fillPostedObject(row) {
  postedObject[row.nummer].position = row.nummer;
  postedObject[row.nummer].title = row.titel;
  postedObject[row.nummer].url = row['dumpert-link'];
  postedObject[row.nummer].uploaded = row.uploaddatum;
  postedObject[row.nummer].uploaded = row.uploaddatum;
  postedObject[row.nummer].views = row.views;
  postedObject[row.nummer].kudos = row.kudos;
  postedObject[row.nummer].nfsw = row.nfsw;
  postedObject[row.nummer].length = row.lengte;
  postedObject[row.nummer].thumbnail = row.thumbnail;
}

// newCreatePostedTrackerFromId(startScriptFromId);

function writeDataToFile(data) {
  logger.info('writeDataToFile()');
  const newData = JSON.stringify(data);  
  fs.writeFile(trackerFile, newData, function (err) {
    if (err) {
      return logger.error(err);
    }
  });
}

bot.on('message', function (user, userID, channelID, message, evt) {
  if (message.substring(0, 1) == '!') {
    var args = message.substring(1).split(' ');
    var cmd = args[0];
    
    args = args.splice(1);
    switch (cmd) {
      case 'notify':
      switch(args[0]) {
        case 'on':
        addUserToNotify(userID)
        bot.sendMessage({
          to: userID,
          message: 'Je zult een notificatie ontvangen bij ieder nieuw filmpje!'
        });
        break;
        case 'off':
        removeUserFromNotify(userID);
        bot.sendMessage({
          to: userID,
          message: 'Je zult geen notificatie meer krijgen bij ieder nieuw filmpje!'
        });
        break;
        default:
        bot.sendMessage({
          to: userID,
          message: 'Wil je een notificatie ontvangen bij ieder nieuw filmpje? **!notify on**' + '\n' +
          'Wil je niet langer een notificatie ontvangen bij ieder nieuw filmpje? **!notify off**'
        });
        break;
      }
      break;
      // Just add any case commands if you want to..
    }
  }
});

function addUserToNotify(userID) {
  logger.info("Notifing users");
  
  fs.readFile(notifyFile, (err, data) => {  // READ
    if (err) {
      return logger.info(err);
    };
    var data = JSON.parse(data.toString());
    data.push(userID);
    
    var writeData = fs.writeFile(notifyFile, JSON.stringify(data), (err, result) => {  // WRITE
      if (err) {
        return logger.info(err);
      } else {
        return true;
      }
    });
  });
}

function removeUserFromNotify(userID) {
  fs.readFile(notifyFile, (err, data) => {  // READ
    if (err) {
      return logger.info(err);
    };
    var data = JSON.parse(data.toString());
    
    var filtered = data.filter(function(item) {
      return item !== userID;
    });
    
    data = filtered;
    
    var writeData = fs.writeFile(notifyFile, JSON.stringify(data), (err, result) => {  // WRITE
      if (err) {
        return logger.info(err);
      } else {
        return true;
      }
    });
  });
}

function notifyUsers(message) {
  fs.readFile(notifyFile, (err, data) => {  // READ
    if (err) {
      return logger.info(err);
    };
    var data = JSON.parse(data.toString());
    
    for (userID in data) {
      bot.sendMessage({
        to: data[userID],
        message: message
      });
    }
  });
}