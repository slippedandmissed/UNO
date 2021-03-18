
const socket = io();

const opponent = player === "Morgan" ? "Brianna" : "Morgan";
const defaultHeight = 700;

var colors;

var cardSize;
var biggerCardSize;
const cardPadding = 10;

var resetButton;
var unoButton;
var calloutButton;

var myDeck = [];
var facing;
var opponentCardCount;
var deckCount;
var floating = null;
var turn = null;
var mustPickUp = 0;
var alreadyPickedUp = false;
var pickingColorIndex;
var pickingColorX;
var pickingColorY;

var shuffling = false;
var pickingColor = false;

const colorPickSize = 100;

var declaring = null;
var timeDeclared;

var overruled = null;
var timeOverruled;

var sustained = null;
var timeSustained = null;

var endText = null;

socket.on("connect", function() {
	console.log("connection");
	console.log("asking for data");
	socket.emit("data", player)
});

socket.on("reset", function() {
	console.log("received reset signal");
	console.log("asking for deck");
	declaring = null;
	shuffling = false;
	pickingColor = false;
	mustPickUp = 0;
	overruled = null;
	sustained = null;
	endText = null;
	socket.emit("data", player);
});

socket.on("data", function(_myDeck, _facing, _opponentCardCount, _deckCount, _turn) {
	console.log("got data");
	myDeck = _myDeck;
	facing = _facing;
	opponentCardCount = _opponentCardCount;
	deckCount = _deckCount;
	turn = _turn;
});

socket.on("floating", function(_floating, requiredPickup) {
	console.log("received floating card");
	let opponentDeckWidth = (opponentCardCount - 1)*(cardSize.x + cardPadding);
	let floatingX = (width-opponentDeckWidth)/2 + _floating.index * (cardSize.x + cardPadding);
	floating = new FloatingCard(_floating.card, _floating.index, floatingX, cardSize.y/2 + cardPadding+55);
	floating.mine = false;
	mustPickUp = requiredPickup;
	alreadyPickedUp = false;
});

socket.on("draw", function(newCard) {
	floating = new FloatingCard(newCard, -1, (width+cardSize.x+cardPadding)/2, defaultHeight/2);
	floating.destX = width/2;
	floating.destY = defaultHeight-cardSize.y/2-cardPadding;
	if (mustPickUp > 0) {
		mustPickUp--;
		alreadyPickedUp = true;
	}
});

socket.on("opponentDraw", function() {
	floating = new FloatingCard(null, -1, (width+cardSize.x+cardPadding)/2, defaultHeight/2);
	floating.destX = width/2;
	floating.destY = cardSize.y/2 + cardPadding+55;
	floating.mine = false;
});

socket.on("shuffle", function() {
	shuffling = true;
});

socket.on("shuffled", function() {
	shuffling = false;
});

socket.on("uno", function() {
	declaring = opponent;
	timeDeclared = 0;
});

socket.on("overruled", function(doubted) {
	timeOverruled = 0;
	overruled = doubted;
	if (doubted === opponent) {
		mustPickUp += 2;
		alreadyPickedUp = true;
		turn = player;
	} else {
		turn = opponent;
	}
});

socket.on("sustained", function(doubted) {
	timeSustained = 0;
	sustained = doubted;
	if (doubted === player) {
		mustPickUp += 2;
		alreadyPickedUp = true;
		turn = player;
	} else {
		turn = opponent;
	}
});

socket.on("tie", function() {
	endText = "Out of cards! Game Over";
});

socket.on("win", function(winner) {
	endText = `${winner} Wins!`;
});

function isValid(card) {
	if (mustPickUp > 0) {
		if (alreadyPickedUp) {
			return card === null;
		}
		if (card === null) {
			for (let myCard of myDeck) {
				if (isValid(myCard)) {
					return false;
				}
			}
			return true;
		}
		return card.value === facing.value;
	}
	if (facing.color === "wild") {
		return card !== null;
	}
	if (card === null) {
		for (let myCard of myDeck) {
			if (isValid(myCard)) {
				return false;
			}
		}
		return true;
	}
	if (card.color === "wild") {
		return true;
	}
	if (card.color === facing.color) {
		return true;
	}
	if (card.value === facing.value) {
		return true;
	}
	return false;
}

