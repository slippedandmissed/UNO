class FloatingCard {
	constructor(card, index, x, y) {
		this.card = null;
		if (card !== null) {
			this.card = {color: card.color, value: card.value};
			card.hide = true;
		}
		this.index = index;
		this.startX = x;
		this.startY = y;

		this.destX = (width-cardSize.x-cardPadding)/2;
		this.destY = height/2;

		this.t = 0;

		this.transitionTime = 0.25;

		this.mine = true;
	}

	lerp(a, b, t) {
		return t * (b-a) + a;
	}

	draw() {
		translate(lerp(this.startX, this.destX, this.t), lerp(this.startY, this.destY, this.t));
		drawCard(this.card);
	}

	update() {
		this.t += deltaTime/(1000 * this.transitionTime);
		if (this.t >= 1) {
			this.t = 1;
			return true;
		}
		return false;
	}
}