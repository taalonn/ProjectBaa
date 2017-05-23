//Player stats
var stamina = 100;
var health = 100;
var STA_MAX = 100;
var STA_THRESHOLD = 10;
var STA_STEP = .2;
var HP_MAX = 100;

//Input Variable
var buttons;					//object to hold KeyCode properties

//Material Variables
var material;					//collision material
var contactMaterial;			//contact Material

//Orientation flags
var playerFaceLeft = false;

//Emitter variables
var emitter;
var jumpVar = false;		//checking if a jump has started

//Physics Variable
var GRAVITYMAX = 30;			//maximum magnitude of gravity
var gravity = 30;				//current magnitude of gravity
var stopTime;					//timer used to create gravity acceleration
var moveSpeed = 20;				//magnitude of lateral speed
var airFriction = 1;			//slow movement while in the air
var AFM = 0.6;					//slow movement speed by 40% while not on the ground
var bodyFriction = 0.5;			//friction between tiles and this body

//Physics Flags
var jumpAni;					//jump animation object
var landAni;					//land animation object
var isJumping;					//is player jumping?
var jumpDelay = 0;				//when should the player stop jumping
var startTime= 0;				//how long has the player been jumping
var jumpTime = 1;				//the length of time in seconds of one jump
var jumpSpeed = 30;				//velocity of the upward motion
var jumpThreshold = .1;			//if time left until end of jump < jumpThreshhold, cancel jump
var jumpAniTimer;				//Timer object for jump animation delay

//Attack variable
var isRamming = false;			//is the player attacking?
var ramSPD = 0;					//current velocity increase
var ramACC = 5;					//acceleration
var RAM_MAX_SPEED;				//max attack speed
var RAM_SPD_RATIO = 1.75;		//max attack speed = movespeed * ratio

/**
*Player prefab constructor
*
*@game: reference to game prototype
*@key: reference to spritesheet
*@frame: initial frame
*@buttonObj: reference to button keyCodes object [up, down, left ,right, jump, ram, defend]
*@cg: collisionGroup: reference to the collision bitmask
*/
function Player(game, x, y, key, frame, buttonObj, cg, mg){

	//call to Phaser.Sprite //new Sprite(game, x, y, key, frame)
	Phaser.Sprite.call(this, game, x, y, key, frame);

	//Scale the player sprite and resize the polygon collision data
	//this.scale.x = 1;
	//this.scale.y = 1;
	//resizePolygon('playerCollision', 'playerCollisionADJ', 'player', 1);	

	//Physics
	game.physics.p2.enable(this);										//enable physics for player

	this.enableBody = true;												//enable body for physics calculations
	this.body.enableGravity = false;									//disable world gravity: gravity will be handled locally
	this.body.fixedRotation = true;										//restrict rotation

	this.body.clearShapes();											//clear all collision shapes
	this.body.loadPolygon('playerCollision', 'player');					//set polygon data as collision
	this.body.setCollisionGroup(cg.pCG);								//set the collision group (playerCollisionGroup)
	this.body.collides([cg.tCG, cg.eCG, cg.rCG])						//player collides with these groups
	this.body.collideWorldBounds = true;								//player collides with edges of the screen
	material = game.physics.p2.createMaterial('material', this.body);	//create new material

	//create contact properties between player and tiles
	contactMaterial = game.physics.p2.createContactMaterial(material, mg.tileMaterial);
	contactMaterial.friction = bodyFriction;
	contactMaterial.restitution = 0;
	contactMaterial.surfaceVelocity = 0;

	//create left and jump animations right coming soon!
	this.animations.add('left', Phaser.ArrayUtils.numberArray(0,51), 30, false, true);
	//player.animations.add('right', [], 30, false, true);
	jumpAni = this.animations.add('jump', Phaser.ArrayUtils.numberArray(52, 72), 20, false, true);
	landAni = this.animations.add('land', Phaser.ArrayUtils.numberArray(72, 91), 20, false, true);
	jumpAni.onComplete.add(startDescent, this);
	jumpAniTimer = game.time.create(false);

	isJumping = false;													//player is not jumping

	//Input mapping
	buttons = game.input.keyboard.addKeys(buttonObj);					//Sets all the input keys for this prototype

	buttons.ram.onDown.add(startRam, this);								//captures the first frame of the ramKey press event
	buttons.ram.onUp.add(stopRam, this);								//End the ramming action
	RAM_MAX_SPEED = moveSpeed * RAM_SPD_RATIO;							//set the max speed of the ram attack

	buttons.jump.onDown.add(jump, this);								//captures the first frame of the jumpKey press event
	buttons.jump.onUp.add(jumpRelease, this);							//end the jumping action
	
	//set button callbacks to create movement acceleration curve
	buttons.right.onDown.add(startRun, this);
	buttons.left.onDown.add(startRun, this);

	game.camera.follow(this, Phaser.Camera.FOLLOW_PLATFORMER);			//attach the camera to the player
	game.camera.roundPX = false;
	game.add.existing(this);											//add this Sprite prefab to the game cache

	// //creating emitter where the player is currently standing
	// emitter = game.add.emitter(this.x, this.y, 200);
	// emitter.makeParticles(['dustParticle']);

}

