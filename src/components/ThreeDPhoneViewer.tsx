import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  X,
  RotateCcw,
  Smartphone,
  Sparkles,
  Layers,
  Sun,
  Eye,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { Wallpaper } from '../types.ts';

interface ThreeDPhoneViewerProps {
  wallpaper: Wallpaper;
  isOpen: boolean;
  onClose: () => void;
}

interface PhoneFinish {
  name: string;
  color: number;
  backColor: number;
  metalness: number;
  roughness: number;
}

const PHONE_FINISHES: PhoneFinish[] = [
  { name: 'Natural Titanium', color: 0x8a8782, backColor: 0x73706b, metalness: 0.92, roughness: 0.22 },
  { name: 'Space Black', color: 0x1f2022, backColor: 0x151618, metalness: 0.88, roughness: 0.28 },
  { name: 'Cosmic Violet', color: 0x4c336b, backColor: 0x3d2757, metalness: 0.9, roughness: 0.24 },
  { name: 'Desert Gold', color: 0xb89f82, backColor: 0x9e866b, metalness: 0.93, roughness: 0.2 },
  { name: 'Lunar Silver', color: 0xd2d5d8, backColor: 0xbdc1c5, metalness: 0.94, roughness: 0.16 },
];

// Scratch math helpers outside render loop (Zero GC allocation per frame)
const _scratchVec3 = new THREE.Vector3();