function reset() {
	console.log("sent reset signal");
	socket.emit("reset");
}

function declareUno() {
	socket.emit("uno", player);
	declaring = player;
	timeDeclared = 0;
}

function callout() {
	socket.emit("doubt", opponent);
}

function setup() {
	createCanvas(1200, 1200);
	cardSize = createVector(100, 141);
	biggerCardSize = createVector(cardSize.x * 1.1, cardSize.y * 1.1);

	colors = {"red": color(255, 0, 0),
			  "green": color(0, 255, 0),
			  "blue": color(0, 0, 255),
			  "yellow": color(255, 255, 0),
			  "wild": color(0, 0, 0)};
	resetButton = createButton("New Game");
	unoButton = createButton("Declare Uno");
	calloutButton = createButton(`${opponent} Didn't Declare Uno`);
	resetButton.mousePressed(reset);
	unoButton.mousePressed(declareUno);
	calloutButton.mousePressed(callout);
}

function drawCard(card, overlapping=false, playable=false, empty=false) {
	strokeWeight(2);
	textAlign(CENTER, CENTER);
	textSize(24);
	rectMode(CENTER)
	let size = (overlapping && turn === player && isValid(card)) ? biggerCardSize : cardSize;
	stroke(0);
	if (turn === player && isValid(card) && playable) {
		strokeWeight(5);
	}

	if (card === null || card === undefined) {
		fill(255, 0, 0);
		if (empty) {
			noFill();
		}
		rect(0, 0, size.x, size.y);
		if (!empty) {
			fill(255);
			strokeWeight(2);
			text("Uno", 0, 0);
		}
	} else if (!card.hide) {
		fill(colors[card.color]);
		rect(0, 0, size.x, size.y);
		fill(255);
		strokeWeight(2);
		text(card.value, 0, 0);
	}
}

function mouseClicked() {
	if (endText === null) {
		if (pickingColor) {
			let mx = mouseX - width/2;
			let my = mouseY - height/2;
			let col = null;
			if (-colorPickSize - cardPadding/2 <= mx && mx <= -cardPadding/2) {
				if (-colorPickSize - cardPadding/2 <= my && my <= -cardPadding/2) {
					col = "red";
				} else if (cardPadding/2 <= my && my <= colorPickSize + cardPadding/2) {
					col = "yellow";
				}
			} else if (cardPadding/2 <= mx && mx <= colorPickSize + cardPadding/2) {
				if (-colorPickSize - cardPadding/2 <= my && my <= -cardPadding/2) {
					col = "blue";
				} else if (cardPadding/2 <= my && my <= colorPickSize + cardPadding/2) {
					col = "green";
				}
			}
			if (col !== null) {
				floating = new FloatingCard({color: col, value: "pick"}, pickingColorIndex, pickingColorX, pickingColorY);
				console.log("sending floating card");
				socket.emit("floating", player, floating, mustPickUp);
				mustPickUp = 0;
				alreadyPickedUp = false;
				pickingColor = false;
			}
		} else if (floating === null && turn === player) {
			let myDeckWidth = (min(7, myDeck.length) - 1)*(cardSize.x + cardPadding);
			let mx = mouseX - (width-myDeckWidth)/2;
			let my = mouseY - (defaultHeight-cardSize.y/2 - cardPadding);
			var clickedCard = null;
			var i;
			for (i=0; i<myDeck.length; i++) {
				if (i % 7 === 0 && i > 0) {
					mx = mouseX - (width-myDeckWidth)/2;
					my -= cardSize.y + cardPadding;
				}
				let overlapping = -cardSize.x/2 <= mx && mx <= cardSize.x/2 && -cardSize.y/2 <= my && my <= cardSize.y/2;
				if (overlapping) {
					clickedCard = myDeck[i];
					break;
				}
				mx -= cardSize.x + cardPadding;
			}

			if (clickedCard !== null) {
				if (isValid(clickedCard)) {
					if (clickedCard.value === "pick") {
						pickingColor = true;
						pickingColorIndex = i;
						pickingColorX = mouseX - mx;
						pickingColorY = mouseY - my;
					} else {
						floating = new FloatingCard(clickedCard, i, mouseX-mx, mouseY-my);
						console.log("sending floating card");
						socket.emit("floating", player, floating, mustPickUp);
						mustPickUp = 0;
						alreadyPickedUp = false;
					}
				}
			} else if ((width+cardPadding)/2 <= mouseX && mouseX <= (width+cardPadding)/2+cardSize.x && (defaultHeight-cardSize.y)/2 <= mouseY && mouseY <= (defaultHeight+cardSize.y)/2){
				if (isValid(null)) {
					if (deckCount === 0) {
						console.log("requesting shuffle");
						socket.emit("shuffle", player, mustPickUp===1);
					} else {
						console.log("drawing card from deck");
						socket.emit("draw", player, mustPickUp===1);
					}
				}
			}
		}
	}
}

