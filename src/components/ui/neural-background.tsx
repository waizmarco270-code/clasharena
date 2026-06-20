'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function NeuralBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    const velocities = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 15;
      velocities[i] = (Math.random() - 0.5) * 0.015;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff4500,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Lines geometry
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });

    let lineMesh: THREE.LineSegments | null = null;

    camera.position.z = 7;

    const animate = () => {
      requestAnimationFrame(animate);

      const posArray = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        posArray[i3] += velocities[i3];
        posArray[i3 + 1] += velocities[i3 + 1];
        posArray[i3 + 2] += velocities[i3 + 2];

        // Bounds checking
        if (Math.abs(posArray[i3]) > 10) velocities[i3] *= -1;
        if (Math.abs(posArray[i3 + 1]) > 10) velocities[i3 + 1] *= -1;
        if (Math.abs(posArray[i3 + 2]) > 10) velocities[i3 + 2] *= -1;
      }

      geometry.attributes.position.needsUpdate = true;

      // Update lines
      const linePositions: number[] = [];
      for (let i = 0; i < particlesCount; i++) {
        for (let j = i + 1; j < particlesCount; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 2.5) {
            linePositions.push(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
            linePositions.push(posArray[j * 3], posArray[j * 3 + 1], posArray[j * 3 + 2]);
          }
        }
      }

      if (lineMesh) scene.remove(lineMesh);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineMesh);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-[-1] pointer-events-none opacity-60" />;
}
