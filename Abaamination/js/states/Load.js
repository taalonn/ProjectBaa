'use strict';
var Load = function(game) {};
Load.prototype =
{
	preload: function() 
	{
		// Display text
		this.add.text(650, 20, 'Loading...', {fontSize: '32px', fill: 'white'});

		// Add Load bar and set as Load sprite (auto-crops sprite)
		var loadingBar = this.add.sprite(100, 100,'loadingBar');
		loadingBar.anchor.set(0.5);
		this.load.setPreloadSprite(loadingBar);
		game.time.advancedTiming = true;

		// Load image assets
		this.load.path = 'assets/';
		this.load.images(
			[
				'tilesheet',
				'cTiles',
				'player',
				'enemy',
				'dustParticle'
			], 
			[
				'tilesheet/TileSheet_v3.png', 
				'tilesheet/BasicColorTiles_40x40px.png',
				'img/player.png',
				'img/Enemy_Placeholder.png',
				//change the color of the particle to change the effect [white, black, red, brown]
				'img/dustParticle_brown.png'
			]);
		this.load.spritesheet('player', 'img/ProtoMamaSheet.png', 366, 400, 92);
		this.load.physics('playerCollision', 'physics objects/playerCollision.json');
		this.load.tilemap('testLevel', 'tilesheet/LukesLevel1.json', null, Phaser.Tilemap.TILED_JSON);

		//loading audio assets
		this.load.path = 'assets/audio/';
		this.load.audio(
			[
				'crunch_1', 
				'crunch_2',
				'crunch_3',
				'crunch_4',
				'crunch_5',
				'crunch_6'
			],
			[
				'crunch/crunch_1.wav', 
				'crunch/crunch_2.mp3',
				'crunch/crunch_3.wav',
				'crunch/crunch_4.wav',
				'crunch/crunch_5.wav',
				'crunch/crunch_6.wav'
			]);
	},

	create: function ()
	{
		this.game.state.start('MainMenu');
	}
};