/**							**Define Prefab**
*/
Player.prototype = Object.create(Phaser.Sprite.prototype);	//create prototype of type Player
Player.prototype.constructor = Player;						//set constructor function name

/**
*							**Update Function**
*/
Player.prototype.update = function(){
	//console.info( " PST: ", game.time.elapsedMS);	//time delta between each update

	var currentTime = this.game.time.totalElapsedSeconds();	//game time that has passed (paused during pause state)
	
	updateAirFriction( this.body );							//does air friction need to be applied?
	
	if(isRamming){											//is the player ramming?
		ram( this.body );									//perform ram step
		return;												//drop out of update so no more action will be taken.(prevents movement from input, jump and gravity)
	}
	
	if( stamina < STA_MAX ) 								//is stamina less than full?
		stamina += STA_STEP * game.time.elapsed;			//increase stamina by one step

	if( stamina > STA_MAX ) stamina = STA_MAX;				//cap stamina

	applyVerticalVelocity( this.body, currentTime);			//apply velocity to the players vertical axis

	updateInput( this.body );								//update user input and move player

	//console.info(touchingDown(this.body));
	//console.info(isJumping);
}

/**								
*								**Movement**	
*/

/**								**Input**
*/
//Check for input each update cycle
updateInput = function( body ){

	if(buttons.left.isDown){
		playerFaceLeft = true;			//player is facing left
		//move this body to the left relative to a constant physics timestep
		body.moveLeft(((moveSpeed / body.mass) * airFriction) * game.time.elapsed);			
		//is the player is not jumping and the is on the ground: player walking animation
		if(!isJumping && touchingDown( body )) player.play('left');	
	}
	if(buttons.right.isDown){
		playerFaceLeft = false;			//player is facing right
		//move this body to the right relative to a constant physics timestep
		body.moveRight(((moveSpeed / body.mass) * airFriction) * game.time.elapsed);	
		//is the player is not jumping and the is on the ground: player walking animation
		if(!isJumping && touchingDown( body )) player.play('left');
	}
	//added up arrow key for testing (also to get out of holes...)
	if(buttons.up.isDown){
		body.moveUp(((moveSpeed / body.mass) * airFriction) * game.time.elapsed);
		jumpAni.play(true);
	}
	//Defend
	if(buttons.defend.isDown){
		defend();
	}
}
startRun = function(){

}
stopRun = function(){

}
/**							**In Air Physics**
*/
//Determine if gravity or jump force is applied to this body
applyVerticalVelocity = function( body, time ){

	if( !isJumping ) {													//the player is not jumping
//Gravity
		if( gravity >= GRAVITYMAX){										//is the player falling faster than terminal?
			if(gravity != GRAVITYMAX) gravity = GRAVITYMAX;				//clamp gravity	
		} else {
			gravity = GRAVITYMAX * ((time - stopTime));					//increase magnitude of gravity
		} 
		body.velocity.y = (gravity * body.mass) * game.time.elapsed;	//apply gravity
//Jumping
	} else {															//player is jumping
		var timeLeft = jumpDelay - time;								//time left until the jump cancels
		if( timeLeft < jumpThreshold ) {								//is the time left withing the threshold?
			stopJump();													//cancel jump
			body.velocity.y = gravity * body.mass * game.time.elapsed;	//restart gravity after jump ends	
		} else {
			//apply upward motion with a curve.  
			//It starts fast and slows at the top of the jump.  
			//Increased mass will decrease the power of the jump
			body.velocity.y = ((-1 * jumpSpeed * timeLeft) / body.mass) * game.time.elapsed;	
		}

	}
}
//If player is not on the ground, apply "air friction" to slow lateral movement
updateAirFriction = function( body ){
	if( !touchingDown( body )) {						//is player in the air?
		if( airFriction != AFM ){ 						//has airFriction been activated?
			isInAir = true;								//player is no longer on the ground
			airFriction = AFM;							//activate air friction
			contactMaterial.friction = 0.0;				//set friction with tiles to zero so player wont stick to walls
		} 
	} else {											//is player on the ground?
		if( airFriction != 1){							//has airFriction been decativated?
			fireLandingDustEmmiter( body );				//start the dust emmiter when player touches ground
			airFriction = 1;							//deactivate airFriction
			contactMaterial.friction = bodyFriction;	//restore tile friction so player wont slide on tiles	
		}
	}
}

