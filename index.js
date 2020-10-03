var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var path = require("path");

const colors = ["red", "green", "blue", "yellow"];
const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+2", "skip", "reverse"];
const wild = ["pick", "+4"];
const all = vals + wild;

const cardCount = 7;

var morgan = [];
var brianna = [];
var deck = [];
var played = [];
var facing;
var turn = null;

var called = {"Morgan": false,
			  "Brianna": false};

io.on("connection", function(socket){
	console.log("new connection: "+socket.id);

	socket.on("reset", reset);

	socket.on("data", function(sender) {
		if (sender === "Morgan") {
			socket.emit("data", morgan, facing, brianna.length, deck.length, turn);
		} else {
			socket.emit("data", brianna, facing, morgan.length, deck.length, turn);
		}
	});

	socket.on("floating", function(sender, floating, requiredPickUp) {
		console.log("received floating card");
		played.push(facing);
		facing = floating.card;
		if (floating.card.value !== "skip" && floating.card.value !== "reverse") {
			turn = turn === "Morgan" ? "Brianna" : "Morgan";
		}
		let senderDeck = sender === "Morgan" ? morgan : brianna;
		senderDeck.splice(floating.index, 1);
		if (senderDeck.length === 0) {
			io.emit("win", sender);
		}
		if (floating.card.value === "+2") {
			requiredPickUp += 2;
		}
		if (floating.card.value === "+4") {
			requiredPickUp += 4;
		}
		socket.broadcast.emit("floating", floating, requiredPickUp);
	});

	function drawCard(socket, sender, toggle) {
		console.log(`${sender} is drawing a card from the deck`);
		if (deck.length === 0) {
			console.log("Out of cards");
			io.emit("tie");
		}
		var newCard = draw();
		if (sender === "Morgan") {
			//newCard = {color: "wild", value: "+4"}; //CHEAT
			morgan.push(newCard);
			morgan = sort(morgan);
		} else {
			brianna.push(newCard);
			brianna = sort(brianna);
		}
		socket.emit("draw", newCard);
		called[sender] = false;
		socket.broadcast.emit("opponentDraw");
		if (toggle) {
			turn = turn === "Morgan" ? "Brianna" : "Morgan";
		}
	}

	socket.on("shuffle", function(sender, toggle) {
		io.emit("shuffle");
		console.log("shuffle requested");
		shuffle();
		setTimeout(function() {
			io.emit("shuffled");
			drawCard(socket, sender, toggle)
		}, 1000);
	})

	socket.on("draw", function(sender, toggle) {
		drawCard(socket, sender, toggle);
	});

	socket.on("uno", function(sender) {
		console.log(`${sender} has been declared`);
		called[sender] = true;
		socket.broadcast.emit("uno");
	});

	socket.on("doubt", function(opponent) {
		console.log(`${opponent} has been doubted`);
		let opponentDeck = opponent === "Morgan" ? morgan : brianna;
		if (called[opponent] || opponentDeck.length !== 1) {
			io.emit("overruled", opponent);
			turn = opponent == "Morgan" ? "Brianna" : "Morgan";
		} else {
			io.emit("sustained", opponent);
			called[opponent] = true;
			turn = opponent;
		}
	});
});

function shuffle() {
	console.log("shuffling deck");
	for (var card of played) {
		insertIntoDeck(card);
	}
	played = [];
	console.log("shuffled deck");
}

function sort(deck) {
	let split = {"red": [], "green": [], "blue": [], "yellow": [], "wild": []};
	for (let card of deck) {
		let found = false;
		let index = all.indexOf(card.value);
		for (let i=0; i<split[card.color].length; i++) {
			let sorted = split[card.color][i];
			if (all.indexOf(sorted.value) > index) {
				found = true;
				split[card.color].splice(i, 0, card);
				break;
			}
		}
		if (!found) {
			split[card.color].push(card);
		}
	}
	deck = [];
	for (let color in split) {
		deck = deck.concat(split[color]);
	}
	return deck;
};

function insertIntoDeck(card) {
	let index = Math.floor(Math.random() * (deck.length+1));
	if (wild.includes(card.value)) {
		card.color = "wild";
	}
	deck.splice(index, 0, card);
}

function draw() {
	return deck.splice(0, 1)[0];
}

function reset() {
	console.log("reset");
	deck = [];
	played = [];
	called = {"Morgan": false,
			  "Brianna": false};
	for (let color of colors) {
		for (let val of vals) {
			for (let i=0; i<2; i++) {
				insertIntoDeck({color: color, value: val});
				if (val === "0") {
					break;
				}
			}
		}
	}
	for (let val of wild) {
		for (let i=0; i<4; i++) {
			insertIntoDeck({color: "wild", value: val});
		}
	}
	brianna = [];
	morgan = [];
	for (let i=0; i<cardCount; i++) {
		brianna.push(draw());
		morgan.push(draw());
		// morgan[morgan.length-1] = {color: "wild", value: "+4"}; //CHEAT

	}
	brianna = sort(brianna);
	morgan = sort(morgan);

	facing = draw();

	turn = Math.floor(Math.random()*2) === 0 ? "Morgan" : "Brianna";

	io.emit("reset");
}

http.listen(3000, function() {
	console.log("listening on *:3000");
});

app.get("/morgan", function(req, res) {
	res.sendFile(path.join(__dirname + "/morgan.html"));
});


app.get("/brianna", function(req, res) {
	res.sendFile(path.join(__dirname + "/brianna.html"));
});

app.use("/js", express.static(path.join(__dirname, 'js')));
app.use("/css", express.static(path.join(__dirname, 'css')));

app.listen(8080, function() {
	console.log("listening on *:8080");
});

reset();