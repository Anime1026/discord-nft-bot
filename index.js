require('dotenv').config();
const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", function () {
    console.log("Ready for some good old ping pong!");
});


client.login(process.env.CLIENT_TOKEN);