/**
*									**Special Effects**
*/
fireLandingDustEmmiter = function( body ){
	//creating emitter where the player is currently standing (offsetting to spawn right at the player's feet)
	emitter = game.add.emitter(body.x, (body.y + 188), 200);
	emitter.makeParticles(['dustParticle']);

	//(explode, lifespan, frequency, quantity, forceQuantity)
	emitter.start(true, 200, 20, 20, 20);
	jumpVar = false;
}


/**
*									**Mechanic functions**
*/

/**				Jumping Methods			
*/
//Start Jump if the player is not on the ground and is not currently jumping
//jump.onDown callback
jump = function(){
	//console.info("Jump started\n");
	if(!touchingDown(this.body)) return; 				//if player is not on the ground, do nothing
	if(isJumping) return;								//if player is in the middle of a jump, do nothing

	//console.info( jumpAniTimer.running );
	//Jump animation timer allows the animation to continue running if the user 
	//releases button early.  It just makes for a smoother looking jump animation.
	//To see it work, just tap the jump button at different intervals. 
	if( jumpAniTimer.running){							//is the jump Animation timer playing?
		jumpAniTimer.stop(false);						//Stop jump Animation timer
	}

	jumpAni.play(false);								//Start jup animation	
	isJumping = true;									//start jump
	startTime = this.game.time.totalElapsedSeconds();	//current time in seconds
	jumpDelay = startTime + jumpTime;					//jump stops after "jumpTime" seconds

	//console.info("jumping");
}
//Stops the current jump
stopJump = function(){

	if( !isJumping ) return;							//if the player is not currently jumping, do nothing
	stopTime = this.game.time.totalElapsedSeconds();	//get the time when the jump was stopped
	isJumping = false;									//player is not jumping
	gravity = GRAVITYMAX * (1/3);						//reset gravity
}

//if the ascent animation has finished, start descent animation
startDescent = function(){
	landAni.play('land');
}

//stop all jump animations
stopAnimation = function(){
	jumpAni.stop(false);
	landAni.stop(true);
	 
}

