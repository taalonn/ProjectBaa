//,.-'`*`'-..,Abaamination 
//Globals
var player;
var cursors;
var game;
var rng;
var debug = true;


// Main game
window.onload = function()
{
  game = new Phaser.Game(1280, 720, Phaser.AUTO, "game");
  rng = new Phaser.RandomDataGenerator();
  
  // Game states
  game.state.add('Boot', Boot);
  game.state.add('MainMenu', MainMenu);
  game.state.add('Play', Play);
  game.state.start('Boot');
}

