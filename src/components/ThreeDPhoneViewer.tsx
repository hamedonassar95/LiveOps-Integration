import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, RotateCcw, Smartphone, Sparkles, Layers, Shield } from 'lucide-react';
import { Wallpaper } from '../types.ts';

interface ThreeDPhoneViewerProps {
  wallpaper: Wallpaper;
  isOpen: boolean;
  onClose: () => void;
}

const PHONE_FINISHES = [
  { name: 'Natural Titanium', color: 0x8a8782, metalness: 0.9, roughness: 0.25 },
  { name: 'Space Black', color: 0x1f2022, metalness: 0.85, roughness: 0.3 },
  { name: 'Cosmic Violet', color: 0x4c336b, metalness: 0.88, roughness: 0.22 },
  { name: 'Lunar Silver', color: 0xd2d5d8, metalness: 0.92, roughness: 0.18 },
];

export const ThreeDPhoneViewer: React.FC<ThreeDPhoneViewerProps> = ({
  wallpaper,
  isOpen,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeFinish, setActiveFinish] = useState(PHONE_FINISHES[0]);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080c);
    scene.fog = new THREE.FogExp2(0x07080c, 0.08);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4ff, 1.2);
    fillLight.position.set(-6, -2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xb388ff, 2.0);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    // 3. Composite Phone Group
    const phoneGroup = new THREE.Group();
    scene.add(phoneGroup);

    // Chassis Body
    const bodyGeometry = new THREE.BoxGeometry(2.3, 4.8, 0.22);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: activeFinish.metalness,
      roughness: activeFinish.roughness,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    phoneGroup.add(bodyMesh);

    // Screen Texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const screenTexture = textureLoader.load(wallpaper.imageUrl, () => {
      renderer.render(scene, camera);
    });
    screenTexture.colorSpace = THREE.SRGBColorSpace;

    // Glass Screen Mesh
    const screenGeometry = new THREE.PlaneGeometry(2.16, 4.62);
    const screenMaterial = new THREE.MeshStandardMaterial({
      map: screenTexture,
      roughness: 0.1,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.08,
      emissiveMap: screenTexture,
    });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenMesh.position.set(0, 0, 0.112);
    phoneGroup.add(screenMesh);

    // Dynamic Island Pill
    const islandGeo = new THREE.CapsuleGeometry(0.06, 0.32, 8, 16);
    const islandMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.rotation.z = Math.PI / 2;
    islandMesh.position.set(0, 2.05, 0.115);
    phoneGroup.add(islandMesh);

    // Back Camera Bump
    const bumpGeo = new THREE.BoxGeometry(0.9, 0.9, 0.08);
    const bumpMat = new THREE.MeshStandardMaterial({
      color: activeFinish.color,
      metalness: activeFinish.metalness,
      roughness: activeFinish.roughness,
    });
    const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
    bumpMesh.position.set(-0.55, 1.8, -0.15);
    phoneGroup.add(bumpMesh);

    // 3 Camera Lenses
    const lensPositions = [
      [-0.7, 1.95, -0.2],
      [-0.4, 1.95, -0.2],
      [-0.55, 1.65, -0.2],
    ];
    lensPositions.forEach(([x, y, z]) => {
      const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.95 });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, y, z);
      phoneGroup.add(lens);
    });

    // Subtle Ground Reflection Plane
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.8,
      metalness: 0.2,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -3.2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 4. Mouse / Touch Drag Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;

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

      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
      targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 5. Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (isAutoRotating && !isDragging) {
        targetRotY += dt * 0.4;
      }

      // Smooth damping
      phoneGroup.rotation.y += (targetRotY - phoneGroup.rotation.y) * (1 - Math.exp(-8 * dt));
      phoneGroup.rotation.x += (targetRotX - phoneGroup.rotation.x) * (1 - Math.exp(-8 * dt));
      phoneGroup.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.08;

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
      cancelAnimationFrame(animationId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      bodyGeometry.dispose();
      screenGeometry.dispose();
      textureLoader;
    };
  }, [isOpen, wallpaper, activeFinish, isAutoRotating]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none animate-fade-in overflow-hidden">
      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between p-4 max-w-xl mx-auto w-full">
        <div className="flex items-center space-x-2 bg-neutral-900/90 border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
          <Smartphone className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-white">Three.js 3D Phone Studio</span>
          <span className="text-[10px] text-neutral-400 font-mono">PBR 60fps</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-full border text-xs font-medium transition-colors ${
              isAutoRotating
                ? 'bg-violet-600/30 text-violet-300 border-violet-500/50'
                : 'bg-neutral-900/80 text-neutral-400 border-white/10'
            }`}
            title="Toggle Auto Rotation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/15 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="absolute top-4 inset-x-0 text-center pointer-events-none">
          <span className="text-[11px] text-white/50 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            Drag to rotate phone in 3D space
          </span>
        </div>
      </div>

      {/* Bottom Controls: Finish Customizer */}
      <div className="relative z-20 p-4 max-w-md mx-auto w-full pb-6">
        <div className="bg-neutral-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 shadow-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Titanium Finish:</span>
            <span className="text-white font-medium">{activeFinish.name}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PHONE_FINISHES.map((finish) => (
              <button
                key={finish.name}
                onClick={() => setActiveFinish(finish)}
                className={`py-2 px-2 rounded-2xl border text-xs flex flex-col items-center gap-1.5 transition-all ${
                  activeFinish.name === finish.name
                    ? 'bg-violet-600/25 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-neutral-900/60 hover:bg-neutral-800/60 border-white/5 text-neutral-400'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                  style={{ backgroundColor: `#${finish.color.toString(16).padStart(6, '0')}` }}
                />
                <span className="text-[9px] truncate w-full text-center">{finish.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