//jump onUp callback: if the user releases the button early, stop the animation early
jumpRelease = function(){
	if(!isJumping) return;	//if player is not jumping, do nothing

	//console.info("time of button press: ", this.game.time.totalElapsedSeconds() - startTime);

	//timed event to stop jump animation
	jumpAniTimer.add(Phaser.Timer.SECOND * .6, stopAnimation, this );
	jumpAniTimer.start();	//start animation delay timer
	
	stopJump();				//stop jump physics
	
}

/**				Ramming Methods
*/
//Attack button: onDown callback
startRam = function(){
	if(stamina < STA_THRESHOLD) return;		//if the player's stamina is too low, do nothing
	if(isJumping) stopJump();				//if the player is jumping, stop jump
	isRamming = true;						//start the attack
	ramSPD = 0;

}
//Attack button: onUp callback
stopRam = function(){
	if(!isRamming) return;					//if the player is not ramming, then do nothing
	isRamming = false;						//stop the attack
}
//Attack button: onHold callback
ram = function( body ){
	if( stamina <= 0 ) stopRam(); 								//if the player has run out of stamina, stop the attack
	stamina -= STA_STEP * game.time.elapsed;					//reduce stamina by one step
	if (ramSPD + moveSpeed < RAM_MAX_SPEED)	ramSPD += ramACC;	//increase ram speed
	if (body.velocity.y != 0 ) body.velocity.y = 0;				//turn off gravity
	var moveStep = ((moveSpeed / body.mass) * airFriction);		//move step before boost
	var boostStep = moveStep + ramSPD;							//move step after boost
	var aniFPS = boostStep / moveStep;							//ratio to control animations FPS(as the player moves faster, the animation plays faster)
	
	if( playerFaceLeft ){
		body.moveLeft( boostStep * game.time.elapsed );			//move player left at a faster speed
	} else {
		body.moveRight( boostStep * game.time.elapsed );		//move player right at a faster speed
	}
}


/**				Defending Methods
*/
defend = function(){
	console.info("Defending");
}

/**
*		Utility Methods
*			@resizePolygon: Change the scale of a Json Polygon by a constant
*			@touchingDown: Determine if there is a downward collsion made by this.body, determine if this sprite is on ground
*/
//Resize a polygon Json file.  The polygon needs to be resized before it is applied to the body and 
//the string associated with newPhysicsKey must be used. 
function resizePolygon(originalPhysicsKey, newPhysicsKey, shapeKey, scale){

	var newData = [];										//array to hold new polygon

	var data = this.game.cache.getPhysicsData(originalPhysicsKey, shapeKey); //grab physics file

	
	for (var i = 0; i < data.length; i++) {					//iterate through all shapes in polygon
		var vertices = [];									//new array to hold vertex data
		for (var j = 0; j < data[i].shape.length; j += 2) {	//iterate through all vertices
			vertices[j] = data[i].shape[j] * scale;			//scale
			vertices[j+1] = data[i].shape[j+1] * scale; 	//scale
		}
		newData.push({shape : vertices}); 					//set new shape
	}
	var item = {};											//new object to hold json data
	item[shapeKey] = newData;								//set adjusted polygon
	game.load.physics(newPhysicsKey, '', item);				//create new key in cashe

	//debugPolygon(newPhysicsKey, shapeKey);
}
//Check to see if a "downward" collision is happening
function touchingDown(player) {    
	var yAxis = p2.vec2.fromValues(0, 1);    
	var result = false;    
	for (var i = 0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {        
		var c = game.physics.p2.world.narrowphase.contactEquations[i];        
		if (c.bodyA === player.data || c.bodyB === player.data)        
		{            
			var d = p2.vec2.dot(c.normalA, yAxis); // Normal dot Y-axis            
			if (c.bodyA === player.data) d *= -1;            
			if (d > 0.5) result = true;        
		}    
	}

	return result;
}
//This function is called by any collision objects that are children of this body
madeContact( bodyA, bodyB, type){
	if( type =- 'ramCollision') ramCollision( ramCollision, bodyB );
	if( type == 'wombCollision') wombCollision( wombCollision, bodyB );

}
