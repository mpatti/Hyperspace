// Load Three.js from CDN
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading message once the game starts
    const loadingMessage = document.getElementById('loading');
    
    // Create script tag for Three.js
    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threeScript.onload = function() {
        // Hide loading once Three.js is loaded
        loadingMessage.style.display = 'none';
        initGame();
    };
    threeScript.onerror = handleError;
    document.head.appendChild(threeScript);
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Initialize game variables
    let scene, camera, renderer;
    let ship, shipLight;
    let asteroids = [];
    let torpedoes = [];
    let stars = [];
    let score = 0;
    let health = 100;
    let gameActive = true;
    let gameWon = false;
    let lastTime = 0;
    let asteroidSpawnInterval = 2000; // milliseconds
    let lastAsteroidSpawn = 0;
    let asteroidSpeedMultiplier = 1;
    let targetScore = 25;
    
    // Mouse control variables
    let mouse = { x: 0, y: 0 };
    let targetRotation = { x: 0, y: 0 };
    let mouseDown = false;
    
    // Keyboard controls
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false
    };
    
    // Mobile touch variables
    let joystickActive = false;
    let joystickPosition = { x: 0, y: 0 };
    let joystickCenter = { x: 0, y: 0 };
    let lastTorpedoTime = 0;
    
    // Initialize the game
    function initGame() {
        console.log("Three.js loaded successfully. Initializing game...");
        
        try {
            // Create scene
            scene = new THREE.Scene();
            
            // Create camera
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 5;
            
            // Create renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0x333333);
            scene.add(ambientLight);
            
            // Add directional light for shadows
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 5, 7);
            directionalLight.castShadow = true;
            scene.add(directionalLight);
            
            // Create spaceship
            createShip();
            
            // Position ship at the bottom middle of screen
            ship.position.set(0, -2.5, 0);
            
            // Create initial stars
            createStars();
            
            // Create initial asteroid
            createAsteroid();
            
            // Event listeners
            window.addEventListener('resize', onWindowResize);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mousedown', () => {
                mouseDown = true;
                if (gameActive && !gameWon) {
                    fireTorpedo();
                }
            });
            window.addEventListener('mouseup', () => mouseDown = false);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            
            // Mobile-specific setup
            if (isMobile) {
                setupMobileControls();
            }
            
            // Restart button events
            document.getElementById('restart-button').addEventListener('click', resetGame);
            document.getElementById('restart-button-win').addEventListener('click', resetGame);
            
            // Start animation loop
            animate(0);
            
            console.log("Game initialized successfully!");
        } catch (e) {
            handleError(e);
        }
    }
    
    // Set up mobile controls
    function setupMobileControls() {
        console.log("Setting up mobile controls");
        
        // Show mobile controls
        document.getElementById('mobile-controls').style.display = 'block';
        document.getElementById('mobile-controls-info').style.display = 'block';
        
        // Hide desktop controls info
        document.getElementById('controls-info').style.display = 'none';
        
        // Get joystick elements
        const joystickArea = document.getElementById('joystick-area');
        const joystick = document.getElementById('joystick');
        const fireButton = document.getElementById('fire-button');
        
        // Store initial joystick center position
        const joystickRect = joystickArea.getBoundingClientRect();
        joystickCenter.x = joystickRect.left + joystickRect.width / 2;
        joystickCenter.y = joystickRect.top + joystickRect.height / 2;
        
        // Joystick touch start event
        joystickArea.addEventListener('touchstart', function(event) {
            event.preventDefault();
            joystickActive = true;
            updateJoystickPosition(event.touches[0]);
        });
        
        // Joystick touch move event
        joystickArea.addEventListener('touchmove', function(event) {
            event.preventDefault();
            if (joystickActive) {
                updateJoystickPosition(event.touches[0]);
            }
        });
        
        // Joystick touch end event
        joystickArea.addEventListener('touchend', function(event) {
            event.preventDefault();
            joystickActive = false;
            
            // Reset joystick position
            joystick.style.transform = 'translate(-50%, -50%)';
            joystickPosition = { x: 0, y: 0 };
        });
        
        // Fire button event
        fireButton.addEventListener('touchstart', function(event) {
            event.preventDefault();
            if (gameActive && !gameWon) {
                fireTorpedo();
            }
        });
        
        // Function to update joystick position
        function updateJoystickPosition(touch) {
            // Calculate touch position relative to joystick center
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Calculate joystick displacement
            let dx = touchX - joystickCenter.x;
            let dy = touchY - joystickCenter.y;
            
            // Calculate distance from center
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Limit joystick movement radius
            const maxRadius = joystickArea.clientWidth / 2 - joystick.clientWidth / 2;
            if (distance > maxRadius) {
                dx = dx * maxRadius / distance;
                dy = dy * maxRadius / distance;
            }
            
            // Update joystick visual position
            joystick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            
            // Normalize joystick position for ship control (values between -1 and 1)
            joystickPosition.x = dx / maxRadius;
            joystickPosition.y = dy / maxRadius;
            
            // Update ship rotation based on joystick position
            targetRotation.y = joystickPosition.x * 0.5;
            targetRotation.x = joystickPosition.y * 0.5;
        }
    }
    
    // Reset game state
    function resetGame() {
        // Reset game state
        score = 0;
        health = 100;
        gameActive = true;
        gameWon = false;
        asteroidSpeedMultiplier = 1;
        asteroidSpawnInterval = 2000;
        
        // Reset mobile controls if on mobile
        if (isMobile) {
            joystickActive = false;
            joystickPosition = { x: 0, y: 0 };
            const joystick = document.getElementById('joystick');
            joystick.style.transform = 'translate(-50%, -50%)';
        }
        
        // Clear existing objects
        for (let i = asteroids.length - 1; i >= 0; i--) {
            scene.remove(asteroids[i].mesh);
        }
        for (let i = torpedoes.length - 1; i >= 0; i--) {
            scene.remove(torpedoes[i].mesh);
        }
        asteroids = [];
        torpedoes = [];
        
        // Update HUD
        document.getElementById('score').textContent = score;
        document.getElementById('health').textContent = health;
        document.getElementById('health-fill').style.width = health + '%';
        document.getElementById('health-fill').style.backgroundColor = '#0f0';
        
        // Hide game over/win screens
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('game-win').style.display = 'none';
        
        // Create initial asteroid
        createAsteroid();
    }
    
    // Create player's spaceship - X-Wing style from Star Wars
    function createShip() {
        // Ship group to hold all parts
        const shipGroup = new THREE.Group();
        scene.add(shipGroup);
        
        // Main ship body (fuselage)
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xdddddd, // Light gray like X-Wing
            shininess: 70 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2; // Rotate to point forward
        shipGroup.add(body);
        
        // X-Wing cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.7,
            shininess: 90
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.y = 0.2;
        cockpit.scale.y = 0.7; // Flatten slightly
        shipGroup.add(cockpit);
        
        // X-Wing wings - create the distinctive X shape
        const wingLength = 1.5;
        const wingWidth = 0.1;
        const wingDepth = 0.6;
        
        // Create the 4 wings in X formation
        const wingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xdd3333, // Red accents like X-Wing
            shininess: 70
        });
        
        // Top-right wing
        const wing1Geometry = new THREE.BoxGeometry(wingLength, wingWidth, wingDepth);
        const wing1 = new THREE.Mesh(wing1Geometry, wingMaterial);
        wing1.position.set(wingLength/2, 0.3, -0.3);
        wing1.rotation.z = -Math.PI / 12; // Slight upward angle
        shipGroup.add(wing1);
        
        // Top-left wing
        const wing2Geometry = new THREE.BoxGeometry(wingLength, wingWidth, wingDepth);
        const wing2 = new THREE.Mesh(wing2Geometry, wingMaterial);
        wing2.position.set(-wingLength/2, 0.3, -0.3);
        wing2.rotation.z = Math.PI / 12; // Slight upward angle
        shipGroup.add(wing2);
        
        // Bottom-right wing
        const wing3Geometry = new THREE.BoxGeometry(wingLength, wingWidth, wingDepth);
        const wing3 = new THREE.Mesh(wing3Geometry, wingMaterial);
        wing3.position.set(wingLength/2, -0.3, -0.3);
        wing3.rotation.z = Math.PI / 12; // Slight downward angle
        shipGroup.add(wing3);
        
        // Bottom-left wing
        const wing4Geometry = new THREE.BoxGeometry(wingLength, wingWidth, wingDepth);
        const wing4 = new THREE.Mesh(wing4Geometry, wingMaterial);
        wing4.position.set(-wingLength/2, -0.3, -0.3);
        wing4.rotation.z = -Math.PI / 12; // Slight downward angle
        shipGroup.add(wing4);
        
        // Wing-tip lasers (4 of them)
        const laserGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
        const laserMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        // Add lasers at the tips of each wing
        const laser1 = new THREE.Mesh(laserGeometry, laserMaterial);
        laser1.position.set(wingLength - 0.1, 0.38, -0.3);
        laser1.rotation.x = Math.PI / 2;
        shipGroup.add(laser1);
        
        const laser2 = new THREE.Mesh(laserGeometry, laserMaterial);
        laser2.position.set(-wingLength + 0.1, 0.38, -0.3);
        laser2.rotation.x = Math.PI / 2;
        shipGroup.add(laser2);
        
        const laser3 = new THREE.Mesh(laserGeometry, laserMaterial);
        laser3.position.set(wingLength - 0.1, -0.38, -0.3);
        laser3.rotation.x = Math.PI / 2;
        shipGroup.add(laser3);
        
        const laser4 = new THREE.Mesh(laserGeometry, laserMaterial);
        laser4.position.set(-wingLength + 0.1, -0.38, -0.3);
        laser4.rotation.x = Math.PI / 2;
        shipGroup.add(laser4);
        
        // Engine glow (back of ship)
        const engineGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 16);
        const engineMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xaaaaaa,
            emissive: 0x3366ff,
            emissiveIntensity: 0.5
        });
        
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0, 1);
        engine.rotation.x = Math.PI / 2;
        shipGroup.add(engine);
        
        // Ship details - S-foils and other small details
        const detailMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
        
        // Add some details to connect wings to body
        const sfoil1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.05),
            detailMaterial
        );
        sfoil1.position.set(0.3, 0.3, -0.3);
        shipGroup.add(sfoil1);
        
        const sfoil2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.05),
            detailMaterial
        );
        sfoil2.position.set(-0.3, 0.3, -0.3);
        shipGroup.add(sfoil2);
        
        const sfoil3 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.05),
            detailMaterial
        );
        sfoil3.position.set(0.3, -0.3, -0.3);
        shipGroup.add(sfoil3);
        
        const sfoil4 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, 0.05),
            detailMaterial
        );
        sfoil4.position.set(-0.3, -0.3, -0.3);
        shipGroup.add(sfoil4);
        
        // Engine glow light
        const engineLight = new THREE.PointLight(0x3366ff, 1, 5);
        engineLight.position.set(0, 0, 1.2);
        shipGroup.add(engineLight);
        
        // Ship lights
        shipLight = new THREE.PointLight(0x66ccff, 1, 10);
        shipLight.position.set(0, 0, -0.5);
        shipGroup.add(shipLight);
        
        // Set the ship reference to the entire group
        ship = shipGroup;
    }
    
    // Create stars for hyperspace effect
    function createStars() {
        const starCount = 1000;
        const starField = new THREE.Group();
        scene.add(starField);
        
        // Create individual stars
        for (let i = 0; i < starCount; i++) {
            // Create a small white sphere for each star
            const starSize = Math.random() * 0.05 + 0.02;
            const starGeometry = new THREE.SphereGeometry(starSize, 4, 4);
            const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            
            // Position randomly in a large volume ahead of the ship
            star.position.x = (Math.random() - 0.5) * 100;
            star.position.y = (Math.random() - 0.5) * 100;
            star.position.z = Math.random() * -300;
            
            starField.add(star);
            
            // Add to stars array for animation
            stars.push({
                mesh: star,
                speed: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    // Create asteroid with proper fragmentation capability
    function createAsteroid(isFragment = false, fragmentSize = null, fragmentPosition = null) {
        // Random position in front of the ship or use fragment position
        const x = fragmentPosition ? fragmentPosition.x : (Math.random() - 0.5) * 10;
        const y = fragmentPosition ? fragmentPosition.y : (Math.random() - 0.5) * 10;
        const z = fragmentPosition ? fragmentPosition.z : -50; // Start far away
        
        // Create asteroid with random size and detail or use fragment size
        const radius = isFragment ? fragmentSize : Math.random() * 1 + 1.5; // Large asteroids for main ones
        const detail = 1;
        
        // For fragments, use a simpler geometry
        let geometry;
        if (isFragment) {
            // Use tetrahedron or octahedron for fragments
            if (Math.random() > 0.5) {
                geometry = new THREE.TetrahedronGeometry(radius, 0);
            } else {
                geometry = new THREE.OctahedronGeometry(radius, 0);
            }
        } else {
            geometry = new THREE.DodecahedronGeometry(radius, detail);
        }
        
        // Create material with some texture for the asteroid
        const material = new THREE.MeshStandardMaterial({
            color: isFragment ? 0x888888 : 0xaaaaaa,
            roughness: 0.9,
            metalness: 0.1,
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.position.set(x, y, z);
        asteroid.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        asteroid.castShadow = true;
        asteroid.receiveShadow = true;
        
        scene.add(asteroid);
        
        // Determine speed - fragments move faster
        const speedMultiplier = isFragment ? 1.5 : 1.0;
        
        // Store asteroid data
        const asteroidData = {
            mesh: asteroid,
            radius: radius,
            rotationSpeed: {
                x: Math.random() * 0.02 - 0.01,
                y: Math.random() * 0.02 - 0.01,
                z: Math.random() * 0.02 - 0.01
            },
            velocity: {
                x: isFragment ? (Math.random() - 0.5) * 0.1 : 0,
                y: isFragment ? (Math.random() - 0.5) * 0.1 : 0,
                z: (Math.random() * 0.05 + 0.1) * asteroidSpeedMultiplier * speedMultiplier
            },
            isFragment: isFragment,
            // Fragments have a limited lifespan
            life: isFragment ? Math.floor(Math.random() * 100 + 50) : -1
        };
        
        asteroids.push(asteroidData);
        return asteroidData;
    }
    
    // Create asteroid fragments
    function createAsteroidFragments(position, size) {
        const fragmentCount = Math.floor(Math.random() * 3) + 3; // 3-5 fragments
        
        for (let i = 0; i < fragmentCount; i++) {
            // Make fragments of different sizes
            const fragmentSize = size * (Math.random() * 0.3 + 0.15);
            createAsteroid(true, fragmentSize, position.clone());
        }
    }
    
    // Fire photon torpedo
    function fireTorpedo() {
        const torpedoGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const torpedoMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const torpedo = new THREE.Mesh(torpedoGeometry, torpedoMaterial);
        
        // Position the torpedo at the front of the ship
        torpedo.position.copy(ship.position);
        torpedo.position.z -= 1; // Move it in front of the ship
        
        // Create light for the torpedo
        const torpedoLight = new THREE.PointLight(0xff0000, 1, 5);
        torpedo.add(torpedoLight);
        
        // Red torpedo trail (particle effect)
        const trail = new THREE.Points(
            new THREE.BufferGeometry().setAttribute('position', 
                new THREE.Float32BufferAttribute([0, 0, 0], 3)),
            new THREE.PointsMaterial({
                color: 0xff6666,
                size: 0.5,
                transparent: true,
                opacity: 0.7
            })
        );
        torpedo.add(trail);
        
        scene.add(torpedo);
        
        // Add to torpedoes array with velocity
        torpedoes.push({
            mesh: torpedo,
            velocity: new THREE.Vector3(0, 0, -1.5),
            active: true // Flag to track if it's still active
        });
    }
    
    // Create explosion when asteroid is destroyed
    function createExplosion(position, size) {
        const particleCount = 20; // More particles for better explosion
        const particles = [];
        const explosionGroup = new THREE.Group();
        scene.add(explosionGroup);
        
        // Explosion sound effect (if needed)
        // const sound = new Audio('explosion.mp3');
        // sound.volume = 0.5;
        // sound.play();
        
        for (let i = 0; i < particleCount; i++) {
            const particleSize = Math.random() * size * 0.15;
            const geometry = new THREE.SphereGeometry(particleSize, 4, 4);
            const material = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.3 ? 0xff5500 : 0xffff00, // Mix orange and yellow
                emissive: Math.random() > 0.3 ? 0xff5500 : 0xffff00,
                emissiveIntensity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            // Random velocity for each particle
            const speed = Math.random() * 0.3 + 0.1;
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * 2 - 1;
            
            const velX = Math.cos(angle) * speed;
            const velY = height * speed;
            const velZ = Math.sin(angle) * speed;
            
            explosionGroup.add(particle);
            particles.push({
                mesh: particle,
                velocity: { x: velX, y: velY, z: velZ },
                life: Math.floor(Math.random() * 30 + 30)  // Random lifespan
            });
        }
        
        // Explosion light
        const light = new THREE.PointLight(0xff5500, 3, size * 5);
        light.position.copy(position);
        explosionGroup.add(light);
        
        // Handle removing particles
        const removeExplosion = () => {
            for (let i = particles.length - 1; i >= 0; i--) {
                explosionGroup.remove(particles[i].mesh);
            }
            explosionGroup.remove(light);
            scene.remove(explosionGroup);
        };
        
        // Schedule removal
        setTimeout(removeExplosion, 1000);
        
        return { particles, explosionGroup };
    }
    
    // Handle window resize
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update joystick center position for mobile
        if (isMobile) {
            const joystickArea = document.getElementById('joystick-area');
            const joystickRect = joystickArea.getBoundingClientRect();
            joystickCenter.x = joystickRect.left + joystickRect.width / 2;
            joystickCenter.y = joystickRect.top + joystickRect.height / 2;
        }
    }
    
    // Handle mouse movement
    function onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update target rotation for ship
        targetRotation.y = mouse.x * 0.5;
        targetRotation.x = mouse.y * 0.5;
    }
    
    // Handle keyboard input
    function onKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case 'w': keys.w = true; break;
            case 'a': keys.a = true; break;
            case 's': keys.s = true; break;
            case 'd': keys.d = true; break;
            case ' ': 
                if (gameActive && !gameWon) {
                    fireTorpedo();
                }
                break;
        }
    }
    
    function onKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case 'w': keys.w = false; break;
            case 'a': keys.a = false; break;
            case 's': keys.s = false; break;
            case 'd': keys.d = false; break;
        }
    }
    
    // Check collisions between objects
    function checkCollisions() {
        // Check torpedo-asteroid collisions
        for (let i = torpedoes.length - 1; i >= 0; i--) {
            const torpedo = torpedoes[i];
            
            // Skip torpedoes that are already marked as inactive
            if (!torpedo.active) continue;
            
            for (let j = asteroids.length - 1; j >= 0; j--) {
                const asteroid = asteroids[j];
                
                // Skip fragments in fragment vs fragment collisions to avoid chain reactions
                if (torpedo.isFragment && asteroid.isFragment) continue;
                
                // Simple distance-based collision detection
                const dx = torpedo.mesh.position.x - asteroid.mesh.position.x;
                const dy = torpedo.mesh.position.y - asteroid.mesh.position.y;
                const dz = torpedo.mesh.position.z - asteroid.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < asteroid.radius + 0.15) {
                    // Mark torpedo as inactive to prevent double-counting
                    torpedo.active = false;
                    
                    // Create explosion at asteroid position
                    createExplosion(asteroid.mesh.position.clone(), asteroid.radius);
                    
                    // If not a fragment, create asteroid fragments
                    if (!asteroid.isFragment) {
                        createAsteroidFragments(asteroid.mesh.position.clone(), asteroid.radius);
                    }
                    
                    // Remove asteroid and torpedo from scene
                    scene.remove(asteroid.mesh);
                    scene.remove(torpedo.mesh);
                    
                    // Remove from arrays
                    asteroids.splice(j, 1);
                    torpedoes.splice(i, 1);
                    
                    // Only increase score for non-fragment asteroids
                    if (!asteroid.isFragment) {
                        score++;
                        document.getElementById('score').textContent = score;
                        
                        // Increase difficulty
                        if (score % 5 === 0) {
                            asteroidSpeedMultiplier += 0.2;
                            if (asteroidSpawnInterval > 500) {
                                asteroidSpawnInterval -= 300;
                            }
                        }
                        
                        // Check win condition
                        if (score >= targetScore) {
                            gameWon = true;
                            gameActive = false;
                            document.getElementById('game-win').style.display = 'block';
                        }
                    }
                    
                    break;
                }
            }
        }
        
        // Check ship-asteroid collisions
        if (gameActive && !gameWon) {
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const asteroid = asteroids[i];
                const dx = ship.position.x - asteroid.mesh.position.x;
                const dy = ship.position.y - asteroid.mesh.position.y;
                const dz = ship.position.z - asteroid.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < asteroid.radius + 0.5) {
                    // Create explosion
                    const explosionParticles = createExplosion(asteroid.mesh.position.clone(), asteroid.radius);
                    
                    // Remove asteroid
                    scene.remove(asteroid.mesh);
                    asteroids.splice(i, 1);
                    
                    // Reduce health
                    health -= 25;
                    document.getElementById('health').textContent = health;
                    document.getElementById('health-fill').style.width = health + '%';
                    
                    // Change health bar color based on health
                    if (health <= 25) {
                        document.getElementById('health-fill').style.backgroundColor = '#f00';
                    } else if (health <= 50) {
                        document.getElementById('health-fill').style.backgroundColor = '#ff0';
                    }
                    
                    // Check game over
                    if (health <= 0) {
                        gameActive = false;
                        document.getElementById('game-over').style.display = 'block';
                    }
                    
                    // Ship damage effect
                    shipLight.color.set(0xff0000);
                    setTimeout(() => {
                        shipLight.color.set(0x00ffff);
                    }, 500);
                }
            }
        }
    }
    
    // Update game state
    function updateGame(deltaTime) {
        if (!gameActive) return;
        
        // Ship movement with keyboard or joystick
        const moveSpeed = 0.1;
        
        if (isMobile && joystickActive) {
            // Mobile joystick movement
            ship.position.x += joystickPosition.x * moveSpeed * 2;
            ship.position.y -= joystickPosition.y * moveSpeed * 2;
        } else {
            // Desktop keyboard movement
            if (keys.w) ship.position.y += moveSpeed;
            if (keys.s) ship.position.y -= moveSpeed;
            if (keys.a) ship.position.x -= moveSpeed;
            if (keys.d) ship.position.x += moveSpeed;
        }
        
        // Clamp ship position
        ship.position.x = Math.max(-5, Math.min(5, ship.position.x));
        ship.position.y = Math.max(-3, Math.min(3, ship.position.y));
        
        // Smoothly rotate ship toward mouse position
        ship.rotation.x = Math.PI + targetRotation.x;
        ship.rotation.y = targetRotation.y;
        
        // Update stars (hyperspace effect)
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            star.mesh.position.z += star.speed;
            
            // Reset star position when it passes the camera
            if (star.mesh.position.z > 5) {
                star.mesh.position.z = -300;
                star.mesh.position.x = (Math.random() - 0.5) * 100;
                star.mesh.position.y = (Math.random() - 0.5) * 100;
            }
        }
        
        // Update torpedoes
        for (let i = torpedoes.length - 1; i >= 0; i--) {
            const torpedo = torpedoes[i];
            torpedo.mesh.position.x += torpedo.velocity.x;
            torpedo.mesh.position.y += torpedo.velocity.y;
            torpedo.mesh.position.z += torpedo.velocity.z;
            
            // Remove torpedoes that go too far
            if (torpedo.mesh.position.z < -100) {
                scene.remove(torpedo.mesh);
                torpedoes.splice(i, 1);
            }
        }
        
        // Update asteroids
        for (let i = 0; i < asteroids.length; i++) {
            const asteroid = asteroids[i];
            
            // Update position with 3D velocity
            asteroid.mesh.position.x += asteroid.velocity.x;
            asteroid.mesh.position.y += asteroid.velocity.y;
            asteroid.mesh.position.z += asteroid.velocity.z;
            
            // Rotate asteroid
            asteroid.mesh.rotation.x += asteroid.rotationSpeed.x;
            asteroid.mesh.rotation.y += asteroid.rotationSpeed.y;
            asteroid.mesh.rotation.z += asteroid.rotationSpeed.z;
            
            // Update lifespan for fragments
            if (asteroid.isFragment && asteroid.life > 0) {
                asteroid.life--;
                
                // Make fragment fade out as it nears end of life
                if (asteroid.life < 30) {
                    const opacity = asteroid.life / 30;
                    if (asteroid.mesh.material.opacity !== undefined) {
                        asteroid.mesh.material.transparent = true;
                        asteroid.mesh.material.opacity = opacity;
                    }
                }
                
                // Remove expired fragments
                if (asteroid.life <= 0) {
                    scene.remove(asteroid.mesh);
                    asteroids.splice(i, 1);
                    i--;
                    continue;
                }
            }
            
            // Remove asteroids that pass the camera
            if (asteroid.mesh.position.z > 10) {
                scene.remove(asteroid.mesh);
                asteroids.splice(i, 1);
                i--;
            }
        }
        
        // Spawn new asteroids based on interval
        const currentTime = Date.now();
        if (currentTime - lastAsteroidSpawn > asteroidSpawnInterval) {
            createAsteroid();
            lastAsteroidSpawn = currentTime;
        }
        
        // Check for collisions
        checkCollisions();
    }
    
    // Animation loop
    function animate(time) {
        requestAnimationFrame(animate);
        
        // Calculate delta time
        const deltaTime = time - lastTime;
        lastTime = time;
        
        // Update game state
        updateGame(deltaTime);
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Handle errors
    function handleError(error) {
        console.error("Error loading game:", error);
        loadingMessage.innerHTML = `
            <h2>Game Error</h2>
            <p>There was an error loading the game: ${error.message || 'Unknown error'}</p>
            <p>Please check the console for more details or try a different browser.</p>
        `;
    }
}); 