function draw() {
	background(191, 253, 255);

	push();
	let opponentDeckWidth = (opponentCardCount - 1)*(cardSize.x + cardPadding);
	if (turn === opponent) {
		ellipseMode(CENTER);
		stroke(0, 0, 255);
		fill(255);
		strokeWeight(2);
		ellipse(width/2, 35, 300, 45);	
	}
	noStroke();
	fill(0);
	textSize(30);
	textAlign(CENTER, CENTER);
	text(`${opponent}'s Deck`, width/2, 35);
	translate((width-opponentDeckWidth)/2, cardSize.y/2 + cardPadding+55);
	for (let i=0; i<opponentCardCount; i++) {
		if (floating === null || floating.mine || floating.index !== i) {
			drawCard(null)
		}
		translate(cardSize.x + cardPadding, 0);
	}
	pop();
	push();
	let myDeckWidth = (min(7,myDeck.length) - 1)*(cardSize.x + cardPadding);
	if (turn === player) {
		ellipseMode(CENTER);
		stroke(0, 0, 255);
		fill(255);
		strokeWeight(2);
		ellipse(width/2, defaultHeight-cardSize.y - cardPadding - 30, 300, 45);	
	}
	noStroke();
	fill(0);
	textSize(30);
	textAlign(CENTER, CENTER);
	text("My Deck", width/2, defaultHeight-cardSize.y - cardPadding - 30);
	translate((width-myDeckWidth)/2, defaultHeight-cardSize.y/2 - cardPadding);
	let mx = mouseX - (width-myDeckWidth)/2;
	let my = mouseY - (defaultHeight-cardSize.y/2 - cardPadding);
	for (let i=0; i<myDeck.length; i++) {
		if (i % 7 === 0 && i > 0) {
			mx = mouseX - (width-myDeckWidth)/2;
			my -= cardSize.y + cardPadding;
			pop();
			push();
			translate((width-myDeckWidth)/2, defaultHeight-cardSize.y/2 - cardPadding + Math.floor(i/7)*(cardSize.y+cardPadding));
		}
		let overlapping = -cardSize.x/2 <= mx && mx <= cardSize.x/2 && -cardSize.y/2 <= my && my <= cardSize.y/2; 
		drawCard(myDeck[i], overlapping, true);
		mx -= cardSize.x + cardPadding;
		translate(cardSize.x + cardPadding, 0);
	}
	pop();
	push();
	translate((width-cardSize.x-cardPadding)/2, defaultHeight/2);
	drawCard(facing);
	translate(cardSize.x + cardPadding, 0);
	let overlapping = (width+cardPadding)/2 <= mouseX && mouseX <= (width+cardPadding)/2+cardSize.x && (defaultHeight-cardSize.y)/2 <= mouseY && mouseY <= (defaultHeight+cardSize.y)/2;
	drawCard(null, overlapping, true, deckCount === 0);
	translate(cardSize.x/2 + cardPadding, 0)
	textAlign(LEFT, CENTER);
	textSize(30);
	noStroke();
	fill(0);
	text(deckCount, 0, 0);
	pop();
	if (floating !== null) {
		floating.draw();
		if (floating.update()) {
			if (floating.index >= 0) {
				facing = floating.card;
			}
			if (floating.mine) {
				myDeck.splice(floating.index, 1);
			} else {
				opponentCardCount --;
			}
			floating = null;
			socket.emit("data", player);
		}
	}

	let preferredHeight = defaultHeight + (cardSize.y+cardPadding) * Math.floor((myDeck.length-1)/7);
	if (preferredHeight != height) {
		resizeCanvas(width, preferredHeight);
	}

	if (endText === null) {
		if (shuffling) {
			fill(0);
			stroke(255);
			textAlign(CENTER, CENTER);
			strokeWeight(2);
			textSize(50);
			text("Shuffling...", width/2, preferredHeight/2);
		}

		if (declaring !== null) {
			fill(0, 255, 0);
			stroke(0);
			strokeWeight(2);
			textSize(50);
			textAlign(CENTER, CENTER);
			text(`${declaring} declared Uno`, width/2, preferredHeight/2);
			timeDeclared += deltaTime;
			if (timeDeclared > 1000) {
				declaring = null;
			}
		}

		if (overruled !== null) {
			fill(0, 255, 0);
			stroke(0);
			strokeWeight(2);
			textSize(50);
			textAlign(CENTER, CENTER);
			if (overruled === player) {
				text(`${opponent} called you out, and has to +2`, width/2, preferredHeight/2);
			} else {
				text(`${opponent} actually did declare Uno. +2`, width/2, preferredHeight/2);
			}
			timeOverruled += deltaTime;
			if (timeOverruled > 1000) {
				overruled = null;
			}
		}

		if (sustained !== null) {
			fill(0, 255, 0);
			stroke(0);
			strokeWeight(2);
			textSize(50);
			textAlign(CENTER, CENTER);
			if (sustained === player) {
				text("You didn't declare Uno. +2", width/2, preferredHeight/2);
			} else {
				text(`${opponent} didn't declare Uno, and has to +2`, width/2, preferredHeight/2);
			}
			timeSustained += deltaTime;
			if (timeSustained > 1000) {
				sustained = null;
			}
		}
	} else {
		fill(0, 255, 0);
		stroke(0);
		strokeWeight(2);
		textSize(50);
		textAlign(CENTER, CENTER);
		text(endText, width/2, preferredHeight/2);
	}

	if (pickingColor) {
		push();
		translate(width/2,height/2);
		rectMode(CENTER);
		strokeWeight(2);
		noStroke();
		fill(0);
		let boxSize = 2*(colorPickSize+cardPadding)+cardPadding;
		rect(0, 0, boxSize, boxSize);
		stroke(255);
		let mx = mouseX - width/2;
		let my = mouseY - height/2;
		let col = null;
		let redSize = colorPickSize;
		let blueSize = colorPickSize;
		let yellowSize = colorPickSize;
		let greenSize = colorPickSize;
		let extra = cardPadding;
		if (-colorPickSize - cardPadding/2 <= mx && mx <= -cardPadding/2) {
			if (-colorPickSize - cardPadding/2 <= my && my <= -cardPadding/2) {
				redSize += extra;
			} else if (cardPadding/2 <= my && my <= colorPickSize + cardPadding/2) {
				yellowSize += extra;
			}
		} else if (cardPadding/2 <= mx && mx <= colorPickSize + cardPadding/2) {
			if (-colorPickSize - cardPadding/2 <= my && my <= -cardPadding/2) {
				blueSize += extra;
			} else if (cardPadding/2 <= my && my <= colorPickSize + cardPadding/2) {
				greenSize += extra;
			}
		}

		fill(255, 0, 0);
		rect(-boxSize/2 + cardPadding + colorPickSize/2, -boxSize/2 + cardPadding + colorPickSize/2, redSize, redSize);
		fill(0, 0, 255);
		rect(boxSize/2 - cardPadding - colorPickSize/2, -boxSize/2 + cardPadding + colorPickSize/2, blueSize, blueSize);
		fill(255, 255, 0);
		rect(-boxSize/2 + cardPadding + colorPickSize/2, boxSize/2 - cardPadding - colorPickSize/2, yellowSize, yellowSize);
		fill(0, 255, 0);
		rect(boxSize/2 - cardPadding - colorPickSize/2, boxSize/2 - cardPadding - colorPickSize/2, greenSize, greenSize);
		pop();
	}
	let hasPlayable = false;
	for (let card of myDeck) {
		if (isValid(card)) {
			hasPlayable = true;
			break;
		}
	}
	if ((turn === player && myDeck.length <= 2 && hasPlayable) || myDeck.length === 1) {
		unoButton.removeAttribute("disabled");
	} else {
		unoButton.attribute("disabled", "");
	}
}
