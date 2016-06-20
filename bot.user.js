/*
Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
// ==UserScript==
// @name         Slither.io-redaor-bot
// @namespace    http://slither.io/
// @version      1.0.0
// @description  Slither.io bot
// @author       Ermiya Eskandary & Théophile Cailliau
// @match        http://slither.io/
// @grant        none
// ==/UserScript==

/*
Override bot options here
Uncomment variables you wish to change from their default values
Changes you make here will be kept between script versions
*/
var customBotOptions = {
    // target fps
    // targetFps: 30,
    // size of arc for collisionAngles
    // arcSize: Math.PI / 8,
    // radius multiple for circle intersects
    // radiusMult: 10,
    // food cluster size to trigger acceleration
    // foodAccelSize: 60,
    // maximum angle of food to trigger acceleration
    // foodAccelAngle:  Math.PI / 3,
    // how many frames per food check
    // foodFrames: 4,
    // round food cluster size up to the nearest
    // foodRoundSize: 5,
    // round food angle up to nearest for angle difference scoring
    // foodRoundAngle: Math.PI / 8,
    // food clusters at or below this size won't be considered
    // if there is a collisionAngle
    // foodSmallSize: 10,
    // angle or higher where enemy heady is considered in the rear
    // rearHeadAngle: 3 * Math.PI / 4,
    // attack emeny rear head at this angle
    // rearHeadDir: Math.PI / 2,
    // quick radius toggle size in approach mode
    // radiusApproachSize: 5,
    // quick radius toggle size in avoid mode
    // radiusAvoidSize: 25,
    // uncomment to quickly revert to the default options
    // if you update the script while this is active,
    // you will lose your custom options
    // useDefaults: true
};