// Procedural Contact Shadow Texture (Zero external 404 dependencies)
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ThreeDPhoneViewer: React.FC<ThreeDPhoneViewerProps> = ({
  wallpaper,
  isOpen,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeFinish, setActiveFinish] = useState<PhoneFinish>(PHONE_FINISHES[0]);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'neon' | 'golden'>('studio');

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Detect software WebGL to adapt rendering parameters seamlessly
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.08);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.2, 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Mandatory RoomEnvironment PMREM Setup
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio 3-Point Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x111318, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.8);
    keyLight.position.set(4.5, 7.0, 5.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88b0ff, 1.4);
    fillLight.position.set(-5.5, -1.0, 3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 2.2);
    rimLight.position.set(0, 4.0, -5.5);
    scene.add(rimLight);

    // 4. Composite 3-12 Part Procedural Phone Model Group
    const phoneRootGroup = new THREE.Group();
    scene.add(phoneRootGroup);

    // Part 1: Outer Metallic Chassis Frame
    const chassisGeo = new THREE.BoxGeometry(2.32, 4.86, 0.22);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: activeFinish.metalness,
      roughness: activeFinish.roughness,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = !isSoftwareGl;
    chassisMesh.receiveShadow = !isSoftwareGl;
    phoneRootGroup.add(chassisMesh);

    // Part 2: Matte Back Glass Panel
    const backPanelGeo = new THREE.PlaneGeometry(2.26, 4.8);
    const backPanelMat = new THREE.MeshStandardMaterial({
      color: activeFinish.backColor,
      metalness: 0.15,
      roughness: 0.45,
    });
    const backPanelMesh = new THREE.Mesh(backPanelGeo, backPanelMat);
    backPanelMesh.rotation.y = Math.PI;
    backPanelMesh.position.set(0, 0, -0.112);
    phoneRootGroup.add(backPanelMesh);

    // Part 3: Front Glass OLED Display with Wallpaper Texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const screenTexture = textureLoader.load(wallpaper.imageUrl, () => {
      screenTexture.colorSpace = THREE.SRGBColorSpace;
      screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      renderer.render(scene, camera);
    });
    screenTexture.colorSpace = THREE.SRGBColorSpace;

    const screenGeo = new THREE.PlaneGeometry(2.2, 4.74);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      roughness: 0.06,
      metalness: 0.08,
      emissive: 0xffffff,
      emissiveIntensity: 0.09,
      emissiveMap: screenTexture,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0, 0.112);
    phoneRootGroup.add(screenMesh);

    // Part 4: Dynamic Island Interactive Pill
    const islandGeo = new THREE.CapsuleGeometry(0.065, 0.36, 12, 16);
    const islandMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.rotation.z = Math.PI / 2;
    islandMesh.position.set(0, 2.08, 0.114);
    phoneRootGroup.add(islandMesh);

    // Part 5: Elevated Camera Island Plateau
    const cameraIslandGeo = new THREE.BoxGeometry(0.96, 0.96, 0.08);
    const cameraIslandMat = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: activeFinish.metalness,
      roughness: activeFinish.roughness * 0.9,
    });
    const cameraIslandMesh = new THREE.Mesh(cameraIslandGeo, cameraIslandMat);
    cameraIslandMesh.position.set(-0.55, 1.78, -0.152);
    phoneRootGroup.add(cameraIslandMesh);

    // Parts 6, 7, 8: 3 Camera Rings & Lens Barrels
    const lensRingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 32);
    const lensRingMat = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: 0.95,
      roughness: 0.12,
    });

    const lensGlassGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.065, 32);
    const lensGlassMat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      metalness: 0.9,
      roughness: 0.03,
    });

    const cameraGroup = new THREE.Group();
    phoneRootGroup.add(cameraGroup);

    const lensCoordinates = [
      [-0.72, 1.95, -0.2],
      [-0.38, 1.95, -0.2],
      [-0.55, 1.62, -0.2],
    ];

    lensCoordinates.forEach(([x, y, z]) => {
      const ring = new THREE.Mesh(lensRingGeo, lensRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, z);
      cameraGroup.add(ring);

      const glass = new THREE.Mesh(lensGlassGeo, lensGlassMat);
      glass.rotation.x = Math.PI / 2;
      glass.position.set(x, y, z - 0.005);
      cameraGroup.add(glass);
    });

    // Part 9: Dual Tone Flash and LiDAR Scanner
    const flashGeo = new THREE.CircleGeometry(0.06, 24);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff9e6 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.rotation.y = Math.PI;
    flashMesh.position.set(-0.36, 1.62, -0.194);
    cameraGroup.add(flashMesh);

    const lidarGeo = new THREE.CircleGeometry(0.045, 24);
    const lidarMat = new THREE.MeshBasicMaterial({ color: 0x0c0d10 });
    const lidarMesh = new THREE.Mesh(lidarGeo, lidarMat);
    lidarMesh.rotation.y = Math.PI;
    lidarMesh.position.set(-0.72, 1.62, -0.194);
    cameraGroup.add(lidarMesh);

    // Parts 10 & 11: Side Buttons & Antenna Accents
    const buttonGeo = new THREE.BoxGeometry(0.04, 0.35, 0.08);
    const buttonMat = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Power button (right)
    const powerBtn = new THREE.Mesh(buttonGeo, buttonMat);
    powerBtn.position.set(1.18, 0.8, 0);
    phoneRootGroup.add(powerBtn);

    // Volume buttons (left)
    const volUpBtn = new THREE.Mesh(buttonGeo, buttonMat);
    volUpBtn.position.set(-1.18, 1.0, 0);
    phoneRootGroup.add(volUpBtn);

    const volDownBtn = new THREE.Mesh(buttonGeo, buttonMat);
    volDownBtn.position.set(-1.18, 0.55, 0);
    phoneRootGroup.add(volDownBtn);

    // Part 12: Soft Radial Contact Shadow Grounding Plane
    const contactShadowTexture = createContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(6, 6);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = -2.85;
    scene.add(contactShadowMesh);

    // 5. High-Performance Input & Smooth Damping Variables
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let currentExplodeFactor = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotY += deltaX * 0.007;
      targetRotX += deltaY * 0.007;
      targetRotX = Math.max(-0.65, Math.min(0.65, targetRotX));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Lossless 60fps Animation Loop with Exponential Damping
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (isAutoRotating && !isDragging) {
        targetRotY += dt * 0.35;
      }

      // Smooth frame-rate independent exponential damping
      phoneRootGroup.rotation.y += (targetRotY - phoneRootGroup.rotation.y) * (1 - Math.exp(-9 * dt));
      phoneRootGroup.rotation.x += (targetRotX - phoneRootGroup.rotation.x) * (1 - Math.exp(-9 * dt));
      phoneRootGroup.position.y = Math.sin(clock.getElapsedTime() * 1.6) * 0.07;

      // Exploded View Spring Animation
      const targetExplode = isExploded ? 1 : 0;
      currentExplodeFactor += (targetExplode - currentExplodeFactor) * (1 - Math.exp(-8 * dt));

      screenMesh.position.z = 0.112 + currentExplodeFactor * 0.85;
      islandMesh.position.z = 0.114 + currentExplodeFactor * 0.87;
      backPanelMesh.position.z = -0.112 - currentExplodeFactor * 0.75;
      cameraIslandMesh.position.z = -0.152 - currentExplodeFactor * 1.1;
      cameraGroup.position.z = -currentExplodeFactor * 1.25;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);

      // Clean disposal
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      chassisGeo.dispose();
      chassisMat.dispose();
      backPanelGeo.dispose();
      backPanelMat.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      screenTexture.dispose();
      contactShadowTexture.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
    };
  }, [isOpen, wallpaper, activeFinish, isAutoRotating, isExploded, lightingPreset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#06070a] flex flex-col justify-between select-none animate-fade-in overflow-hidden">
      {/* Top Header Floating Dock (solid surface, zero backdrop-filter over WebGL) */}
      <div className="relative z-20 flex items-center justify-between p-4 max-w-xl mx-auto w-full">
        <div className="flex items-center space-x-2 bg-[rgba(15,18,25,0.95)] border border-white/10 px-3.5 py-1.5 rounded-full shadow-xl">
          <Smartphone className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-white">Three.js 3D Studio</span>
          <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25">
            PBR 60fps
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Exploded View Toggle */}
          <button
            onClick={() => setIsExploded(!isExploded)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isExploded
                ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-500/30'
                : 'bg-[rgba(15,18,25,0.9)] text-neutral-300 border-white/10 hover:text-white'
            }`}
            title="Toggle Exploded Mechanical View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exploded View</span>
          </button>

          {/* Auto Rotation Toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-full border text-xs font-medium transition-colors ${
              isAutoRotating
                ? 'bg-violet-600/30 text-violet-300 border-violet-500/50'
                : 'bg-[rgba(15,18,25,0.9)] text-neutral-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Auto Rotation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            aria-label="Close 3D Studio"
            className="w-8 h-8 rounded-full bg-[rgba(15,18,25,0.9)] hover:bg-neutral-800 border border-white/15 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Bleed 3D WebGL Canvas Viewport (100vw x 100vh) */}
      <div
        ref={mountRef}
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="absolute top-4 inset-x-0 text-center pointer-events-none">
          <span className="text-[11px] text-neutral-400 bg-[rgba(10,12,18,0.85)] px-3.5 py-1 rounded-full border border-white/10 shadow-lg">
            Drag to rotate in 3D • Smooth exponential damping
          </span>
        </div>
      </div>

      {/* Ergonomic Floating Bottom Dock (<= 15% viewport footprint, solid/rgba surface) */}
      <div className="relative z-20 p-3 sm:p-4 max-w-md mx-auto w-full pb-6">
        <div className="bg-[rgba(12,15,22,0.95)] border border-white/15 rounded-3xl p-3 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span className="font-semibold text-neutral-300">Titanium Finish:</span>
            <span className="text-violet-300 font-medium">{activeFinish.name}</span>
          </div>

          {/* Finishes Grid */}
          <div className="grid grid-cols-5 gap-1.5">
            {PHONE_FINISHES.map((finish) => (
              <button
                key={finish.name}
                onClick={() => setActiveFinish(finish)}
                className={`py-2 px-1 rounded-2xl border text-xs flex flex-col items-center gap-1.5 transition-all ${
                  activeFinish.name === finish.name
                    ? 'bg-violet-600/30 border-violet-400 text-white shadow-md shadow-violet-500/20'
                    : 'bg-neutral-900/70 hover:bg-neutral-800/80 border-white/5 text-neutral-400'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/30 shadow-inner"
                  style={{ backgroundColor: `#${finish.color.toString(16).padStart(6, '0')}` }}
                />
                <span className="text-[9px] truncate w-full text-center font-medium">
                  {finish.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
