import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const numberFrom = (value, fallback) => {
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const cropKind = (crop) => {
  const name = String(crop || '').toLowerCase();
  if (name.includes('coconut')) return 'coconut';
  if (name.includes('banana')) return 'banana';
  if (name.includes('areca') || name.includes('betel')) return 'arecanut';
  if (name.includes('papaya')) return 'papaya';
  if (name.includes('pepper')) return 'pepper';
  return 'crop';
};

function Coconut({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.12, 0.19, 2.7, 7]} /><meshStandardMaterial color="#76502e" roughness={1} /></mesh><group position={[0, 2.75, 0]}>{Array.from({ length: 7 }, (_, index) => <mesh key={index} rotation={[0.18 + (index % 2) * 0.12, (index / 7) * Math.PI * 2, -0.5 + (index % 3) * 0.35]} position={[0, 0, 0]} castShadow><boxGeometry args={[0.12, 1.5, 0.08]} /><meshStandardMaterial color={index % 2 ? '#2f6a38' : '#477f3e'} roughness={.9} /></mesh>)}<mesh position={[0, -0.12, 0]}><sphereGeometry args={[0.24, 8, 6]} /><meshStandardMaterial color="#4d3625" roughness={1} /></mesh></group></group>;
}

function Banana({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, .65, 0]} castShadow><cylinderGeometry args={[0.16, 0.22, 1.3, 8]} /><meshStandardMaterial color="#3f7a3a" roughness={.9} /></mesh><group position={[0, 1.35, 0]}>{Array.from({ length: 6 }, (_, index) => <mesh key={index} rotation={[0.15 + index * .12, index * 1.05, index % 2 ? -.4 : .4]} castShadow><boxGeometry args={[.13, 1.25, .48]} /><meshStandardMaterial color={index % 2 ? '#4e873d' : '#6b9b42'} roughness={.85} /></mesh>)}</group></group>;
}

function Arecanut({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[0.07, 0.12, 3.4, 7]} /><meshStandardMaterial color="#6d4b2d" roughness={1} /></mesh><group position={[0, 3.35, 0]}>{Array.from({ length: 6 }, (_, index) => <mesh key={index} rotation={[.35, index, .18]} castShadow><boxGeometry args={[.09, .9, .18]} /><meshStandardMaterial color="#3f7a3c" roughness={.9} /></mesh>)}</group></group>;
}

function Papaya({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[.11, .16, 2.3, 8]} /><meshStandardMaterial color="#54733b" roughness={.95} /></mesh><group position={[0, 2.18, 0]}>{Array.from({ length: 7 }, (_, index) => <mesh key={index} rotation={[.4, index * .9, -.35]} castShadow><coneGeometry args={[.45, .08, 6]} /><meshStandardMaterial color="#4b863c" roughness={.85} /></mesh>)}</group></group>;
}

function Pepper({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, .9, 0]} castShadow><cylinderGeometry args={[.12, .15, 1.8, 7]} /><meshStandardMaterial color="#75502f" roughness={1} /></mesh><mesh position={[0, 1.65, 0]} rotation={[0, 0, .2]} castShadow><torusGeometry args={[.46, .035, 5, 14]} /><meshStandardMaterial color="#4d873b" roughness={.85} /></mesh><mesh position={[0, 1.25, 0]} rotation={[0, .8, -.2]} castShadow><torusGeometry args={[.38, .035, 5, 14]} /><meshStandardMaterial color="#5e9944" roughness={.85} /></mesh><mesh position={[0, 2.05, 0]}><sphereGeometry args={[.25, 7, 5]} /><meshStandardMaterial color="#36733b" roughness={.9} /></mesh></group>;
}

function GenericCrop({ scale = 1 }) {
  return <group scale={scale}><mesh position={[0, .45, 0]}><cylinderGeometry args={[.08, .14, .9, 6]} /><meshStandardMaterial color="#66452b" /></mesh><mesh position={[0, 1, 0]} castShadow><dodecahedronGeometry args={[.5, 1]} /><meshStandardMaterial color="#4e873e" roughness={.9} /></mesh></group>;
}

function CropModel({ crop, scale }) {
  const kind = cropKind(crop);
  if (kind === 'coconut') return <Coconut scale={scale} />;
  if (kind === 'banana') return <Banana scale={scale} />;
  if (kind === 'arecanut') return <Arecanut scale={scale} />;
  if (kind === 'papaya') return <Papaya scale={scale} />;
  if (kind === 'pepper') return <Pepper scale={scale} />;
  return <GenericCrop scale={scale} />;
}

function Terrain({ width, depth }) {
  return <group><mesh position={[0, -.3, 0]} receiveShadow castShadow><boxGeometry args={[width, .6, depth]} /><meshStandardMaterial color="#8b623b" roughness={1} /></mesh><mesh position={[0, .04, 0]} receiveShadow><boxGeometry args={[width - .12, .1, depth - .12]} /><meshStandardMaterial color="#9b7545" roughness={1} /></mesh><mesh position={[0, .11, 0]} receiveShadow><boxGeometry args={[width - .45, .06, depth - .45]} /><meshStandardMaterial color="#547c3f" roughness={1} /></mesh></group>;
}

