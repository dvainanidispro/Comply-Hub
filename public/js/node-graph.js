(function () {
	"use strict";

	var SELECTOR = ".node-graph-bg, .node-graph-background";
	var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
	var REFERENCE_AREA = 1600 * 900;
	var MAX_AUTO_DENSITY = 220;
	/*
	CSS tuning surface for hosts that match SELECTOR:
	--node-graph-density: base node count before area scaling.
	--node-graph-speed: drift speed of each node.
	--node-graph-link-distance: max distance at which two nodes can connect.
	--node-graph-link-base-opacity: minimum visibility kept by long-distance edges.
	--node-graph-link-fade-power: how quickly edge opacity fades with distance; lower keeps long edges brighter.
	--node-graph-node-1 / --node-graph-node-2 / --node-graph-node-3: node color pool.
	--node-graph-link-color: stroke color of the edges.
	--node-graph-hover-distance: cursor influence radius for pull + brighten.
	--node-graph-hover-gravity: strength of cursor pull on nearby nodes.
	--node-graph-hover-brighten: extra opacity added near the cursor.
	--node-graph-base-opacity: resting opacity of nodes and the main edge fade curve.
	--node-graph-overscan: off-screen simulation margin so nodes can drift in/out.
	*/
	var DEFAULTS = {
		density: 70,
		speed: 0.4,
		linkDistance: 150,
		linkBaseOpacity: 0.08,
		linkFadePower: 0.8,
		colors: ["#a78bfa", "#f0abfc", "#67e8f9"],
		linkColor: "#7c3aed",
		hoverDistance: 200,
		hoverGravity: 0.005,
		hoverBrighten: 0.8,
		baseOpacity: 0.45,
		overscan: 80
	};

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function readNumber(styles, name, fallback) {
		var value = parseFloat(styles.getPropertyValue(name));
		return Number.isFinite(value) ? value : fallback;
	}

	function readColor(styles, name, fallback) {
		var value = styles.getPropertyValue(name).trim();
		return value || fallback;
	}

	function readOptions(host) {
		var styles = window.getComputedStyle(host);

		// Each runtime option can be overridden via the matching CSS custom property
		// documented above; DEFAULTS are only the fallback values.
		return {
			density: Math.max(1, Math.round(readNumber(styles, "--node-graph-density", DEFAULTS.density))),
			speed: Math.max(0, readNumber(styles, "--node-graph-speed", DEFAULTS.speed)),
			linkDistance: Math.max(1, readNumber(styles, "--node-graph-link-distance", DEFAULTS.linkDistance)),
			linkBaseOpacity: clamp(readNumber(styles, "--node-graph-link-base-opacity", DEFAULTS.linkBaseOpacity), 0, 1),
			linkFadePower: Math.max(0.1, readNumber(styles, "--node-graph-link-fade-power", DEFAULTS.linkFadePower)),
			colors: [
				readColor(styles, "--node-graph-node-1", DEFAULTS.colors[0]),
				readColor(styles, "--node-graph-node-2", DEFAULTS.colors[1]),
				readColor(styles, "--node-graph-node-3", DEFAULTS.colors[2])
			],
			linkColor: readColor(styles, "--node-graph-link-color", DEFAULTS.linkColor),
			hoverDistance: Math.max(0, readNumber(styles, "--node-graph-hover-distance", DEFAULTS.hoverDistance)),
			hoverGravity: Math.max(0, readNumber(styles, "--node-graph-hover-gravity", DEFAULTS.hoverGravity)),
			hoverBrighten: Math.max(0, readNumber(styles, "--node-graph-hover-brighten", DEFAULTS.hoverBrighten)),
			baseOpacity: clamp(readNumber(styles, "--node-graph-base-opacity", DEFAULTS.baseOpacity), 0, 1),
			overscan: Math.max(0, readNumber(styles, "--node-graph-overscan", DEFAULTS.overscan))
		};
	}

	function withAlpha(color, alpha) {
		var normalizedAlpha = clamp(alpha, 0, 1);
		var match;
		var channels;

		if (color.charAt(0) === "#") {
			if (color.length === 4) {
				return "rgba(" +
					parseInt(color.charAt(1) + color.charAt(1), 16) + "," +
					parseInt(color.charAt(2) + color.charAt(2), 16) + "," +
					parseInt(color.charAt(3) + color.charAt(3), 16) + "," +
					normalizedAlpha + ")";
			}

			if (color.length === 7) {
				return "rgba(" +
					parseInt(color.slice(1, 3), 16) + "," +
					parseInt(color.slice(3, 5), 16) + "," +
					parseInt(color.slice(5, 7), 16) + "," +
					normalizedAlpha + ")";
			}
		}

		match = color.match(/^rgba?\(([^)]+)\)$/i);
		if (match) {
			channels = match[1].split(",").slice(0, 3).map(function (part) {
				return part.trim();
			});

			if (channels.length === 3) {
				return "rgba(" + channels.join(",") + "," + normalizedAlpha + ")";
			}
		}

		return color;
	}

	function NodeGraphBackground(host) {
		this.host = host;
		this.canvas = document.createElement("canvas");
		this.canvas.className = "node-graph-canvas";
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.style.position = "absolute";
		this.canvas.style.inset = "0";
		this.canvas.style.zIndex = "-1";
		this.canvas.style.display = "block";
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.canvas.style.pointerEvents = "none";
		this.ctx = this.canvas.getContext("2d");

		if (!this.ctx) {
			return;
		}

		this.width = 0;
		this.height = 0;
		this.dpr = 1;
		this.raf = 0;
		this.nodes = [];
		this.mouse = { x: -9999, y: -9999 };
		this.options = readOptions(host);
		this.hasResizeObserver = typeof window.ResizeObserver === "function";

		this.handlePointerMove = this.handlePointerMove.bind(this);
		this.handlePointerLeave = this.handlePointerLeave.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.tick = this.tick.bind(this);

		this.prepareHost();
		this.host.insertBefore(this.canvas, this.host.firstChild);
		this.host.classList.add("node-graph-live");
		this.host.__nodeGraphBackground = this;

		if (this.hasResizeObserver) {
			this.resizeObserver = new window.ResizeObserver(this.handleResize);
			this.resizeObserver.observe(this.host);
		} else {
			window.addEventListener("resize", this.handleResize);
		}

		this.host.addEventListener("pointermove", this.handlePointerMove, { passive: true });
		this.host.addEventListener("pointerleave", this.handlePointerLeave);
		this.host.addEventListener("pointercancel", this.handlePointerLeave);

		this.handleResize();
		this.raf = window.requestAnimationFrame(this.tick);
	}

	NodeGraphBackground.prototype.prepareHost = function () {
		var styles = window.getComputedStyle(this.host);

		if (styles.position === "static") {
			this.host.style.position = "relative";
		}

		if (styles.overflow === "visible") {
			this.host.style.overflow = "hidden";
		}

		if (styles.isolation === "auto") {
			this.host.style.isolation = "isolate";
		}
	};

	NodeGraphBackground.prototype.handleResize = function () {
		var rect = this.host.getBoundingClientRect();

		this.options = readOptions(this.host);
		this.width = Math.max(0, rect.width);
		this.height = Math.max(0, rect.height);
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);

		this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
		this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
		this.canvas.style.width = this.width + "px";
		this.canvas.style.height = this.height + "px";
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

		this.seedNodes();
	};

	NodeGraphBackground.prototype.getNodeCount = function () {
		var area = this.width * this.height;
		var scaledDensity;

		if (area <= 0) {
			return this.options.density;
		}

		scaledDensity = Math.round(this.options.density * (area / REFERENCE_AREA));
		return clamp(scaledDensity, this.options.density, MAX_AUTO_DENSITY);
	};

	NodeGraphBackground.prototype.seedNodes = function () {
		var options = this.options;
		var width = this.width;
		var height = this.height;
		var overscan = options.overscan;
		var wMin = -overscan;
		var wMax = width + overscan;
		var hMin = -overscan;
		var hMax = height + overscan;
		var nodeCount = this.getNodeCount();
		var nodes = [];
		var i;

		for (i = 0; i < nodeCount; i += 1) {
			nodes.push({
				x: wMin + Math.random() * (wMax - wMin),
				y: hMin + Math.random() * (hMax - hMin),
				vx: (Math.random() - 0.5) * options.speed * 2,
				vy: (Math.random() - 0.5) * options.speed * 2,
				r: 1 + Math.random() * 1.6,
				color: options.colors[Math.floor(Math.random() * options.colors.length)]
			});
		}

		this.nodes = nodes;
	};

	NodeGraphBackground.prototype.handlePointerMove = function (event) {
		var rect = this.host.getBoundingClientRect();

		this.mouse.x = event.clientX - rect.left;
		this.mouse.y = event.clientY - rect.top;
	};

	NodeGraphBackground.prototype.handlePointerLeave = function () {
		this.mouse.x = -9999;
		this.mouse.y = -9999;
	};

	NodeGraphBackground.prototype.brighten = function (x, y) {
		var options = this.options;
		var distance;

		if (this.mouse.x < -9000 || options.hoverDistance <= 0 || options.hoverBrighten <= 0) {
			return 0;
		}

		distance = Math.hypot(this.mouse.x - x, this.mouse.y - y);
		if (distance >= options.hoverDistance) {
			return 0;
		}

		return (1 - distance / options.hoverDistance) * options.hoverBrighten;
	};

	NodeGraphBackground.prototype.stepNodes = function () {
		var options = this.options;
		var worldLeft = -options.overscan;
		var worldRight = this.width + options.overscan;
		var worldTop = -options.overscan;
		var worldBottom = this.height + options.overscan;
		var mouseInside = this.mouse.x > -9000;
		var i;
		var node;
		var dx;
		var dy;
		var distance;
		var pull;

		for (i = 0; i < this.nodes.length; i += 1) {
			node = this.nodes[i];
			node.x += node.vx;
			node.y += node.vy;

			if (node.x < worldLeft || node.x > worldRight) {
				node.x = clamp(node.x, worldLeft, worldRight);
				node.vx *= -1;
			}

			if (node.y < worldTop || node.y > worldBottom) {
				node.y = clamp(node.y, worldTop, worldBottom);
				node.vy *= -1;
			}

			if (mouseInside && options.hoverDistance > 0 && options.hoverGravity > 0) {
				dx = this.mouse.x - node.x;
				dy = this.mouse.y - node.y;
				distance = Math.hypot(dx, dy);

				if (distance < options.hoverDistance) {
					pull = (1 - distance / options.hoverDistance) * options.hoverGravity;
					node.x += dx * pull;
					node.y += dy * pull;
				}
			}
		}
	};

	NodeGraphBackground.prototype.drawLinks = function () {
		var ctx = this.ctx;
		var options = this.options;
		var i;
		var j;
		var a;
		var b;
		var distance;
		var normalizedDistance;
		var lengthAlpha;
		var midBoost;
		var alpha;

		ctx.lineWidth = 1;

		for (i = 0; i < this.nodes.length; i += 1) {
			for (j = i + 1; j < this.nodes.length; j += 1) {
				a = this.nodes[i];
				b = this.nodes[j];
				distance = Math.hypot(a.x - b.x, a.y - b.y);

				if (distance < options.linkDistance) {
					normalizedDistance = 1 - distance / options.linkDistance;
					lengthAlpha = Math.pow(normalizedDistance, options.linkFadePower);
					midBoost = this.brighten((a.x + b.x) / 2, (a.y + b.y) / 2);
					alpha = Math.min(
						1,
						options.linkBaseOpacity +
						lengthAlpha * options.baseOpacity +
						midBoost * Math.max(0.35, lengthAlpha)
					);

					ctx.strokeStyle = withAlpha(options.linkColor, alpha);
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
		}
	};

	NodeGraphBackground.prototype.drawNodes = function () {
		var ctx = this.ctx;
		var options = this.options;
		var i;
		var node;
		var alpha;

		for (i = 0; i < this.nodes.length; i += 1) {
			node = this.nodes[i];
			alpha = Math.min(1, options.baseOpacity + this.brighten(node.x, node.y));

			ctx.fillStyle = withAlpha(node.color, alpha);
			ctx.beginPath();
			ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	NodeGraphBackground.prototype.tick = function () {
		if (!this.ctx) {
			return;
		}

		this.ctx.clearRect(0, 0, this.width, this.height);

		if (this.width > 0 && this.height > 0) {
			this.stepNodes();
			this.drawLinks();
			this.drawNodes();
		}

		this.raf = window.requestAnimationFrame(this.tick);
	};

	NodeGraphBackground.prototype.destroy = function () {
		if (this.raf) {
			window.cancelAnimationFrame(this.raf);
			this.raf = 0;
		}

		if (this.hasResizeObserver && this.resizeObserver) {
			this.resizeObserver.disconnect();
		} else {
			window.removeEventListener("resize", this.handleResize);
		}

		this.host.removeEventListener("pointermove", this.handlePointerMove);
		this.host.removeEventListener("pointerleave", this.handlePointerLeave);
		this.host.removeEventListener("pointercancel", this.handlePointerLeave);
		this.host.classList.remove("node-graph-live");

		if (this.canvas.parentNode === this.host) {
			this.host.removeChild(this.canvas);
		}

		delete this.host.__nodeGraphBackground;
	};

	function initNodeGraphBackgrounds(root) {
		var scope = root || document;
		var mediaQuery = window.matchMedia ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
		var hosts;
		var instances = [];
		var i;
		var instance;

		if (mediaQuery && mediaQuery.matches) {
			return instances;
		}

		hosts = scope.querySelectorAll(SELECTOR);
		for (i = 0; i < hosts.length; i += 1) {
			if (!hosts[i].__nodeGraphBackground) {
				instance = new NodeGraphBackground(hosts[i]);
				if (instance.ctx) {
					instances.push(instance);
				}
			}
		}

		return instances;
	}

	function destroyNodeGraphBackgrounds(root) {
		var scope = root || document;
		var hosts = scope.querySelectorAll(SELECTOR);
		var i;

		for (i = 0; i < hosts.length; i += 1) {
			if (hosts[i].__nodeGraphBackground) {
				hosts[i].__nodeGraphBackground.destroy();
			}
		}
	}

	window.NodeGraphBackground = {
		init: initNodeGraphBackgrounds,
		destroy: destroyNodeGraphBackgrounds
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			initNodeGraphBackgrounds(document);
		});
	} else {
		initNodeGraphBackgrounds(document);
	}
})();
