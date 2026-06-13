// Auto-login check
if (localStorage.getItem('lifepilot_user_name') && localStorage.getItem('lifepilot_user_role')) {
    window.location.href = '../Main/frontend/index.html';
}

// Initialize Three.js Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(10, 20, 20);
scene.add(pointLight);

// Target position for particles interaction (follows mouse)
const targetPos = new THREE.Vector3();

// Invisible plane for raycasting
const planeGeo = new THREE.PlaneGeometry(500, 500);
const planeMat = new THREE.MeshBasicMaterial({ visible: false });
const plane = new THREE.Mesh(planeGeo, planeMat);
scene.add(plane);

// 3D Particles System (InstancedMesh)
// Circular Membrane (InstancedMesh)
const particlesCount = 1000; // Slightly more to support the chaotic visual density
const geometry = new THREE.SphereGeometry(0.15, 8, 8); // Slightly larger base size (mini + a bit more)

// Material without static color since we update instances dynamically
const material = new THREE.MeshStandardMaterial({
    roughness: 0.3,
    metalness: 0.7,
});

const instancedMesh = new THREE.InstancedMesh(geometry, material, particlesCount);
scene.add(instancedMesh);

const dummy = new THREE.Object3D();
const originalPositions = new Float32Array(particlesCount * 3);
const currentPositions = new Float32Array(particlesCount * 3);
const tmpColor = new THREE.Color();

// Phyllotaxis pattern for a beautiful circular distribution
const c = 1.6; // Wider circle
const maxRadius = c * Math.sqrt(particlesCount); // Track max radius for scaling math

for (let i = 0; i < particlesCount; i++) {
    const angle = i * 137.5 * (Math.PI / 180);
    const radius = c * Math.sqrt(i);

    const posX = Math.cos(angle) * radius;
    const posY = Math.sin(angle) * radius;
    const posZ = 0;

    originalPositions[i * 3] = posX;
    originalPositions[i * 3 + 1] = posY;
    originalPositions[i * 3 + 2] = posZ;

    currentPositions[i * 3] = posX;
    currentPositions[i * 3 + 1] = posY;
    currentPositions[i * 3 + 2] = posZ;

    // Initial color
    instancedMesh.setColorAt(i, new THREE.Color(0xffffff));
}
instancedMesh.instanceColor.needsUpdate = true;