function Scene({ layout, showMain, showIntercrop, selectedCrop, onSelectCrop, resetToken }) {
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const { camera, size } = useThree();
  const spacing = numberFrom(layout.main_crop_spacing?.row_spacing_m, 7.5);
  const plantSpacing = numberFrom(layout.main_crop_spacing?.plant_spacing_m, 7.5);
  const rows = Math.max(3, Math.min(7, Math.round(32 / spacing)));
  const plants = Math.max(3, Math.min(7, Math.round(28 / plantSpacing)));
  const width = 8.8;
  const depth = 5.8;
  const planting = useMemo(() => {
    const points = [];
    for (let row = 0; row < rows; row += 1) {
      for (let plant = 0; plant < plants; plant += 1) points.push({ crop: 'main', position: [((plant / Math.max(1, plants - 1)) - .5) * 7.2, .18, ((row / Math.max(1, rows - 1)) - .5) * 4.2] });
      for (let plant = 0; plant < plants * 2; plant += 1) points.push({ crop: 'intercrop', position: [((plant / Math.max(1, plants * 2 - 1)) - .5) * 7.2, .17, ((row / Math.max(1, rows - 1)) - .5) * 4.2 + .34] });
    }
    return points;
  }, [plants, rows]);

  const frameTerrain = useCallback(() => {
    if (!sceneRef.current || !controlsRef.current || !size.width || !size.height) return;
    sceneRef.current.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(sceneRef.current);
    const center = bounds.getCenter(new THREE.Vector3());
    const aspect = size.width / size.height;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const direction = new THREE.Vector3(1, .78, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, 10);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const corners = [
      [bounds.min.x, bounds.min.y, bounds.min.z], [bounds.min.x, bounds.min.y, bounds.max.z],
      [bounds.min.x, bounds.max.y, bounds.min.z], [bounds.min.x, bounds.max.y, bounds.max.z],
      [bounds.max.x, bounds.min.y, bounds.min.z], [bounds.max.x, bounds.min.y, bounds.max.z],
      [bounds.max.x, bounds.max.y, bounds.min.z], [bounds.max.x, bounds.max.y, bounds.max.z],
    ];
    const projected = corners.map((corner) => new THREE.Vector3(...corner).sub(center));
    const horizontalHalf = Math.max(...projected.map((point) => Math.abs(point.dot(right))));
    const verticalHalf = Math.max(...projected.map((point) => Math.abs(point.dot(up))));
    const distance = Math.max(
      horizontalHalf / Math.tan(horizontalFov / 2),
      verticalHalf / Math.tan(verticalFov / 2),
    ) * 1.45;
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = Math.max(.1, distance / 100);
    camera.far = Math.max(100, distance * 10);
    camera.updateProjectionMatrix();
    controlsRef.current.target.copy(center).add(new THREE.Vector3(0, .2, 0));
    controlsRef.current.minDistance = Math.max(2, distance * .55);
    controlsRef.current.maxDistance = Math.max(12, distance * 2.2);
    controlsRef.current.update();
  }, [camera, size.height, size.width]);

  useEffect(() => {
    const frameId = requestAnimationFrame(frameTerrain);
    return () => cancelAnimationFrame(frameId);
  }, [frameTerrain, layout.main_crop, layout.intercrop, resetToken]);

  return <><color attach="background" args={['#dfe9d7']} /><ambientLight intensity={1.4} /><directionalLight castShadow position={[5, 9, 4]} intensity={3} shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} /><group ref={sceneRef}><Terrain width={width} depth={depth} />{layout.irrigation_line_layout && <mesh position={[0, .24, -.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7.7, .045]} /><meshStandardMaterial color="#397f9a" roughness={.55} /></mesh>}<group>{planting.map((plant, index) => { const visible = plant.crop === 'main' ? showMain : showIntercrop; const selected = selectedCrop === plant.crop; if (!visible) return null; return <group key={`${plant.crop}-${index}`} position={plant.position} onClick={(event) => { event.stopPropagation(); onSelectCrop(plant.crop); }}><CropModel crop={plant.crop === 'main' ? layout.main_crop : layout.intercrop} scale={plant.crop === 'main' ? (selected ? .75 : .62) : (selected ? .42 : .34)} /></group>; })}</group></group><ContactShadows position={[0, .02, 0]} opacity={.28} scale={10} blur={2.2} far={7} /><OrbitControls ref={controlsRef} makeDefault enablePan={false} minPolarAngle={.65} maxPolarAngle={1.32} /></>;
}

export default function FarmLayout3D({ layout, showMain, showIntercrop, selectedCrop, onSelectCrop, resetToken }) {
  const hasWebGL = typeof document === 'undefined' || Boolean(document.createElement('canvas').getContext('webgl'));
  if (!hasWebGL) return <div className="layout-webgl-fallback">3D rendering is unavailable in this browser. Switch to the 2D plan view.</div>;
  return <Canvas className="farm-layout-canvas" shadows camera={{ position: [9, 7.5, 9], fov: 36 }} dpr={[1, 1.6]} fallback={<div className="layout-webgl-fallback">3D rendering is unavailable. Switch to the 2D plan view.</div>}><Suspense fallback={null}><Scene layout={layout} showMain={showMain} showIntercrop={showIntercrop} selectedCrop={selectedCrop} onSelectCrop={onSelectCrop} resetToken={resetToken} /></Suspense></Canvas>;
}