// Custom logging function - disabled by default
window.log = function() {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

var canvasUtil = window.canvasUtil = (function() {
    return {
        // Ratio of screen size divided by canvas size.
        canvasRatio: {
            x: window.mc.width / window.ww,
            y: window.mc.height / window.hh
        },
		mouseAngle: function(b){
			var mx = b.clientX-ww/2;
			var my = b.clientY-hh/2;
			return canvasUtil.fastAtan2(my,mx);
		},

        // Set direction of snake towards the virtual mouse coordinates
        setMouseCoordinates: function(point){
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert snake-relative coordinates to absolute screen coordinates.
        mouseToScreen: function(point) {
            var screenX = point.x + (window.ww / 2);
            var screenY = point.y + (window.hh / 2);
            return {
                x: screenX,
                y: screenY
            };
        },

        // Convert screen coordinates to canvas coordinates.
        screenToCanvas: function(point) {
            var canvasX = window.csc *
                (point.x * canvasUtil.canvasRatio.x) - parseInt(window.mc.style.left);
            var canvasY = window.csc *
                (point.y * canvasUtil.canvasRatio.y) - parseInt(window.mc.style.top);
            return {
                x: canvasX,
                y: canvasY
            };
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function(point) {
            var mouseX = (point.x - window.snake.xx) * window.gsc;
            var mouseY = (point.y - window.snake.yy) * window.gsc;
            return {
                x: mouseX,
                y: mouseY
            };
        },

        // Map coordinates to Canvas coordinates.
        mapToCanvas: function(point) {
            var c = canvasUtil.mapToMouse(point);
            c = canvasUtil.mouseToScreen(c);
            c = canvasUtil.screenToCanvas(c);
            return c;
        },

        // Map to Canvas coordinates conversion for drawing circles.
        circleMapToCanvas: function(circle) {
            var newCircle = canvasUtil.mapToCanvas(circle);
            return canvasUtil.circle(
                newCircle.x,
                newCircle.y,
                // Radius also needs to scale by .gsc
                circle.radius * window.gsc
            );
        },

        // Constructor for point type
        point: function(x, y) {
            var p = {
                x: Math.round(x),
                y: Math.round(y)
            };

            return p;
        },

        // Constructor for rect type
        rect: function(x, y, w, h) {
            var r = {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h)
            };

            return r;
        },

        // Constructor for circle type
        circle: function(x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };

            return c;
        },
        // Fast atan2
        fastAtan2: function(y, x) {
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;
            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = 3 * Math.PI / 4;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = Math.PI / 4;
            }
            angle += (0.1963 * r * r - 0.9817) * r;
            if (y < 0) {
                return -angle;
            }

            return angle;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function(e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
                window.desired_gsc = window.gsc;
            }
        },

        // Restores zoom to the default value.
        resetZoom: function() {
            window.gsc = 0.9;
            window.desired_gsc = 0.9;
        },

        // Maintains Zoom
        maintainZoom: function() {
            if (window.desired_gsc !== undefined) {
                window.gsc = window.desired_gsc;
            }
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function(url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
			window.ii.onload();
        },

        // Draw a rectangle on the canvas.
        drawRect: function(rect, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;

            var context = window.mc.getContext('2d');
            var lc = canvasUtil.mapToCanvas({
                x: rect.x,
                y: rect.y
            });

            context.save();
            context.globalAlpha = alpha;
            context.strokeStyle = color;
            context.rect(lc.x, lc.y, rect.width * window.gsc, rect.height * window.gsc);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a circle on the canvas.
        drawCircle: function(circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var context = window.mc.getContext('2d');
            var drawCircle = canvasUtil.circleMapToCanvas(circle);

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.arc(drawCircle.x, drawCircle.y, drawCircle.radius, 0, Math.PI * 2);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {String|CanvasGradient|CanvasPattern} color
        // @param {boolean} fill
        // @param {number} alpha
        drawAngle: function(start, angle, arcradius, color, fill, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2, arcradius * window.gsc, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a line on the canvas.
        drawLine: function(p1, p2, color, width) {
            if (width === undefined) width = 5;

            var context = window.mc.getContext('2d');
            var dp1 = canvasUtil.mapToCanvas(p1);
            var dp2 = canvasUtil.mapToCanvas(p2);

            context.save();
            context.beginPath();
            context.lineWidth = width * window.gsc;
            context.strokeStyle = color;
            context.moveTo(dp1.x, dp1.y);
            context.lineTo(dp2.x, dp2.y);
            context.stroke();
            context.restore();
        },

        // Given the start and end of a line, is point left.
        isLeft: function(start, end, point) {
            return ((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;

        },

        // Get distance squared
        getDistance2: function(x1, y1, x2, y2) {
            var distance2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            return distance2;
        },

        getDistance2FromSnake: function(point) {
            point.distance = canvasUtil.getDistance2(window.snake.xx, window.snake.yy,
                point.xx, point.yy);
            return point;
        },

        // Check if point in Rect
        pointInRect: function(point, rect) {
            if (rect.x <= point.x && rect.y <= point.y &&
                rect.x + rect.width >= point.x && rect.y + rect.height >= point.y) {
                return true;
            }
            return false;
        },

        // Check if circles intersect
        circleIntersect: function(circle1, circle2, squareOnly) {
			if (squareOnly === undefined) squareOnly = false;

            var bothRadii = circle1.radius + circle2.radius;
            var dx = circle1.x - circle2.x;
            var dy = circle1.y - circle2.y;
			var distance2=0;

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (dx + bothRadii > 0 && dy + bothRadii > 0 &&
                dx - bothRadii < 0 && dy - bothRadii < 0) {
				if (!squareOnly)
					distance2 = canvasUtil.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (squareOnly||distance2 < bothRadii * bothRadii) {
                    if (window.visualDebugging) {
                        var collisionPointCircle = canvasUtil.circle(
                            ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) /
                            bothRadii,
                            ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) /
                            bothRadii,
                            5
                        );
                    }
                    return true;
                }
            }
            return false;
        }
    };
})();

var bot = window.bot = (function() {
    return {
		manualFood: false,
		targetAcceleration: 0,
		arcSize: Math.PI / 20,
		mGoToAngle: Math.PI,
		mouseFollow: false,
		predatorMode: false,
		lookForSnakeDelayCnt: 0,
		lookForSnakeDelay: 50,
		isHunting: false,
		targetSnake: 0,
		minPredatorRadius: 17,
        isBotRunning: false,
        isBotEnabled: true,
        lookForFood: false,
        collisionAngles: [],
        scores: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
        sectorBox: {},
        currentFood: {},
		foodAccelDist2: 200000,
		foodAccelSize: 150,
        foodFrames: 8,
		accelAngle: Math.PI / 2.5,
        opt: {
            // These are the bot's default options
            // If you wish to customise these, use
            // customBotOptions above
			radiusMult: 10,
            targetFps: 30,

            foodRoundSize: 5,
            foodRoundAngle: Math.PI / 8,
            foodSmallSize: 10,
            rearHeadAngle: 3 * Math.PI / 4,
            rearHeadDir: Math.PI / 2,
            radiusApproachSize: 5,
            radiusAvoidSize: 25
        },
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,
		pingtime: '',
		checktime: 0,
		pingDelay: 0,

        getSnakeWidth: function(sc) {
            if (sc === undefined) sc = window.snake.sc;
            return Math.round(sc * 29.0);
        },

        quickRespawn: function() {
            window.dead_mtm = 0;
            window.login_fr = 0;

            bot.isBotRunning = false;
            window.forcing = true;
            window.connect();
            window.forcing = false;
        },

        indexBetween: function(i1, i2) {
			var iDiff = i2 - i1;
            if (iDiff > (2 * Math.PI) / bot.arcSize /2) 
				iDiff = iDiff - (2 * Math.PI) / bot.arcSize;
			else if (iDiff < -(2 * Math.PI) / bot.arcSize /2) 
				iDiff = (2 * Math.PI) / bot.arcSize - iDiff;

            return iDiff;
        },		
		
		
		calcAcceleration: function(a) {
					var tAccel = 1;
					var sang = window.snake.ehang;
					var aIndex1 = bot.getAngleIndex(sang);
					var aIndex2 = bot.getAngleIndex(a);
					
					if ((bot.collisionAngles[aIndex1] !== undefined && bot.collisionAngles[aIndex1].distance < Math.pow(bot.headCircleRadius * 2.5, 2)))
					{
						return (bot.defaultAccel);					
					}
					if (bot.fencingSnake)
						return 1;
					
					var turnDir = bot.indexBetween(aIndex1, aIndex2);
					
					if ( Math.abs(turnDir) < bot.accelAngle / bot.arcSize)
					{
					
						
						if (turnDir < 0) 
							turnDir = -1;
						else
							turnDir = 1;
					
						var aIndex = aIndex1;
						while ((aIndex !== aIndex2 && aIndex1 !== aIndex2 || aIndex1 === aIndex2 && aIndex === aIndex1))
						{
							if ((bot.collisionAngles[aIndex] !== undefined && bot.collisionAngles[aIndex].distance < Math.pow(bot.headCircleRadius * 2.5, 2)))
							{
								tAccel = bot.defaultAccel;
							}
							aIndex = aIndex + turnDir;
							if (aIndex1 !== aIndex2)
							{
								if (aIndex < 0) aIndex = (2 * Math.PI) / bot.arcSize - 1;
								if (aIndex > (2 * Math.PI) / bot.arcSize ) aIndex = 0;
							}
						}
						
					}
					else
						tAccel = bot.defaultAccel;
						
					return (tAccel);
		},
		
        // angleBetween - get the smallest angle between two angles (0-pi)
        angleBetween: function(a1, a2) {
            var r1 = Math.abs(a2-a1);
			if (r1 > Math.PI) r1 = 2 * Math.PI - r1;

            return r1;
        },

		

        // Change heading by ang
        // +0-pi turn left
        // -0-pi turn right

        changeHeading: function(angle) {
            var heading = {
                x: window.snake.xx + 500 * bot.cos,
                y: window.snake.yy + 500 * bot.sin
            };

            var cos = Math.cos(-angle);
            var sin = Math.sin(-angle);

            window.goalCoordinates = {
                x: Math.round(
                    cos * (heading.x - window.snake.xx) -
                    sin * (heading.y - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (heading.x - window.snake.xx) +
                    cos * (heading.y - window.snake.yy) + window.snake.yy)
            };

            canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
        },

        // Avoid collision with gotoAngle
        avoidCollision: function() {

				var headCircleRadius2 = Math.pow(bot.headCircleRadius, 2);

				if (!bot.predatorMode && (bot.targetAcceleration !== 1 && bot.speedMult > 1.9 && (bot.frontCollision ===0 || bot.frontCollision > headCircleRadius2 * 4)) )
				{
					return; 
				}

				window.goalCoordinates = {
										x: Math.round(window.snake.xx+bot.fullHeadCircleRadius*Math.cos(bot.gotoAngle)),
										y: Math.round(window.snake.yy+bot.fullHeadCircleRadius*Math.sin(bot.gotoAngle))
				};

				canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));

				
				return;
				
				

        },


        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function(collisionPoint, ang) {
            if (ang === undefined || ang > Math.PI) {
                ang = Math.PI;
            }

            var end = {
                x: window.snake.xx + 2000 * bot.cos,
                y: window.snake.yy + 2000 * bot.sin
            };

            if (window.visualDebugging) {
                canvasUtil.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy
                },
                    end,
                    'orange', 5);
                canvasUtil.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy
                }, {
                    x: collisionPoint.xx,
                    y: collisionPoint.yy
                },
                    'red', 5);
            }

            var cos = Math.cos(ang);
            var sin = Math.sin(ang);

            if (canvasUtil.isLeft({
                x: window.snake.xx,
                y: window.snake.yy
            }, end, {
                x: collisionPoint.xx,
                y: collisionPoint.yy
            })) {
                sin = -sin;
            }

            window.goalCoordinates = {
                x: Math.round(
                    cos * (collisionPoint.xx - window.snake.xx) -
                    sin * (collisionPoint.yy - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (collisionPoint.xx - window.snake.xx) +
                    cos * (collisionPoint.yy - window.snake.yy) + window.snake.yy)
            };

            canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
        },

        // Sorting by  property 'distance'
        sortDistance: function(a, b) {
            return a.distance - b.distance;
        },

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function(angle) {
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            index = Math.round(angle * (1 / bot.arcSize));

            if (index === (2 * Math.PI) / bot.arcSize) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function(sp) {
            var ang = canvasUtil.fastAtan2(
                (sp.yy - window.snake.yy),
                (sp.xx - window.snake.xx));
            var aIndex = bot.getAngleIndex(ang);
			sp.aIndex=aIndex;	
			
            var actualDistance = (Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (bot.collisionAngles[aIndex] === undefined) {
                bot.collisionAngles[aIndex] = {
                    ang:  bot.arcSize * aIndex,
                    snake: sp.snake,
                    distance: actualDistance,
					isHead: sp.isHead
                };
            } else if (bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex].snake = sp.snake;
                bot.collisionAngles[aIndex].distance = actualDistance;
				bot.collisionAngles[aIndex].isHead = sp.isHead;
            }
        },

		//search snake to be hunted
		calcHuntTargetPoint: function() {
				var snake = bot.targetSnake;
                if (window.snakes[snake] !== undefined &&
                    window.snakes[snake].alive_amt === 1) {	

					scPoint = {
						xx: window.snakes[snake].xx,
						yy: window.snakes[snake].yy,
						snake: snake,
						radius: 1,
					};
					canvasUtil.getDistance2FromSnake(scPoint);
					var toSankeAng = canvasUtil.fastAtan2(
						window.snakes[snake].yy-window.snake.yy , window.snakes[snake].xx-window.snake.xx);
					var relAng = Math.abs(bot.angleBetween(window.snakes[snake].ang, toSankeAng));
					
					var offset=Math.sqrt(scPoint.distance) * (relAng+1) / (3 * bot.speedMult);
					var goalCoordinates = {
											x: (window.snakes[snake].xx+offset*Math.cos(window.snakes[snake].ang)),
											y: (window.snakes[snake].yy+offset*Math.sin(window.snakes[snake].ang))
					};
	
					var toPointAng = canvasUtil.fastAtan2(
						goalCoordinates.y-window.snake.yy , goalCoordinates.x-window.snake.xx);
					
					var aIndex = bot.getAngleIndex(toPointAng);
					
					if (bot.collisionAngles[aIndex] === undefined)
					{
						canvasUtil.drawCircle(canvasUtil.circle(
							goalCoordinates.x,
							goalCoordinates.y,
							30),
						'red', true);
						bot.currentFood=goalCoordinates;
						return;
					}
					
					var fullHeadCircleRadius2 = Math.pow(bot.fullHeadCircleRadius, 2);


					if (bot.collisionAngles[aIndex].distance > fullHeadCircleRadius2)
					{
						canvasUtil.drawCircle(canvasUtil.circle(
							goalCoordinates.x,
							goalCoordinates.y,
							30),
						'red', true);
					
						bot.currentFood=goalCoordinates;
						return;
					}


	
	
						
					
					
				}

				bot.isHunting=false;
				bot.targetSnake=0;				
				
		
		},
		
		//search snake to be hunted
		getTargetSnake: function() {

			var scPoint;
			var huntCircleRadius2 = Math.pow(bot.fullHeadCircleRadius * 1.5, 2);
			var minHuntCircleRadius2 = Math.pow(bot.headCircleRadius * 1.5, 2);
            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
			
                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

					if (window.snakes[snake].sc > 0.2 && window.snakes[snake].sp < 8)
					{
					
						
						var toSankeAng = canvasUtil.fastAtan2(
							window.snakes[snake].yy-window.snake.yy , window.snakes[snake].xx-window.snake.xx);

						scPoint = {
							xx: window.snakes[snake].xx,
							yy: window.snakes[snake].yy,
							snake: snake,
							radius: 1,
						};
						canvasUtil.getDistance2FromSnake(scPoint);

						if (scPoint.distance < huntCircleRadius2 && scPoint.distance > minHuntCircleRadius2 && Math.abs(bot.angleBetween(window.snake.ehang, toSankeAng)) < Math.PI /2  ) {
							var relAng = Math.abs(bot.angleBetween(window.snakes[snake].ang, toSankeAng));
						
							if (relAng > Math.PI / 10 && relAng < Math.PI / 1.7) {
								bot.targetSnake=snake;
							
								if (window.visualDebugging && true) {
									canvasUtil.drawCircle(canvasUtil.circle(
											scPoint.xx,
											scPoint.yy,
											scPoint.radius*3),
										'red', true);
								}
								
								
								
								return true;
							}
						}
					}
				}
			
			
			}
			bot.targetSnake=0;
			return false;
		
		},
		
		
        // Get closest collision point per snake.
        getCollision: function() {
            
			var scPoint;
			var pts, i;
			var collisionPoint;

            bot.collisionAngles = [];
			var headCircleRadius2 = Math.pow(bot.headCircleRadius, 2);
			var fullHeadCircleRadius2 = Math.pow(bot.fullHeadCircleRadius, 2);
			
			bot.fencingSnake=false;
			var escape_ang=-1;
			var snake_minX = window.snake.xx;
			var snake_maxX = window.snake.xx;
			var snake_minY = window.snake.yy;
			var snake_maxY = window.snake.yy;
			var predictMove=true;

			for (pts = 0, lp = window.snake.pts.length; pts < lp; pts++) {
				if (!window.snake.pts[pts].dying)
				{
					if (window.snake.pts[pts].xx < snake_minX) snake_minX = window.snake.pts[pts].xx;
					if (window.snake.pts[pts].xx > snake_maxX) snake_maxX = window.snake.pts[pts].xx;
					if (window.snake.pts[pts].yy < snake_minY) snake_minY = window.snake.pts[pts].yy;
					if (window.snake.pts[pts].yy > snake_maxY) snake_maxY = window.snake.pts[pts].yy;
				}
			}
            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;
				var fencingAngles = [];

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

					
                    scPoint = {
                        xx: window.snakes[snake].xx,
                        yy: window.snakes[snake].yy,
                        snake: snake,
                        radius: bot.getSnakeWidth(window.snakes[snake].sc) / 2,
						isHead: window.snakes[snake].sp
                    };
                    canvasUtil.getDistance2FromSnake(scPoint);
					if (scPoint.distance < fullHeadCircleRadius2) {
					
						bot.addCollisionAngle(scPoint);
						fencingAngles[scPoint.aIndex]= 1;
						if (window.visualDebugging && false) {
							canvasUtil.drawCircle(canvasUtil.circle(
									scPoint.xx,
									scPoint.yy,
									scPoint.radius),
								'red', false);
						}
					if (scPoint.distance < headCircleRadius2 || (bot.targetSnake !== 0)) predictMove=false;	
						if (predictMove)
						{
							
							var snakesp=Math.round((window.snakes[snake].sp+2) * (bot.snakeRadius+30)  / 200) + 1;
							var sncos = Math.cos(window.snakes[snake].ang);
							var snsin = Math.sin(window.snakes[snake].ang);
							var snradius=(bot.getSnakeWidth(window.snakes[snake].sc) +100)/ 30;
							for (var snp = 1; snp < snakesp; snp++) {

								collisionPoint = {
									xx: window.snakes[snake].xx + (snradius)*snp * sncos*6,
									yy: window.snakes[snake].yy+ (snradius)*snp * snsin*6,
									snake: snake,
									radius: (snradius+10) * (snp),
									isHead: window.snakes[snake].sp
								};

								if (window.visualDebugging && true) {
									canvasUtil.drawCircle(canvasUtil.circle(
											collisionPoint.xx,
											collisionPoint.yy,
											collisionPoint.radius),
										'red', false);
								}
								canvasUtil.getDistance2FromSnake(collisionPoint);
								bot.addCollisionAngle(collisionPoint);
								fencingAngles[collisionPoint.aIndex]= 1;

							}
						}
					}

					var snakes_minX = window.snakes[snake].xx;
					var snakes_maxX = window.snakes[snake].xx;
					var snakes_minY = window.snakes[snake].yy;
					var snakes_maxY = window.snakes[snake].yy;
					
						
					
                    for (pts = 0, lp = window.snakes[snake].pts.length; pts < lp; pts++) {
                        if (!window.snakes[snake].pts[pts].dying){
/*						&&
                            canvasUtil.pointInRect({
                                x: window.snakes[snake].pts[pts].xx,
                                y: window.snakes[snake].pts[pts].yy
                            }, bot.sectorBox)) {
						

*/						

							if (window.snakes[snake].pts[pts].xx < snakes_minX) snakes_minX = window.snakes[snake].pts[pts].xx;
							if (window.snakes[snake].pts[pts].xx > snakes_maxX) snakes_maxX = window.snakes[snake].pts[pts].xx;
							if (window.snakes[snake].pts[pts].yy < snakes_minY) snakes_minY = window.snakes[snake].pts[pts].yy;
							if (window.snakes[snake].pts[pts].yy > snakes_maxY) snakes_maxY = window.snakes[snake].pts[pts].yy;

							collisionPoint = {
                                xx: window.snakes[snake].pts[pts].xx,
                                yy: window.snakes[snake].pts[pts].yy,
                                snake: snake,
                                radius: bot.getSnakeWidth(window.snakes[snake].sc) / 2,
								isHead: 0
                            };
/*
                            if (window.visualDebugging && true) {
                                canvasUtil.drawCircle(canvasUtil.circle(
                                        collisionPoint.xx,
                                        collisionPoint.yy,
                                        collisionPoint.radius),
                                    '#00FF00', false);
                            }
*/							
                            canvasUtil.getDistance2FromSnake(collisionPoint);
                            bot.addCollisionAngle(collisionPoint);
							fencingAngles[collisionPoint.aIndex]= 1;

                            if (scPoint === undefined ||
                                scPoint.distance > collisionPoint.distance) {
                                scPoint = collisionPoint;
                            }
                        }
                    }
					var fencingAngleslength=0;
					
					for (i = 0; i < ((2 * Math.PI) / bot.arcSize); i++) {
									if (fencingAngles[i] !== undefined) {
										fencingAngleslength++;
									}
					}					
					
					if (fencingAngleslength > (2 * Math.PI / bot.arcSize) * 0.55 || (fencingAngleslength > (2 * Math.PI / bot.arcSize) * 0.43 && (snakes_minX < snake_minX && snakes_maxX > snake_maxX && snakes_maxY > snake_maxY && snakes_minY < snake_minY)))
					{
						if (fencingAngleslength !== (2 * Math.PI / bot.arcSize))
						{
							bot.fencingSnake = true;
							for (i = 0; i < ((2 * Math.PI) / bot.arcSize); i++) {
											if (fencingAngles[i] !== undefined) {										
												bot.collisionAngles[i].distance=Math.min(headCircleRadius2 * 3,bot.collisionAngles[i].distance);
											}
							}
						}
					}
					
					
                }
/*				
                if (scPoint !== undefined) {
                    if (window.visualDebugging  && false) {
                        canvasUtil.drawCircle(canvasUtil.circle(
                            scPoint.xx,
                            scPoint.yy,
                            scPoint.radius
                        ), 'red', false);
                    }
                }
*/
            }

            // WALL
            if (canvasUtil.getDistance2(bot.MID_X, bot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(bot.MAP_R - 2000, 2)) {
                var midAng = canvasUtil.fastAtan2(
                    window.snake.yy - bot.MID_X, window.snake.xx - bot.MID_Y);
					
				for (i = -6; i < 7; i++) {
					
					scPoint = {
						xx: bot.MID_X + bot.MAP_R * Math.cos(midAng + i * 0.01),
						yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng + i * 0.01),
						snake: -1,
						radius: bot.snakeWidth,
						isHead: 0
					};
					
					canvasUtil.getDistance2FromSnake(scPoint);
					bot.addCollisionAngle(scPoint);
					
					if (window.visualDebugging) {
						canvasUtil.drawCircle(canvasUtil.circle(
							scPoint.xx,
							scPoint.yy,
							scPoint.radius
						), 'yellow', false);
					}
				}
				
            }

			var midCollisionAngle_x=window.snake.xx;
			var midCollisionAngle_y=window.snake.yy;

			var sang = window.snake.ehang;
			var isang = bot.getAngleIndex(sang);
			var minHeadDist2 = Math.pow(bot.headCircleRadius, 2);
			var frontArcRadius2 = Math.pow(bot.frontArcRadius, 2);
			var headCircleRadius22 = Math.pow(bot.headCircleRadius * 2, 2);

			if (bot.collisionAngles[isang] !== undefined && (bot.collisionAngles[isang].distance < frontArcRadius2)) {
				bot.frontCollision = bot.collisionAngles[isang].distance;	
				bot.isCollision = true;
			}
			
			{				
				for (i = 0; i < ((2 * Math.PI) / bot.arcSize); i++) {


					if (bot.collisionAngles[i] !== undefined) {
						if (bot.collisionAngles[i].distance < fullHeadCircleRadius2) {

							

							var frontHeadDist2 = 0;
							var iDiff=Math.abs(bot.indexBetween(isang, i));
							
							

							if (bot.collisionAngles[i].distance < minHeadDist2 || !bot.predatorMode && bot.collisionAngles[i].distance < minHeadDist2 * bot.speedMult *bot.speedMult*4/ (iDiff * iDiff/2+4)) { //|| bot.collisionAngles[i].isHead > 0 && iDiff < ( Math.PI / bot.arcSize / 2 ) && (bot.collisionAngles[i].distance < headCircleRadius22 / 2 )) {

								bot.isCollision = true;
								bot.isHeadCollision = (bot.collisionAngles[i].isHead > 0);
								if (window.visualDebugging ) {
										if (bot.isHeadCollision) {
											canvasUtil.drawLine({
													x: window.snake.xx,
													y: window.snake.yy
												}, {
													x: window.snake.xx + Math.sqrt(bot.collisionAngles[i].distance) * Math.cos(bot.collisionAngles[i].ang),
													y: window.snake.yy + Math.sqrt(bot.collisionAngles[i].distance) * Math.sin(bot.collisionAngles[i].ang)
												},
											'yellow', 2);
										}
										else {
											canvasUtil.drawLine({
													x: window.snake.xx,
													y: window.snake.yy
												}, {
													x: window.snake.xx + Math.sqrt(bot.collisionAngles[i].distance) * Math.cos(bot.collisionAngles[i].ang),
													y: window.snake.yy + Math.sqrt(bot.collisionAngles[i].distance) * Math.sin(bot.collisionAngles[i].ang)
												},
											'red', 2);
										}
								}
							}
							else {
								if (window.visualDebugging ) {
									if (bot.fencingSnake) {
										canvasUtil.drawLine({
												x: window.snake.xx,
												y: window.snake.yy
											}, {
												x: window.snake.xx + Math.sqrt(bot.collisionAngles[i].distance) * Math.cos(bot.collisionAngles[i].ang),
												y: window.snake.yy + Math.sqrt(bot.collisionAngles[i].distance) * Math.sin(bot.collisionAngles[i].ang)
											},
										'red', 2);								
									}
									else {
										canvasUtil.drawLine({
												x: window.snake.xx,
												y: window.snake.yy
											}, {
												x: window.snake.xx + Math.sqrt(bot.collisionAngles[i].distance) * Math.cos(bot.collisionAngles[i].ang),
												y: window.snake.yy + Math.sqrt(bot.collisionAngles[i].distance) * Math.sin(bot.collisionAngles[i].ang)
											},
										'white', 0.5);
									}
								}
							}
							var angleScore = fullHeadCircleRadius2 * fullHeadCircleRadius2 / bot.collisionAngles[i].distance / bot.collisionAngles[i].distance;
							midCollisionAngle_x += Math.cos(bot.collisionAngles[i].ang) * angleScore;
							midCollisionAngle_y += Math.sin(bot.collisionAngles[i].ang) * angleScore;

						}
					}

					
				}
			}
			
			if (midCollisionAngle_x === window.snake.xx && midCollisionAngle_y === window.snake.yy)
			{
                var midlAng = canvasUtil.fastAtan2(
                    bot.MID_Y-window.snake.yy , bot.MID_X-window.snake.xx);
					
				
				if ((Math.pow(window.snake.yy - bot.MID_Y,2) + Math.pow(window.snake.xx - bot.MID_X,2)) < Math.pow(bot.snakeRadius * bot.MAP_R/100,2)) {
					midlAng = midlAng + Math.PI / 2;
				}
				
				var diffA = bot.indexBetween(bot.getAngleIndex(bot.gotoAngle),bot.getAngleIndex(midlAng));
				
				if (Math.abs(diffA)>2)
				{
					if (diffA>0) 
						bot.gotoAngle=bot.gotoAngle+0.02;
					else
						bot.gotoAngle=bot.gotoAngle-0.02;
					
					
				}
				else
					bot.gotoAngle = midlAng;
			}
			else
			{
				bot.gotoAngle = canvasUtil.fastAtan2(window.snake.yy - midCollisionAngle_y, window.snake.xx - midCollisionAngle_x);
				bot.gotoScore=3;
			}
        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function() {

			bot.headCircleRadius = bot.opt.radiusMult * (bot.snakeRadius) / 1.8;
			if (bot.predatorMode) bot.headCircleRadius=bot.headCircleRadius*1.2;
			bot.frontArcAngle = bot.arcSize;
			bot.frontArcRadius = bot.speedMult * bot.headCircleRadius * 1.2 ;
			if (bot.targetSnake) bot.frontArcRadius=bot.headCircleRadius;
			bot.fullHeadCircleRadius = bot.headCircleRadius * 3;
			
			bot.isCollision = false;
			bot.fencingSnake = false;
			bot.isHeadCollision = false;
			bot.frontCollision = 0;
            
			bot.gotoScore=1;
			var startTime = (new Date()).getTime();
			bot.getCollision();
			var endTime = (new Date()).getTime();
			bot.checktime=(endTime - startTime);
			
			var sang = window.snake.ehang;
			
            if (window.visualDebugging) {
				var headCircle = canvasUtil.circle(
					window.snake.xx,
					window.snake.yy,
					bot.headCircleRadius
				);
			
				var headCircleSpeed = canvasUtil.circle(
					window.snake.xx + Math.cos(sang) * (bot.speedMult-1)*bot.headCircleRadius,
					window.snake.yy + Math.sin(sang) * (bot.speedMult-1)*bot.headCircleRadius,
					bot.headCircleRadius
				);

				if (bot.isCollision) {
					canvasUtil.drawCircle(headCircle, 'red', false);
					if (!bot.predatorMode)
						canvasUtil.drawCircle(headCircleSpeed, 'red', false);
				}
				else {
					canvasUtil.drawCircle(headCircle, 'blue', false);
					if (!bot.predatorMode)
						canvasUtil.drawCircle(headCircleSpeed, 'blue', false);
				}
				
				if (bot.frontCollision > 0) {
					canvasUtil.drawAngle(sang-bot.frontArcAngle/2, sang+bot.frontArcAngle/2, bot.frontArcRadius, 'red', true);
				}
				else {
					canvasUtil.drawAngle(sang-bot.frontArcAngle/2, sang+bot.frontArcAngle/2, bot.frontArcRadius, 'white', false);
				}

				var minHeadDist2 = Math.pow(bot.headCircleRadius, 2);

/*
				var la;
				for (var lm = 0; lm < 18; lm++)
				{	
					la=Math.sqrt(minHeadDist2 * bot.speedMult *bot.speedMult * 4 / (lm *lm/2+4));
					canvasUtil.drawAngle(sang+bot.frontArcAngle/2 * (lm * 2-1), sang+bot.frontArcAngle/2*(lm*2+1), la, 'blue', false);
				}
*/				
				var fullHeadCircle = canvasUtil.circle(
					window.snake.xx, window.snake.yy,
					bot.fullHeadCircleRadius
				);
				
				if (bot.fencingSnake) {
				canvasUtil.drawCircle(fullHeadCircle, 'red', false);
				}
				else {
				canvasUtil.drawCircle(fullHeadCircle, 'gray', false);
				}
            }
            if (bot.isCollision || bot.fencingSnake) {
				
				var tAccel = bot.defaultAccel;

				if ((bot.isHeadCollision|| bot.fencingSnake))
					tAccel = bot.calcAcceleration(bot.gotoAngle);
				bot.targetAcceleration = tAccel;
				window.setAcceleration(tAccel);	
				
				bot.avoidCollision();
                return true;
			}
			return false;
        },

        sortScore: function(a, b) {
            return b.score - a.score;
        },

        // Round angle difference up to nearest foodRoundAngle degrees.
        // Round food up to nearest foodRoundsz, square for distance^2
        scoreFood: function(f) {
            f.score = Math.pow(Math.ceil(f.sz / bot.opt.foodRoundSize) * bot.opt.foodRoundSize, 2) /
                f.distance / (Math.ceil(f.da / bot.opt.foodRoundAngle) * bot.opt.foodRoundAngle) / (Math.ceil(f.gotoda / bot.opt.foodRoundAngle) * bot.opt.foodRoundAngle);
        },

        computeFoodGoal: function() {
            
			var foodAngles = [];
			var foodWeights = [];
			
			var sx = window.snake.xx;
			var sy = window.snake.yy;
			var headCircleRadius2 = Math.pow(bot.headCircleRadius, 2);
			var fullHeadCircleRadius22 = Math.pow(bot.fullHeadCircleRadius * 2, 2);


            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var a;
                var da;
                var gotoda;
				var f = window.foods[i];
				var cx = f.xx;
				var cy = f.yy;
				var distance = canvasUtil.getDistance2(cx, cy, sx, sy);
                var sang = window.snake.ehang;
                var csz = f.sz;
					
				
				
                if (!f.eaten && (distance < fullHeadCircleRadius22 || csz > 10) ) {
							
							
							

                    
					
					a = canvasUtil.fastAtan2(cy - sy, cx - sx);
					var aIndex = bot.getAngleIndex(a);
                    da = Math.min((2 * Math.PI) - Math.abs(a - sang), Math.abs(a - sang));
                    gotoda = Math.min((2 * Math.PI) - Math.abs(a - bot.gotoAngle), Math.abs(a - bot.gotoAngle));	
					
					if (bot.collisionAngles[aIndex] === undefined || distance < bot.collisionAngles[aIndex].distance - headCircleRadius2 / 6)
					{
						if (foodAngles[aIndex] === undefined) {
							foodWeights[aIndex] = csz;
							foodAngles[aIndex] = 10 * csz / (Math.abs(Math.sqrt(distance ))+100) ;
						}
						else {
							foodAngles[aIndex] += 10 * csz / (Math.abs(Math.sqrt(distance ))+100) ;
							foodWeights[aIndex] += csz;
						}
					}

                }
            }

	
			var foodWeight = 0;
			var foodAindex = 0;
			var fw=0;
			for (i = 0; i < (2 * Math.PI) / bot.arcSize; i++) {
			

				var n1=i-1;
				var n2=i+1;
				if (n1===-1) n1=(2 * Math.PI) / bot.arcSize;
				if (n2===(2 * Math.PI) / bot.arcSize) n2=0;
				var nw=0;
				if (foodAngles[n1] !== undefined) nw=foodAngles[n1];
				if (foodAngles[n1] !== undefined) nw+=foodAngles[n2];
				
				if (foodAngles[i] !== undefined) {
						a = bot.arcSize * i;
						//da = Math.min((2 * Math.PI) - Math.abs(a - sang), Math.abs(a - sang));
						gotoda = Math.abs(bot.indexBetween(i, bot.getAngleIndex(bot.gotoAngle)));	
				
						fw = (foodAngles[i] + nw/2) / ( gotoda * bot.gotoScore + 10) / 5;
						if (fw > foodWeight)
						{
							foodWeight=fw;
							foodAindex = i;
						}
					
				}

				
			}
			if (foodWeight === 0)
			{
				bot.currentFood = {
					x: bot.MID_X,
					y: bot.MID_Y,
					sz: 0,
					ang: 0,
					foodAindex: 0
				};			
				return;
			}
			var foodAngle = bot.arcSize * foodAindex;
			
			
            bot.currentFood = {
                x: sx + bot.fullHeadCircleRadius * Math.cos(foodAngle),
                y: sy + bot.fullHeadCircleRadius * Math.sin(foodAngle),
				sz: foodWeights[foodAindex],
				ang: foodAngle,
				aIndex: foodAindex
            };			
			return;
			
        },

        foodAccel: function() {
		
			if (bot.predatorMode && bot.snakeRadius > bot.minPredatorRadius) return 1;
            if (bot.currentFood && bot.currentFood.sz > bot.foodAccelSize) {			
					var tAccel = bot.calcAcceleration(bot.currentFood.ang);
					
					return tAccel;
				
            }

            return bot.defaultAccel;
        },

        every: function() {
		

			
            bot.MID_X = window.grd;
            bot.MID_Y = window.grd;
            bot.MAP_R = window.grd * 0.98;

            bot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            bot.sectorBox = canvasUtil.rect(
                window.snake.xx - (bot.sectorBoxSide / 2),
                window.snake.yy - (bot.sectorBoxSide / 2),
                bot.sectorBoxSide, bot.sectorBoxSide);
            // if (window.visualDebugging) canvasUtil.drawRect(bot.sectorBox, '#c0c0c0', true, 0.1);

            bot.cos = Math.cos(window.snake.ang);
            bot.sin = Math.sin(window.snake.ang);

            bot.speedMult = window.snake.sp / 5.78;
            bot.snakeRadius = bot.getSnakeWidth() / 2;
            bot.snakeWidth = bot.getSnakeWidth();

            bot.sidecircle_r = canvasUtil.circle(
                window.snake.lnp.xx -
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );

            bot.sidecircle_l = canvasUtil.circle(
                window.snake.lnp.xx +
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy -
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );
        },

        // Main bot
        go: function() {
            bot.every();
            if (bot.checkCollision()) {
                bot.lookForFood = false;
				bot.isHunting=false;
				bot.targetSnake=0;
                if (bot.foodTimeout) {
                    window.clearTimeout(bot.foodTimeout);
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.foodFrames * 2);
                }
            } else {
			

				//if mousefollow on
				if(bot.mouseFollow){
					bot.gotoAngle = bot.mGoToAngle;
				}
                bot.lookForFood = !bot.manualFood;
                if (bot.foodTimeout === undefined) {
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.foodFrames);
                }
				
				if (bot.manualFood)
					window.setAcceleration(bot.defaultAccel);				
				else
				{
				
					if (bot.predatorMode)
					{
							if (bot.currentFood && bot.currentFood.sz > bot.foodAccelSize * 2) {
								bot.lookForSnakeDelayCnt = 0;
								bot.isHunting=false;
								bot.targetSnake=0;
							}	

							if (bot.snakeRadius > bot.minPredatorRadius)
								bot.lookForSnakeDelayCnt++;
							else
							{
								bot.lookForSnakeDelayCnt = 0;
								bot.isHunting=false;							
							}
								
							if (bot.lookForSnakeDelayCnt>bot.lookForSnakeDelay) {
								var huntCircle = canvasUtil.circle(
									window.snake.xx, window.snake.yy,
									bot.fullHeadCircleRadius * 1.5
								);
								
								if (bot.targetSnake === 0)
									bot.isHunting=bot.getTargetSnake();
									
								if (bot.targetSnake !== 0)	
									bot.calcHuntTargetPoint();	
									
								var sang = window.snake.ehang;
	

								if (bot.isHunting)
								{
									canvasUtil.drawAngle(sang-Math.PI/2, sang+Math.PI/2, bot.fullHeadCircleRadius * 1.5, 'yellow', false);
									canvasUtil.drawAngle(sang-Math.PI/2, sang+Math.PI/2, bot.headCircleRadius * 1.5, 'yellow', false);
								}
								else
								{
									canvasUtil.drawAngle(sang-Math.PI/2, sang+Math.PI/2, bot.fullHeadCircleRadius * 1.5, 'green', false);
									canvasUtil.drawAngle(sang-Math.PI/2, sang+Math.PI/2, bot.headCircleRadius * 1.5, 'green', false);
								}
									
							}
							
							
					}
				
				
					var tAccel = bot.foodAccel();
					window.setAcceleration(bot.foodAccel());
					bot.targetAcceleration = tAccel;
					
					window.goalCoordinates = bot.currentFood;
					canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
				}


				
				bot.pingDelay++;
                if (window.bso !== undefined && bot.pingDelay > 30) {
				
					bot.pingDelay=0;

					var startTime = (new Date()).getTime(),
						endTime;

					new userInterface.ping('ws://'+window.bso.ip + ':' + window.bso.po+'/slither', function (status, e) {
											endTime = (new Date()).getTime();
											bot.pingtime=(endTime - startTime);
											if (bot.pingtime<10) bot.pingtime=' '+bot.pingtime;


										});
					
				

				}
					

					
					
            }
			
			if (window.visualDebugging && !bot.manualFood) {
				canvasUtil.drawLine({
						x: window.snake.xx,
						y: window.snake.yy
					}, {
						x: window.snake.xx + bot.headCircleRadius * Math.cos(bot.gotoAngle) * 2,
						y: window.snake.yy + bot.headCircleRadius * Math.sin(bot.gotoAngle) * 2
					},
					'green');
				canvasUtil.drawLine({
						x: window.snake.xx + bot.headCircleRadius * Math.cos(bot.gotoAngle) * 2,
						y: window.snake.yy + bot.headCircleRadius * Math.sin(bot.gotoAngle) * 2
					}, {
						x: window.snake.xx + bot.headCircleRadius * Math.cos(bot.gotoAngle+0.2) * 1.7,
						y: window.snake.yy + bot.headCircleRadius * Math.sin(bot.gotoAngle+0.2) * 1.7
					},
					'green');
				canvasUtil.drawLine({
						x: window.snake.xx + bot.headCircleRadius * Math.cos(bot.gotoAngle) * 2,
						y: window.snake.yy + bot.headCircleRadius * Math.sin(bot.gotoAngle) * 2
					}, {
						x: window.snake.xx + bot.headCircleRadius * Math.cos(bot.gotoAngle-0.2) * 1.7,
						y: window.snake.yy + bot.headCircleRadius * Math.sin(bot.gotoAngle-0.2) * 1.7
					},
					'green');
			}

			
			
		},

        // Timer version of food check
        foodTimer: function() {
            if (window.playing && bot.lookForFood && !bot.manualFood &&
                window.snake !== null && window.snake.alive_amt === 1) {
                bot.computeFoodGoal();
            }
            bot.foodTimeout = undefined;
        }
    };
})();

