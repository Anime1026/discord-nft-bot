/* 

Ping-Pong Discord Javascript Bot
Mart - October 1, 2020

*/

const Discord = require("discord.js");

const client = new Discord.Client();

client.once("ready", function () {
  console.log("Ready for some good old ping pong!");
});

client.on('message', msg => {
  console.log(msg.content)
  if (msg.content === 'ping') {
    msg.reply('Pong!');
  }
});


client.login('MTA3Njc5OTAzMjU0ODEzMDgxNg.GA0twK.BVTpkP6XgWCidoQJqND6vT6mVNFIuzS-uJ_TYU');