// Raycaster & Mouse setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plane);

    if (intersects.length > 0) {
        // Smoothly move targetPos to intersection point
        gsap.to(targetPos, {
            x: intersects[0].point.x,
            y: intersects[0].point.y,
            duration: 1.2,
            ease: "power3.out"
        });
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    for (let index = 0; index < particlesCount; index++) {
        let curX = currentPositions[index * 3];
        let curY = currentPositions[index * 3 + 1];
        let curZ = currentPositions[index * 3 + 2];

        const origX = originalPositions[index * 3];
        const origY = originalPositions[index * 3 + 1];

        // Distance from center of the membrane
        const distToCenter = Math.sqrt(origX * origX + origY * origY);

        // Rule: Smooth subtle drift
        let targetX = origX + Math.sin(distToCenter * 0.2 + time) * 0.8;
        let targetY = origY + Math.cos(distToCenter * 0.2 + time * 1.2) * 0.8;

        // Chaos: High-frequency erratic micro-movements
        targetX += Math.sin(origY * 2.5 + time * 4.5) * 0.35;
        targetY += Math.cos(origX * 2.7 + time * 3.8) * 0.35;

        curX += (targetX - curX) * 0.1;
        curY += (targetY - curY) * 0.1;

        // Rule: Combine radial wave with complex directional waves
        let targetZ = Math.sin(distToCenter * 0.4 - time * 2) * 1.5;
        targetZ += Math.cos(origX * 0.2 + time) * 1.5;
        targetZ += Math.sin(origY * 0.25 - time * 1.5) * 1.5;

        // Chaos: High-frequency Z jitters
        targetZ += Math.sin(origX * 1.9 + origY * 2.1 + time * 5.0) * 0.6;

        curZ += (targetZ - curZ) * 0.1;

        currentPositions[index * 3] = curX;
        currentPositions[index * 3 + 1] = curY;
        currentPositions[index * 3 + 2] = curZ;

        dummy.position.set(curX, curY, curZ);

        // Scale math: Smaller at center and outer edge
        const normDist = distToCenter / maxRadius;
        let ringScale = 1.0 - 4.0 * Math.pow(normDist - 0.5, 2);
        if (ringScale < 0.1) ringScale = 0.1; // minimum size

        // Shrink scale inversely proportional to Z height
        let heightScale = 1.0 - (Math.abs(curZ) * 0.2);
        if (heightScale < 0.1) heightScale = 0.1;

        const finalScale = ringScale * heightScale;

        // "mảnh hơn giữa thon và tròn" (slender/thin): squash X/Z and stretch Y
        dummy.scale.set(finalScale * 0.4, finalScale * 1.6, finalScale * 0.4);

        // Rotate to point outward from center to align with the "rule"
        dummy.rotation.set(0, 0, Math.atan2(curY, curX) - Math.PI / 2);

        // Changing color: dynamic HSL mapped to distance and time
        const hue = (distToCenter * 0.02 - time * 0.1) % 1;
        tmpColor.setHSL(hue < 0 ? hue + 1 : hue, 0.8, 0.5);
        instancedMesh.setColorAt(index, tmpColor);

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(index, dummy.matrix);
    }

    // Move the entire membrane smoothly towards the mouse
    instancedMesh.position.x += (targetPos.x - instancedMesh.position.x) * 0.05;
    instancedMesh.position.y += (targetPos.y - instancedMesh.position.y) * 0.05;

    // Slight tilt rotation based on mouse movement for 3D feeling
    instancedMesh.rotation.y = (targetPos.x - instancedMesh.position.x) * 0.03;
    instancedMesh.rotation.x = -(targetPos.y - instancedMesh.position.y) * 0.03;

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
}

animate();

// ---- UI Interaction Logic ----

const form = document.getElementById('name-form');
const input = document.getElementById('user-name');
const screenName = document.getElementById('screen-name');
const screenSelection = document.getElementById('screen-selection');

if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (name) {
            const btn = form.querySelector('.btn-submit');
            const originalContent = btn.innerHTML;

            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
            btn.style.backgroundColor = '#10B981';

            // Save the user name to localStorage
            localStorage.setItem('lifepilot_user_name', name);

            setTimeout(() => {
                // Fade out screen 1
                screenName.style.opacity = '0';

                // Update the greeting title
                const greetingTitle = document.getElementById('greeting-title');
                if (greetingTitle) {
                    greetingTitle.innerText = `Welcome to LifePilot, ${name}!`;
                }

                setTimeout(() => {
                    screenName.classList.add('hidden');

                    // Show screen 2
                    screenSelection.classList.remove('hidden');
                    // Force reflow for CSS transition
                    void screenSelection.offsetWidth;
                    screenSelection.classList.add('active');
                }, 500); // Wait for fade out to complete

            }, 600); // Initial delay after button click
        }
    });
}

// Handle Option Selection
const radioButtons = document.querySelectorAll('input[name="user_role"]');
const btnGetStarted = document.getElementById('btn-get-started');

radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
        // Enable Get Started button when an option is selected
        if (document.querySelector('input[name="user_role"]:checked')) {
            btnGetStarted.disabled = false;
        }
    });
});

btnGetStarted.addEventListener('click', () => {
    const selectedRole = document.querySelector('input[name="user_role"]:checked').value;
    localStorage.setItem('lifepilot_user_role', selectedRole);
    window.location.href = '../Main/frontend/index.html';
});
