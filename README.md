# Hyperspace Shooter

A 3D space shooter game where you navigate through hyperspace, destroying asteroids with your photon torpedoes while avoiding collisions.

## How to Play

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge recommended)
2. Game Controls:
   - **Mouse**: Pan around and aim your ship
   - **Mouse Click/Hold**: Fire photon torpedoes
   - **WASD Keys**: Move ship up, left, down, and right

## Game Objective

- Destroy 25 asteroids to win the game
- Avoid colliding with asteroids - each collision reduces your health by 25%
- If your health reaches 0%, it's game over

## Features

- 3D space environment with hyperspace star effect
- Dynamic asteroid generation with increasing difficulty
- Realistic explosions and lighting effects
- Health and score HUD (Heads-Up Display)
- Spaceship with detailed design and engine glow
- Collision detection and physics

## Technical Details

This game is built with:
- HTML5
- CSS3
- JavaScript
- Three.js for 3D rendering

## Running Locally

Simply open the `index.html` file in your web browser. No server is required as the game uses ES modules and CDN resources.

## Development

The game structure consists of:
- `index.html`: Main HTML file with game container and HUD
- `game.js`: Core game logic, 3D rendering, and game mechanics
- CSS styling is included directly in the HTML file

## Credits

This game was created as a demonstration of Three.js capabilities for creating browser-based 3D games. It's inspired by classic space shooters and Star Wars hyperspace visual effects. 