var userInterface = window.userInterface = (function() {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;
    window.oef = function() {};
    window.redraw = function() {};

    return {
        overlays: {},
		
        initOverlays: function() {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);

            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);

            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);

            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '340px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);

            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function() {
            Object.keys(userInterface.overlays).forEach(function(okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },
        toggleLeaderboard: function() {
            window.leaderboard = !window.leaderboard;
            window.log('Leaderboard set to: ' + window.leaderboard);
            userInterface.savePreference('leaderboard', window.leaderboard);
            if (window.leaderboard) {
                // window.lbh.style.display = 'block';
                // window.lbs.style.display = 'block';
                // window.lbp.style.display = 'block';
                window.lbn.style.display = 'block';
            } else {
                // window.lbh.style.display = 'none';
                // window.lbs.style.display = 'none';
                // window.lbp.style.display = 'none';
                window.lbn.style.display = 'none';
            }
        },
        removeLogo: function() {
            if (typeof window.showlogo_iv !== 'undefined') {
                window.ncka = window.lgss = window.lga = 1;
                clearInterval(window.showlogo_iv);
                showLogo(true);
            }
        },
        // Save variable to local storage
        savePreference: function(item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },

        // Load a variable from local storage
        loadPreference: function(preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function() {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
            userInterface.onPrefChange();
        },

        // Preserve nickname
        saveNick: function() {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Hide top score
        hideTop: function() {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    bot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function() {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },

        onkeydown: function(e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
				 // Letter `M` for manually feeding
                if (e.keyCode === 77) {
                    bot.manualFood = !bot.manualFood;
                }
				 // Letter `N` to follow the mouse move while feed search
                if (e.keyCode === 78) {
                    bot.mouseFollow = !bot.mouseFollow;
                }
				 // Letter `P` to togle predator on/off
                if (e.keyCode === 80) {
                    bot.predatorMode = !bot.predatorMode;
                }
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    bot.isBotEnabled = !bot.isBotEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    window.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    window.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'G' to toggle leaderboard
                if (e.keyCode === 71) {
                    userInterface.toggleLeaderboard(!window.leaderboard);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    window.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'B' to prompt for a custom background url
                if (e.keyCode === 66) {
                    var url = null;
					var actbackground=window.ii.src.split('/').pop();
					if (actbackground === 'black' || actbackground ==='')
						url = prompt('Please enter a background url or let it empty to set default:');
					else
						url = prompt('Please enter a background url or let it empty for black background:');

					if (url !== null && url !== '') {
                        canvasUtil.setBackground(url);
                    }
					else if (actbackground == 'black' || actbackground==='')
					{
						
						canvasUtil.setBackground();
					}
					else
					{
						document.body.style.backgroundColor = "#000";
						canvasUtil.setBackground('black');
					}
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    bot.opt.radiusMult++;
                    window.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (bot.opt.radiusMult > 1) {
                        bot.opt.radiusMult--;
                        window.log(
                            'radiusMult set to: ' +
                            bot.opt.radiusMult);
                    }
                }
                // Letter 'D' to quick toggle collision radius
                if (e.keyCode === 68) {
                    if (bot.opt.radiusMult >
                        ((bot.opt.radiusAvoidSize - bot.opt.radiusApproachSize) /
                            2 + bot.opt.radiusApproachSize)) {
                        bot.opt.radiusMult = bot.opt.radiusApproachSize;
                    } else {
                        bot.opt.radiusMult = bot.opt.radiusAvoidSize;
                    }
                    window.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvasUtil.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                // Save nickname when you press "Enter"
                if (e.keyCode === 13) {
                    userInterface.saveNick();
                }
                userInterface.onPrefChange();
            }
        },

        onmousedown: function(e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        bot.defaultAccel = 1;
                        if (!bot.isBotEnabled) {
                            original_onmouseDown(e);
                        }
                        break;
                        // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        bot.isBotEnabled = !bot.isBotEnabled;
                        break;
                }
            } else {
                original_onmouseDown(e);
            }
            userInterface.onPrefChange();
        },

        onmouseup: function() {
            bot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function(mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Update stats overlay.
        updateStats: function() {
            var oContent = [];

            if (bot.scores.length === 0) return;

            var avg = Math.round(bot.scores.reduce(function (a, b) { return a + b.score; }, 0) /
                    (bot.scores.length));

            var median = Math.round((bot.scores[Math.floor((bot.scores.length - 1) / 2)].score +
                     bot.scores[Math.ceil((bot.scores.length - 1) / 2)].score) / 2);


            oContent.push('games played: ' + bot.scores.length);
            oContent.push('a: ' + avg +
                ' m: ' + median);

            for (var i = 0; i < bot.scores.length && i < 10; i++) {
                oContent.push(i + 1 + '. ' + bot.scores[i].score +
                    ' in ' + Math.round(bot.scores[i].duration / 1000) + 's');
            }

            userInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },
	 ping: function(ip, callback) {

		if (!this.inUse) {
			this.status = 'unchecked';
			this.inUse = true;
			this.callback = callback;
			this.ip = ip;
			var _that = this;
			this.img = new Image();
			this.img.onload = function () {
				_that.inUse = false;
				_that.callback('responded');

			};
			this.img.onerror = function (e) {
				if (_that.inUse) {
					_that.inUse = false;
					_that.callback('respondederr', e);
				}

			};
			this.start = new Date().getTime();
			this.img.src =  ip;
			this.timer = setTimeout(function () {
				if (_that.inUse) {
					_that.inUse = false;
					_that.callback('timeout');
				}
			}, 1500);
		}
	},
        onPrefChange: function() {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;

            oContent.push('version: ' + GM_info.script.version);
            oContent.push('[T / Right click] bot: ' + ht(bot.isBotEnabled));
            oContent.push('[O] mobile rendering: ' + ht(window.mobileRender));
            oContent.push('[A/S] radius multiplier: ' + bot.opt.radiusMult);
			oContent.push('[P] predator: ' + ht(bot.predatorMode));
			oContent.push('[N] mouse follow: ' + ht(bot.mouseFollow));
			oContent.push('[M] manually feed: ' + ht(bot.manualFood));
            oContent.push('[D] quick radius change ' +bot.opt.radiusApproachSize + '/' + bot.opt.radiusAvoidSize);
            oContent.push('[I] auto respawn: ' + ht(window.autoRespawn));
            oContent.push('[G] leaderboard overlay: ' + ht(window.leaderboard));
            oContent.push('[Y] visual debugging: ' + ht(window.visualDebugging));
            oContent.push('[H] overlays');
            oContent.push('[B] change background');
            oContent.push('[Mouse Wheel] zoom');
            oContent.push('[Q] quit to menu');
            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function() {
            // Botstatus overlay
            var oContent = [];

            if (window.playing && window.snake !== null) {
			

				oContent.push('fps: ' + userInterface.framesPerSecond.fps+' ping: '+bot.pingtime+'ms');
                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(window.snake.xx) || 0) + ' y: ' +
                    (Math.round(window.snake.yy) || 0));

                if (window.goalCoordinates) {
                    if (window.goalCoordinates.sz) {
                        oContent.push('target sz: ' + Math.round(window.goalCoordinates.sz));
                    }
                    else
						oContent.push('target');
                    oContent.push('x: ' + Math.round(window.goalCoordinates.x) + ' y: ' +
                        Math.round(window.goalCoordinates.y));
                }
                    oContent.push('check: ' + bot.checktime+'ms');
				
                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {

                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;


						
                }
            }

            userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');

            if (window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && bot.isBotEnabled && !bot.manualFood) {
                    var headCoord = {
                        x: window.snake.xx,
                        y: window.snake.yy
                    };
                    canvasUtil.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green');
                    canvasUtil.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },

        oefTimer: function() {
            var start = Date.now();
            canvasUtil.maintainZoom();
            original_oef();
            original_redraw();

            if (window.playing && bot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function(b) {
					if (bot.manualFood && !bot.isCollision) original_onmousemove();
					if (bot.mouseFollow){
					bot.mGoToAngle = canvasUtil.mouseAngle(b);
					}
				};
                bot.isBotRunning = true;
                bot.go();
            } else if (bot.isBotEnabled && bot.isBotRunning) {
                bot.isBotRunning = false;
                if (window.lastscore && window.lastscore.childNodes[1]) {
                    var score = parseInt(window.lastscore.childNodes[1].innerHTML);
                    var duration = Date.now() - bot.startTime;
                    bot.scores.push({
                        score: score,
                        duration: duration
                    });
                    bot.scores.sort(function(a, b) {
                        return b.score - a.score;
                    });
                    userInterface.updateStats();
                }

                if (window.autoRespawn) {
                    bot.startTime = Date.now();
					window.connect();
                }
            }

            if (!bot.isBotEnabled || !bot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            userInterface.onFrameUpdate();
            setTimeout(userInterface.oefTimer, (1000 / bot.opt.targetFps) - (Date.now() - start));
        },

        // Quit to menu
        quit: function() {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        // Update the relation between the screen and the canvas.
        onresize: function() {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvasUtil.canvasRatio = {
                x: window.mc.width / window.ww,
                y: window.mc.height / window.hh
            };
        },
        // Handles the text color of the bot preferences
        // enabled = green
        // disabled = red
        handleTextColor: function(enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})();

// Main
(function() {
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);
    window.onresize = userInterface.onresize;

    // Hide top score
    userInterface.hideTop();

    // Overlays
    userInterface.initOverlays();

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    userInterface.loadPreference('leaderboard', true);
    window.nick.value = userInterface.loadPreference('savedNick', 'Slither.io-bot');

    // Don't load saved options or apply custom options if
    // the user wants to use default options
    if (typeof(customBotOptions.useDefaults) !== 'undefined' && customBotOptions.useDefaults === true) {
        window.log('Ignoring saved / customised options per user request');
    } else {
        // Load saved options, if any
        var savedOptions = userInterface.loadPreference('options', null);
        if (savedOptions !== null) { // If there were saved options
            // Parse the options and overwrite the default bot options
            savedOptions = JSON.parse(savedOptions);
            if (Object.keys(savedOptions).length !== 0 && savedOptions.constructor === Object) {
                Object.keys(savedOptions).forEach(function(key) {
                    window.bot.opt[key] = savedOptions[key];
                });
            }
            window.log('Found saved settings, overwriting default bot options');
        } else {
            window.log('No saved settings, using default bot options');
        }

        // Has the user customised the options?
        if (Object.keys(customBotOptions).length !== 0 && customBotOptions.constructor === Object) {
            Object.keys(customBotOptions).forEach(function(key) {
                window.bot.opt[key] = customBotOptions[key];
            });
            window.log('Custom settings found, overwriting current bot options');
        }
    }

    // Save the bot options
    userInterface.savePreference('options', JSON.stringify(window.bot.opt));
    window.log('Saving current bot options');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvasUtil.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvasUtil.setZoom);

    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(true);
    } else {
        userInterface.toggleMobileRendering(false);
    }
    // Remove laggy logo animation
    userInterface.removeLogo();
    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    bot.startTime = Date.now();
    userInterface.oefTimer();
})();
