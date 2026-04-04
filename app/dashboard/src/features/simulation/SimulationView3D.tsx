import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, OrthographicCamera, RoundedBox, Text, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import type { SimulatorState } from '../../hooks/simTypes';
import { useMachineSceneModel } from './hooks/useMachineSceneModel';
import { MACHINE_LAYOUT_3D, getLaneZ3D } from './machineLayout';
import './simulation.css';


type CameraPresetKey = 'overview' | 'grouping' | 'transfer' | 'tray' | 'transport' | 'discharge';

interface ViewerLayerState {
  frame: boolean;
  product: boolean;
  tray: boolean;
  transport: boolean;
  sensors: boolean;
}

interface SimulationView3DProps {
  state: SimulatorState | null;
  cameraPreset?: CameraPresetKey;
  layerVisibility?: ViewerLayerState;
  controlsEnabled?: boolean;
  showSceneHud?: boolean;
}

const DEFAULT_LAYERS: ViewerLayerState = {
  frame: true,
  product: true,
  tray: true,
  transport: true,
  sensors: true,
};

const CAMERA_PRESETS: Record<CameraPresetKey, { position: [number, number, number]; target: [number, number, number]; zoom: number }> = {
  overview: { position: [20, 18, 22], target: [0.5, 1.9, 1.2], zoom: 19 },
  grouping: { position: [-1.5, 13.5, 18.5], target: [-7.3, 2.8, 0], zoom: 28 },
  transfer: { position: [5.4, 12.4, 18.8], target: [0.55, 3.15, 0.2], zoom: 27 },
  tray: { position: [-2.5, 11.4, 19], target: [-7.3, 1.3, 3.2], zoom: 28 },
  transport: { position: [16.5, 13.2, 17], target: [8.8, 3, 0], zoom: 27 },
  discharge: { position: [20, 11.8, 14.5], target: [15.1, 2.8, 0], zoom: 31 },
};

const PALETTE = {
  frame: '#334155',
  frameDark: '#1E293B',
  deck: '#0F172A',
  cover: '#A8B4C3',
  coverDark: '#7B8795',
  rail: '#94A3B8',
  actuator: '#C2410C',
  actuatorBright: '#F59E0B',
  cartonBase: '#8B5A2B',
  cartonFold: '#A16207',
  cartonEdge: '#6B3E14',
  product: '#10B981',
} as const;

// --- SHARED ASSETS FOR PERFORMANCE ---
const SHARED_MATERIALS = {
  frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, metalness: 0.22, roughness: 0.5 }),
  frameDark: new THREE.MeshStandardMaterial({ color: PALETTE.frameDark, metalness: 0.18, roughness: 0.58 }),
  cover: new THREE.MeshStandardMaterial({ color: PALETTE.cover, metalness: 0.34, roughness: 0.34 }),
  coverDark: new THREE.MeshStandardMaterial({ color: PALETTE.coverDark, metalness: 0.28, roughness: 0.34 }),
  rail: new THREE.MeshStandardMaterial({ color: PALETTE.rail, roughness: 0.46, metalness: 0.28 }),
  cartonBase: new THREE.MeshStandardMaterial({ color: PALETTE.cartonBase, roughness: 0.8, metalness: 0.06 }),
  cartonFold: new THREE.MeshStandardMaterial({ color: PALETTE.cartonFold, roughness: 0.78, metalness: 0.03 }),
  cartonEdge: new THREE.MeshStandardMaterial({ color: PALETTE.cartonEdge, roughness: 0.9, metalness: 0.02 }),
  product: new THREE.MeshStandardMaterial({ color: PALETTE.product, metalness: 0.28, roughness: 0.28 }),
  floor: new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.96, metalness: 0.02 }),
};
// -------------------------------------


function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function smoothstep(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function sampleBlankPath(x: number) {
  const { blankPath, deckHeights } = MACHINE_LAYOUT_3D;
  if (x <= blankPath.rampStartX) {
    return { x, y: deckHeights.lowTransport + 0.1, angle: 0 };
  }
  if (x >= blankPath.transferX) {
    return { x, y: blankPath.transferY, angle: 0 };
  }

  const t = (x - blankPath.rampStartX) / (blankPath.transferX - blankPath.rampStartX);
  const eased = smoothstep(t);
  const y = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY, eased);

  const epsilon = 0.08;
  const x2 = Math.min(blankPath.transferX, x + epsilon);
  const t2 = (x2 - blankPath.rampStartX) / (blankPath.transferX - blankPath.rampStartX);
  const eased2 = smoothstep(t2);
  const y2 = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY, eased2);
  const angle = Math.atan2(y2 - y, x2 - x);

  return { x, y, angle };
}

function CameraRig({
  presetKey,
  controlsEnabled,
}: {
  presetKey: CameraPresetKey;
  controlsEnabled: boolean;
}) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const controlsRef = useRef<any>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    if (!cameraRef.current) return;
    const preset = CAMERA_PRESETS[presetKey];
    cameraRef.current.position.set(...preset.position);
    cameraRef.current.zoom = preset.zoom;
    cameraRef.current.up.set(0, 1, 0);
    cameraRef.current.lookAt(...preset.target);
    cameraRef.current.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
    }
    invalidate();
  }, [presetKey, invalidate]);

  return (
    <>
      <OrthographicCamera ref={cameraRef} makeDefault near={0.1} far={100} />
      <OrbitControls
        ref={controlsRef}
        enabled={controlsEnabled}
        enableDamping
        dampingFactor={0.08}
        minZoom={18}
        maxZoom={44}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.15}
        minAzimuthAngle={-Math.PI / 2.6}
        maxAzimuthAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={38}
        screenSpacePanning
      />
    </>
  );
}

function ZoneLabel({ position, label, active }: { position: [number, number, number]; label: string; active: boolean }) {
  return (
    <Text
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.48}
      color={active ? '#34D399' : '#64748B'}
      anchorX="center"
      anchorY="middle"
    >
      {label}
    </Text>
  );
}

function FlowArrow({
  position,
  length,
  active,
  color = '#38BDF8',
  rotationY = 0,
}: {
  position: [number, number, number];
  length: number;
  active: boolean;
  color?: string;
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, 0.24]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.34 : 0.12} />
      </mesh>
      <mesh position={[length / 2, 0.01, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.28, 0.62, 3]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.6 : 0.16} />
      </mesh>
    </group>
  );
}

function SensorPost({
  position,
  active,
  label,
}: {
  position: [number, number, number];
  active: boolean;
  label: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.18, 1.1, 0.18]} />
        <meshStandardMaterial color="#64748B" roughness={0.48} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.45, 0.36, 0.28]} />
        <meshStandardMaterial color={active ? '#38BDF8' : '#1E293B'} emissive={active ? '#38BDF8' : '#000000'} emissiveIntensity={active ? 0.6 : 0} />
      </mesh>
      <Text
        position={[0, 1.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function RejectConveyor({
  storedPositions,
  active,
  liveRejectActive,
  liveRejectX,
}: {
  storedPositions: number[];
  active: boolean;
  liveRejectActive: boolean;
  liveRejectX: number;
}) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x, 0.94, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]} castShadow receiveShadow>
        <boxGeometry args={[MACHINE_LAYOUT_3D.zones.rejectConveyor.width, 0.12, MACHINE_LAYOUT_3D.zones.rejectConveyor.depth]} />
        <meshStandardMaterial color={PALETTE.frameDark} metalness={0.16} roughness={0.8} />
      </mesh>
      <mesh position={[15.36, 1.0, 2.48]} rotation={[0, 0, 0.24]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.06, 0.42]} />
        <meshStandardMaterial color={PALETTE.frame} metalness={0.22} roughness={0.54} />
      </mesh>
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x, 0.87, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]} castShadow receiveShadow>
        <boxGeometry args={[MACHINE_LAYOUT_3D.zones.rejectConveyor.width, 0.16, 0.08]} />
        <meshStandardMaterial color={PALETTE.frameDark} metalness={0.22} roughness={0.72} />
      </mesh>
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x, 1.08, MACHINE_LAYOUT_3D.zones.rejectConveyor.z + 0.72]} castShadow receiveShadow>
        <boxGeometry args={[MACHINE_LAYOUT_3D.zones.rejectConveyor.width, 0.22, 0.06]} />
        <meshStandardMaterial color={PALETTE.coverDark} metalness={0.28} roughness={0.4} />
      </mesh>
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x, 1.08, MACHINE_LAYOUT_3D.zones.rejectConveyor.z - 0.72]} castShadow receiveShadow>
        <boxGeometry args={[MACHINE_LAYOUT_3D.zones.rejectConveyor.width, 0.22, 0.06]} />
        <meshStandardMaterial color={PALETTE.coverDark} metalness={0.28} roughness={0.4} />
      </mesh>
      {Array.from({ length: 6 }).map((_, index) => (
        <mesh
          key={`reject-slat-${index}`}
          position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x - 2.1 + index * 0.88, 1.0, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.48, 0.03, 1.16]} />
          <meshStandardMaterial color={PALETTE.coverDark} metalness={0.22} roughness={0.5} />
        </mesh>
      ))}
      {storedPositions.map((xPosition, index) => (
        <group key={index} position={[xPosition, 1.14, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.78, 0.3, 1.06]} />
            <meshStandardMaterial color={active ? '#7F1D1D' : PALETTE.cartonBase} roughness={0.72} metalness={0.06} />
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow material={SHARED_MATERIALS.cartonFold}>
            <boxGeometry args={[1.54, 0.03, 0.92]} />
          </mesh>
        </group>
      ))}
      {liveRejectActive && (
        <group position={[liveRejectX, 1.14, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.78, 0.3, 1.06]} />
            <meshStandardMaterial color="#B91C1C" emissive="#7F1D1D" emissiveIntensity={0.18} roughness={0.72} metalness={0.06} />
          </mesh>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.54, 0.03, 0.92]} />
            <meshStandardMaterial color="#FB7185" roughness={0.74} metalness={0.04} />
          </mesh>
        </group>
      )}
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x - 2.8, 1.08, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.22, 1.44]} />
        <meshStandardMaterial color={PALETTE.coverDark} metalness={0.28} roughness={0.4} />
      </mesh>
      <mesh position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x + 2.8, 1.08, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.22, 1.44]} />
        <meshStandardMaterial color={PALETTE.coverDark} metalness={0.28} roughness={0.4} />
      </mesh>
      <Text
        position={[MACHINE_LAYOUT_3D.zones.rejectConveyor.x, 2.32, MACHINE_LAYOUT_3D.zones.rejectConveyor.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.24}
        color={active ? '#FCA5A5' : '#94A3B8'}
        anchorX="center"
        anchorY="middle"
      >
        REJECT CONVEYOR
      </Text>
    </group>
  );
}

function MachineSupport({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[0.28, height, 0.28]} />
      <meshStandardMaterial color={PALETTE.frame} metalness={0.24} roughness={0.48} />
    </mesh>
  );
}

function ChainInfeed({
  active,
  progress,
  gapSensorActive,
  completenessCameraActive,
}: {
  active: boolean;
  progress: number;
  gapSensorActive: boolean;
  completenessCameraActive: boolean;
}) {
  const lugRef = useRef<Group>(null);

  useFrame(() => {
    if (!lugRef.current) return;
    const lugTravel = active ? progress * 3.3 : 0;
    lugRef.current.position.x = MACHINE_LAYOUT_3D.productPath.transferX - 2.7 + lugTravel;
  });

  return (
    <group>
      <mesh position={[MACHINE_LAYOUT_3D.zones.transfer.x - 0.15, 3.02, 0]} receiveShadow>
        <boxGeometry args={[5.25, 0.08, 4.08]} />
        <meshStandardMaterial color={PALETTE.deck} roughness={0.96} metalness={0.04} transparent opacity={0.34} />
      </mesh>
      {[-1.96, 1.96].map((z) => (
        <group key={`side-frame-${z}`} position={[MACHINE_LAYOUT_3D.zones.transfer.x - 0.15, 3.76, z]}>
          <mesh castShadow receiveShadow material={SHARED_MATERIALS.cover}>
            <boxGeometry args={[5.05, 0.1, 0.08]} />
          </mesh>
          <mesh position={[-2.35, -1.1, 0]} castShadow receiveShadow material={SHARED_MATERIALS.cover}>
            <boxGeometry args={[0.1, 2.34, 0.1]} />
          </mesh>
          <mesh position={[2.25, -1.1, 0]} castShadow receiveShadow material={SHARED_MATERIALS.cover}>
            <boxGeometry args={[0.1, 2.34, 0.1]} />
          </mesh>
        </group>
      ))}
      <mesh position={[MACHINE_LAYOUT_3D.zones.transfer.x - 2.58, 3.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 1.24, 4.0]} />
        <meshStandardMaterial color={PALETTE.cover} metalness={0.35} roughness={0.38} />
      </mesh>
      {[-1.55, -0.52, 0.52, 1.55].map((z) => (
        <mesh key={`guide-${z}`} position={[MACHINE_LAYOUT_3D.zones.transfer.x + 0.1, 3.19, z]} castShadow receiveShadow material={SHARED_MATERIALS.rail}>
          <boxGeometry args={[4.36, 0.05, 0.06]} />
        </mesh>
      ))}
      {[-1.55, 1.55].map((z) => (
        <mesh key={`lower-guide-${z}`} position={[MACHINE_LAYOUT_3D.zones.transfer.x + 0.15, 3.0, z]} castShadow receiveShadow>
          <boxGeometry args={[4.3, 0.03, 0.05]} />
          <meshStandardMaterial color={PALETTE.frame} roughness={0.74} metalness={0.18} />
        </mesh>
      ))}
      <group ref={lugRef} position={[MACHINE_LAYOUT_3D.productPath.transferX - 2.7, 3.24, 0]}>
        {[-1.55, -0.52, 0.52, 1.55].map((z, index) => (
          <group key={z} position={[0, 0, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.1, 0.22, 0.14]} />
              <meshStandardMaterial color={PALETTE.product} roughness={0.34} metalness={0.16} emissive="#14532D" emissiveIntensity={active ? 0.44 : 0.1} />
            </mesh>
            <mesh position={[-0.72, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.44, 0.08, 0.08]} />
              <meshStandardMaterial color={PALETTE.coverDark} roughness={0.56} metalness={0.24} />
            </mesh>
            <mesh position={[0.24, 0.18, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.26, 0.14, 0.1]} />
              <meshStandardMaterial color="#A7F3D0" roughness={0.28} metalness={0.08} emissive="#34D399" emissiveIntensity={active ? 0.22 : 0.04} />
            </mesh>
            <mesh position={[index % 2 === 0 ? -1.5 : -0.8, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.92, 0.08, 0.08]} />
              <meshStandardMaterial color={PALETTE.frame} roughness={0.62} metalness={0.22} />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[MACHINE_LAYOUT_3D.zones.transfer.x - 1.35, 3.6, 2.18]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.62, 0.12]} />
          <meshStandardMaterial color="#64748B" roughness={0.46} metalness={0.28} />
        </mesh>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.44, 0.22, 0.22]} />
          <meshStandardMaterial color={gapSensorActive ? '#38BDF8' : '#1E293B'} emissive={gapSensorActive ? '#38BDF8' : '#000000'} emissiveIntensity={gapSensorActive ? 0.55 : 0} />
        </mesh>
      </group>
      <group position={[MACHINE_LAYOUT_3D.zones.transfer.x + 1.88, 4.26, -2.28]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.42, 0.62]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.32} roughness={0.28} />
        </mesh>
        <mesh position={[0.26, -0.04, 0]} castShadow receiveShadow rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.22, 18]} />
          <meshStandardMaterial color="#0EA5E9" emissive="#38BDF8" emissiveIntensity={completenessCameraActive ? 0.65 : 0.12} />
        </mesh>
        <mesh position={[-0.18, -0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.28} roughness={0.36} />
        </mesh>
      </group>
    </group>
  );
}

function SidePushers({
  progress,
}: {
  progress: number;
}) {
  const compact = Math.max(0, Math.min(1, progress));
  const x = MACHINE_LAYOUT_3D.productPath.transferX - 1.1;
  const upperZ = lerp(2.65, 1.25, compact);
  const lowerZ = lerp(-2.65, -1.25, compact);
  const beamLength = lerp(1.3, 2.5, compact);
  const glow = 0.06 + compact * 0.24;

  return (
    <group>
      <mesh position={[x, 3.28, 2.9]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 1.24, 0.12]} />
        <meshStandardMaterial color={PALETTE.cover} metalness={0.36} roughness={0.32} />
      </mesh>
      <mesh position={[x, 3.28, -2.9]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 1.24, 0.12]} />
        <meshStandardMaterial color={PALETTE.cover} metalness={0.36} roughness={0.32} />
      </mesh>
      <group position={[x, 3.28, upperZ]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[beamLength, 0.12, 0.12]} />
          <meshStandardMaterial color={PALETTE.actuatorBright} emissive={PALETTE.actuatorBright} emissiveIntensity={glow} roughness={0.36} metalness={0.12} />
        </mesh>
        <mesh position={[beamLength / 2 - 0.14, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.28, 0.18]} />
          <meshStandardMaterial color={PALETTE.actuator} emissive={PALETTE.actuator} emissiveIntensity={glow * 0.9} roughness={0.28} metalness={0.08} />
        </mesh>
      </group>
      <group position={[x, 3.28, lowerZ]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[beamLength, 0.12, 0.12]} />
          <meshStandardMaterial color={PALETTE.actuatorBright} emissive={PALETTE.actuatorBright} emissiveIntensity={glow} roughness={0.36} metalness={0.12} />
        </mesh>
        <mesh position={[beamLength / 2 - 0.14, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.28, 0.18]} />
          <meshStandardMaterial color={PALETTE.actuator} emissive={PALETTE.actuator} emissiveIntensity={glow * 0.9} roughness={0.28} metalness={0.08} />
        </mesh>
      </group>
    </group>
  );
}

function SuctionArm({ active, progress, z }: { active: boolean; progress: number; z: number }) {
  const armRef = useRef<Group>(null);

  useFrame(() => {
    if (!armRef.current) return;
    const drop = active ? Math.sin(Math.min(progress, 1) * Math.PI) * 0.9 : 0;
    armRef.current.position.y = 2.5 - drop;
    armRef.current.rotation.z = active ? -0.08 - drop * 0.05 : -0.08;
  });

  return (
    <group ref={armRef} position={[-5.9, 2.5, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.16, 0.16]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[1.8, -0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.86, 0.12]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.35} roughness={0.28} />
      </mesh>
      {[-0.4, 0, 0.4].map((z) => (
        <mesh key={z} position={[1.8, -0.92, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 16]} />
          <meshStandardMaterial color="#0EA5E9" emissive="#0EA5E9" emissiveIntensity={active ? 0.35 : 0.1} />
        </mesh>
      ))}
    </group>
  );
}

function LugTrack({ active }: { active: boolean }) {
  const trackRef = useRef<Group>(null);
  const offsetRef = useRef(0);

  useFrame((_, delta) => {
    if (!trackRef.current) return;
    if (active) {
      offsetRef.current = (offsetRef.current + delta * 2.8) % 2.4;
    }
    trackRef.current.position.x = offsetRef.current;
  });

  return (
    <group ref={trackRef}>
      {Array.from({ length: 12 }).map((_, index) => {
        const x = MACHINE_LAYOUT_3D.zones.mainTransport.x - 4.8 + index * 2.4;
        return (
          <group key={index} position={[x, MACHINE_LAYOUT_3D.deckHeights.products + 0.07, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.18, 0.55, 1.5]} />
              <meshStandardMaterial color="#475569" metalness={0.35} roughness={0.55} />
            </mesh>
            <mesh position={[0.5, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.95, 0.12, 1.4]} />
              <meshStandardMaterial color="#64748B" metalness={0.25} roughness={0.62} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function GroupedLaneFill({ laneFillCounts, rowCount, colCount }: { laneFillCounts: number[]; rowCount: number; colCount: number }) {
  const laneZ = useMemo(() => getLaneZ3D(rowCount), [rowCount]);
  const activeLaneIndex = Math.max(0, laneFillCounts.findIndex(count => count < colCount));

  return (
    <group>
      {laneZ.map((z, lane) => (
        <mesh key={`lane-base-${lane}`} position={[MACHINE_LAYOUT_3D.zones.grouping.x, MACHINE_LAYOUT_3D.deckHeights.high + 0.02, z]} receiveShadow>
          <boxGeometry args={[MACHINE_LAYOUT_3D.zones.grouping.width - 0.4, 0.05, 0.78]} />
          <meshStandardMaterial color={lane === activeLaneIndex ? '#1E3A2F' : '#0F172A'} emissive={lane === activeLaneIndex ? '#14532D' : '#000000'} emissiveIntensity={lane === activeLaneIndex ? 0.35 : 0} roughness={0.92} metalness={0.06} />
        </mesh>
      ))}
      {laneFillCounts.map((count, lane) =>
        Array.from({ length: count }).map((_, slot) => (
          <mesh key={`${lane}-${slot}`} position={[MACHINE_LAYOUT_3D.zones.grouping.x - 2.65 + slot * 0.62, MACHINE_LAYOUT_3D.deckHeights.products, laneZ[lane]]} castShadow receiveShadow material={SHARED_MATERIALS.product}>
            <boxGeometry args={[MACHINE_LAYOUT_3D.productSize3D, MACHINE_LAYOUT_3D.productSize3D, MACHINE_LAYOUT_3D.productSize3D]} />
          </mesh>
        ))
      )}
      <group position={[MACHINE_LAYOUT_3D.productPath.groupingX - 1.85, MACHINE_LAYOUT_3D.deckHeights.products - 0.08, laneZ[Math.min(activeLaneIndex, rowCount - 1)]]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.22, 1.16, 1.48]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.42} roughness={0.28} emissive="#94A3B8" emissiveIntensity={0.14} />
        </mesh>
      </group>
    </group>
  );
}

function DividerModule({ currentLane, rowCount }: { currentLane: number; rowCount: number }) {
  const carriageRef = useRef<Group>(null);
  const laneZ = useMemo(() => getLaneZ3D(rowCount), [rowCount]);

  useFrame(() => {
    if (!carriageRef.current) return;
    const targetZ = laneZ[Math.min(currentLane, rowCount - 1)] || 0;
    carriageRef.current.position.z = THREE.MathUtils.lerp(carriageRef.current.position.z, targetZ, 0.15);
  });

  return (
    <group position={[-10.55, 3.22, 0]}>
      {/* Static Base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.05, 4.2]} />
        <meshStandardMaterial color={PALETTE.frameDark} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Guide Rails */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={`rail-${x}`} position={[x, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 4.0, 12]} />
          <meshStandardMaterial color={PALETTE.rail} metalness={0.6} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Moving Carriage */}
      <group ref={carriageRef}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.15, 1.4]} />
          <meshStandardMaterial color={PALETTE.cover} metalness={0.3} roughness={0.4} />
        </mesh>
        {/* Guide arms extending to products */}
        {[-0.4, 0.4].map((z) => (
          <mesh key={`arm-${z}`} position={[1.2, 0.35, z]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.1, 0.05]} />
            <meshStandardMaterial color={PALETTE.actuatorBright} metalness={0.2} roughness={0.3} />
          </mesh>
        ))}
        {/* Motor/Actuator */}
        <mesh position={[-0.2, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.3, 0.6]} />
          <meshStandardMaterial color={PALETTE.actuator} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.2, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.1, 0.2]} />
          <meshStandardMaterial color="#0EA5E9" emissive="#38BDF8" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function ProductSlug({
  visible,
  x,
  opacity,
  rowCount,
  colCount,
  compression,
  productScale,
}: {
  visible: boolean;
  x: number;
  opacity: number;
  rowCount: number;
  colCount: number;
  compression: number;
  productScale: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    
    materialRef.current.opacity = opacity;
    
    const rowSpacing = lerp(2.15, 0.95, compression);
    const zPositions = Array.from({ length: rowCount }, (_, lane) => lerp(-rowSpacing, rowSpacing, rowCount === 1 ? 0.5 : lane / (rowCount - 1)));
    
    let i = 0;
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        dummy.position.set(col * 0.54, 0, zPositions[row]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!visible) return null;
  
  return (
    <group position={[x, MACHINE_LAYOUT_3D.deckHeights.products, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, rowCount * colCount]} castShadow receiveShadow>
        <boxGeometry args={[productScale, productScale, productScale]} />
        <meshStandardMaterial ref={materialRef} color="#10B981" emissive="#10B981" emissiveIntensity={0.12} metalness={0.28} roughness={0.28} transparent />
      </instancedMesh>
    </group>
  );
}

function FlatBlank({
  visible,
  x,
  z,
}: {
  visible: boolean;
  x: number;
  z: number;
}) {
  if (!visible) return null;
  const segmentCount = 11;
  const segmentOffsets = Array.from({ length: segmentCount }, (_, index) => -1.5 + index * 0.3);

  return (
    <group>
      {segmentOffsets.map((offset) => {
        const pose = sampleBlankPath(x + offset);
        return (
          <mesh
            key={offset}
            position={[pose.x, pose.y, z]}
            rotation={[0, 0, pose.angle]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[0.32, 0.035, 2]} />
            <meshStandardMaterial color="#A16207" roughness={0.72} metalness={0.05} />
          </mesh>
        );
      })}
      {[-0.96, 0.96].map((edgeOffset) => {
        const pose = sampleBlankPath(x);
        return (
          <mesh
            key={edgeOffset}
            position={[pose.x + Math.cos(pose.angle) * 0.02, pose.y + 0.02, z + edgeOffset]}
            rotation={[0, 0, pose.angle]}
            receiveShadow
          >
            <boxGeometry args={[3.1, 0.012, 0.02]} />
            <meshStandardMaterial color="#78350F" roughness={0.84} metalness={0.02} />
          </mesh>
        );
      })}
    </group>
  );
}

function BlankLiftPath() {
  const { blankPath, zones, deckHeights } = MACHINE_LAYOUT_3D;
  const rampStart = blankPath.rampStartX;
  const rampEnd = blankPath.transferX;
  const segmentCount = 12;

  return (
    <group>
      {/* Lower horizontal path */}
      <mesh position={[(zones.blankTransport.x + rampStart) / 2 - 1.0, deckHeights.lowTransport, zones.blankTransport.z]} receiveShadow>
        <boxGeometry args={[zones.blankTransport.width + (zones.blankTransport.x - rampStart), 0.08, zones.blankTransport.depth]} />
        <meshStandardMaterial color="#111827" roughness={0.88} metalness={0.1} />
      </mesh>
      
      {/* Ramp segments */}
      {Array.from({ length: segmentCount }).map((_, index) => {
        const t0 = index / segmentCount;
        const t1 = (index + 1) / segmentCount;
        const x0 = lerp(rampStart, rampEnd, t0);
        const x1 = lerp(rampStart, rampEnd, t1);
        const y0 = lerp(deckHeights.lowTransport, blankPath.transferY - 0.12, smoothstep(t0));
        const y1 = lerp(deckHeights.lowTransport, blankPath.transferY - 0.12, smoothstep(t1));
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <mesh
            key={index}
            position={[(x0 + x1) / 2, (y0 + y1) / 2, blankPath.z]}
            rotation={[0, 0, angle]}
            receiveShadow
          >
            <boxGeometry args={[length + 0.02, 0.08, 1.2]} />
            <meshStandardMaterial color="#1F2937" roughness={0.86} metalness={0.12} />
          </mesh>
        );
      })}

      {/* Guide rails */}
      {[-0.52, 0.52].map((zOffset) => (
        <group key={zOffset}>
          {/* Lower horizontal rail */}
          <mesh position={[(zones.blankTransport.x + rampStart) / 2 - 1.0, deckHeights.lowTransport + 0.1, zones.blankTransport.z + zOffset]} receiveShadow>
            <boxGeometry args={[zones.blankTransport.width + (zones.blankTransport.x - rampStart), 0.06, 0.08]} />
            <meshStandardMaterial color="#64748B" roughness={0.56} metalness={0.24} />
          </mesh>
          
          {/* Ramp rail segments */}
          {Array.from({ length: segmentCount }).map((_, index) => {
            const t0 = index / segmentCount;
            const t1 = (index + 1) / segmentCount;
            const x0 = lerp(rampStart, rampEnd, t0);
            const x1 = lerp(rampStart, rampEnd, t1);
            const y0 = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY + 0.02, smoothstep(t0));
            const y1 = lerp(deckHeights.lowTransport + 0.1, blankPath.transferY + 0.02, smoothstep(t1));
            const dx = x1 - x0;
            const dy = y1 - y0;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            return (
              <mesh
                key={`${zOffset}-${index}`}
                position={[(x0 + x1) / 2, (y0 + y1) / 2, blankPath.z + zOffset]}
                rotation={[0, 0, angle]}
                receiveShadow
              >
                <boxGeometry args={[length + 0.02, 0.05, 0.06]} />
                <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.28} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function FormedCarton({
  visible,
  x,
  z,
  formProgress,
  rejectActive,
}: {
  visible: boolean;
  x: number;
  z: number;
  formProgress: number;
  rejectActive: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const leftWallRef = useRef<Mesh>(null);
  const rightWallRef = useRef<Mesh>(null);
  const frontFlapRef = useRef<Mesh>(null);
  const rearFlapRef = useRef<Mesh>(null);
  const topPanelRef = useRef<Mesh>(null);
  const topSealLeftRef = useRef<Mesh>(null);
  const topSealRightRef = useRef<Mesh>(null);

  useFrame(() => {
    if (
      !groupRef.current ||
      !leftWallRef.current ||
      !rightWallRef.current ||
      !frontFlapRef.current ||
      !rearFlapRef.current ||
      !topPanelRef.current ||
      !topSealLeftRef.current ||
      !topSealRightRef.current
    ) return;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x, 0.1);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, z + (rejectActive ? 2.4 : 0), 0.08);

    const sideHeight = lerp(0.01, 0.56, Math.max(0, (formProgress - 0.12) / 0.88));
    const sideInset = lerp(1.5, 1.08, formProgress);
    const flapHeight = lerp(0.01, 0.34, Math.max(0, (formProgress - 0.34) / 0.66));
    const flapInset = lerp(0.98, 0.74, Math.max(0, (formProgress - 0.34) / 0.66));
    const topLift = lerp(0.03, 0.58, Math.max(0, (formProgress - 0.58) / 0.42));
    const topWidth = lerp(0.02, 1.66, Math.max(0, (formProgress - 0.64) / 0.36));

    leftWallRef.current.scale.y = sideHeight;
    rightWallRef.current.scale.y = sideHeight;
    leftWallRef.current.position.set(-sideInset, 0.46 * sideHeight, 0);
    rightWallRef.current.position.set(sideInset, 0.46 * sideHeight, 0);

    frontFlapRef.current.scale.y = flapHeight;
    rearFlapRef.current.scale.y = flapHeight;
    frontFlapRef.current.position.set(0, 0.3 * flapHeight, flapInset);
    rearFlapRef.current.position.set(0, 0.3 * flapHeight, -flapInset);

    topPanelRef.current.scale.x = topWidth;
    topPanelRef.current.position.set(0, topLift, 0);

    topSealLeftRef.current.position.set(0, topLift + 0.025, 0.68);
    topSealRightRef.current.position.set(0, topLift + 0.025, -0.68);
    const sealOpacity = Math.max(0, (formProgress - 0.78) / 0.22);
    (topSealLeftRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = sealOpacity * 0.6;
    (topSealRightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = sealOpacity * 0.6;
  });

  if (!visible) return null;
  return (
    <group ref={groupRef} position={[x, MACHINE_LAYOUT_3D.deckHeights.products - 0.22, z]}>
      <mesh castShadow receiveShadow material={SHARED_MATERIALS.cartonBase}>
        <boxGeometry args={[2.96, 0.045, 1.88]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[2.76, 1.64]} />
        <meshStandardMaterial color={PALETTE.cartonBase} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh ref={leftWallRef} position={[-1.48, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 0.58, 1.74]} />
        <meshStandardMaterial color={PALETTE.cartonBase} roughness={0.76} metalness={0.04} />
      </mesh>
      <mesh ref={rightWallRef} position={[1.48, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 0.58, 1.74]} />
        <meshStandardMaterial color={PALETTE.cartonBase} roughness={0.76} metalness={0.04} />
      </mesh>
      <mesh ref={frontFlapRef} position={[0, 0.02, 0.94]} castShadow receiveShadow material={SHARED_MATERIALS.cartonFold}>
        <boxGeometry args={[2.46, 0.24, 0.04]} />
      </mesh>
      <mesh ref={rearFlapRef} position={[0, 0.02, -0.94]} castShadow receiveShadow material={SHARED_MATERIALS.cartonFold}>
        <boxGeometry args={[2.46, 0.24, 0.04]} />
      </mesh>
      <mesh ref={topPanelRef} position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.66, 0.028, 1.44]} />
        <meshStandardMaterial color={PALETTE.cartonFold} roughness={0.76} metalness={0.03} />
      </mesh>
      <mesh ref={topSealLeftRef} position={[0, 0.3, 0.78]} castShadow receiveShadow>
        <boxGeometry args={[1.92, 0.02, 0.03]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={formProgress * 0.55} />
      </mesh>
      <mesh ref={topSealRightRef} position={[0, 0.3, -0.78]} castShadow receiveShadow>
        <boxGeometry args={[1.92, 0.02, 0.03]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={formProgress * 0.55} />
      </mesh>
      {[-0.72, 0.72].map((zOffset) => (
        <mesh key={zOffset} position={[0, 0.018, zOffset]} receiveShadow material={SHARED_MATERIALS.cartonEdge}>
          <boxGeometry args={[2.58, 0.016, 0.02]} />
        </mesh>
      ))}
    </group>
  );
}

function MachineScene({
  state,
  cameraPreset,
  layerVisibility,
  controlsEnabled,
}: {
  state: SimulatorState;
  cameraPreset: CameraPresetKey;
  layerVisibility: ViewerLayerState;
  controlsEnabled: boolean;
}) {
  const model = useMachineSceneModel(state);
  const pusherRef = useRef<Group>(null);

  useFrame(() => {
    if (!model || !pusherRef.current) return;
    pusherRef.current.position.x = THREE.MathUtils.lerp(pusherRef.current.position.x, model.pusherX, 0.12);
  });

  if (!model) return null;

  const phaseActive = (phase: string) => model.phase === phase;
  const { frame, zones, supports, deckHeights, blankPath } = MACHINE_LAYOUT_3D;

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 22, 44]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[12, 18, 10]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-10, 10, -8]} intensity={0.7} />
      <pointLight position={[-8, 4, 7]} intensity={0.6} color="#38BDF8" />
      <pointLight position={[8, 4, 0]} intensity={0.45} color="#F59E0B" />

      <CameraRig presetKey={cameraPreset} controlsEnabled={controlsEnabled} />
      <Environment preset="studio" environmentIntensity={0.8} />
      <ContactShadows position={[0, -0.04, 0]} opacity={0.6} scale={40} blur={2} far={4} resolution={1024} color="#000000" />
      {model.faultCode && (
        <pointLight position={[0, 8, 0]} intensity={2} color="#EF4444" distance={20} decay={2} />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]} material={SHARED_MATERIALS.floor}>
        <planeGeometry args={[40, 20]} />
      </mesh>

      {layerVisibility.frame && (
        <group>
          <RoundedBox args={[frame.base.width, frame.base.height, frame.base.depth]} radius={0.25} position={[frame.base.x, frame.base.y, frame.base.z]} castShadow receiveShadow>
            <meshStandardMaterial color={PALETTE.frameDark} roughness={0.84} metalness={0.18} />
          </RoundedBox>
          {supports.map((position, index) => (
            <MachineSupport key={index} position={position as [number, number, number]} height={2.3} />
          ))}
          {[-4.6, 0, 4.6].map((z) => (
            <mesh key={`spine-${z}`} position={[1.2, 0.88, z]} castShadow receiveShadow material={SHARED_MATERIALS.frame}>
              <boxGeometry args={[31.8, 0.14, 0.18]} />
            </mesh>
          ))}
          {[-16.6, -10.6, -4.6, 1.2, 7.4, 13.6].map((x) => (
            <mesh key={`cross-member-${x}`} position={[x, 0.92, 0]} castShadow receiveShadow material={SHARED_MATERIALS.frameDark}>
              <boxGeometry args={[0.22, 0.12, 9.4]} />
            </mesh>
          ))}
          <mesh position={[frame.lowDeck.x, frame.lowDeck.y, frame.lowDeck.z]} castShadow receiveShadow>
            <boxGeometry args={[frame.lowDeck.width, frame.lowDeck.height, frame.lowDeck.depth]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.18} roughness={0.56} />
          </mesh>
          <mesh position={[frame.highGroupingDeck.x, frame.highGroupingDeck.y, frame.highGroupingDeck.z]} castShadow receiveShadow>
            <boxGeometry args={[frame.highGroupingDeck.width, frame.highGroupingDeck.height, frame.highGroupingDeck.depth]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.18} roughness={0.58} />
          </mesh>
          <mesh position={[frame.highTransferDeck.x, frame.highTransferDeck.y, frame.highTransferDeck.z]} castShadow receiveShadow>
            <boxGeometry args={[frame.highTransferDeck.width, frame.highTransferDeck.height, frame.highTransferDeck.depth]} />
            <meshStandardMaterial color="#3B4959" metalness={0.18} roughness={0.58} />
          </mesh>
          <mesh position={[frame.highTransportDeck.x, frame.highTransportDeck.y, frame.highTransportDeck.z]} castShadow receiveShadow>
            <boxGeometry args={[frame.highTransportDeck.width, frame.highTransportDeck.height, frame.highTransportDeck.depth]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.18} roughness={0.58} />
          </mesh>
          {[-3.48, 3.48].map((z) => (
            <mesh key={`machine-side-skirt-${z}`} position={[1.0, 1.86, z]} castShadow receiveShadow>
              <boxGeometry args={[29.2, 1.96, 0.16]} />
              <meshStandardMaterial color={PALETTE.coverDark} metalness={0.2} roughness={0.44} transparent opacity={0.15} />
            </mesh>
          ))}
          <mesh position={[zones.grouping.x, 3.34, 3.0]} castShadow receiveShadow material={SHARED_MATERIALS.coverDark}>
            <boxGeometry args={[zones.grouping.width - 0.6, 0.72, 0.14]} />
          </mesh>
          <mesh position={[zones.grouping.x, 3.34, -3.0]} castShadow receiveShadow material={SHARED_MATERIALS.coverDark}>
            <boxGeometry args={[zones.grouping.width - 0.6, 0.72, 0.14]} />
          </mesh>
          <mesh position={[zones.mainTransport.x + 1.2, 3.44, 2.2]} castShadow receiveShadow material={SHARED_MATERIALS.coverDark}>
            <boxGeometry args={[zones.mainTransport.width - 2.2, 0.82, 0.14]} />
          </mesh>
          <mesh position={[zones.mainTransport.x + 1.2, 3.44, -2.2]} castShadow receiveShadow material={SHARED_MATERIALS.coverDark}>
            <boxGeometry args={[zones.mainTransport.width - 2.2, 0.82, 0.14]} />
          </mesh>
          <RoundedBox args={[zones.grouping.width + 2.2, 0.24, zones.grouping.depth + 0.8]} radius={0.15} position={[-8.8, 2.44, 0]} receiveShadow>
            <meshStandardMaterial color={PALETTE.deck} roughness={0.9} metalness={0.08} />
          </RoundedBox>
          <RoundedBox args={[6.8, 0.24, 4.9]} radius={0.12} position={[0.85, 2.48, 0]} receiveShadow>
            <meshStandardMaterial color={PALETTE.deck} roughness={0.9} metalness={0.08} />
          </RoundedBox>
          <RoundedBox args={[12.6, 0.24, 4.6]} radius={0.12} position={[10.7, 2.5, 0]} receiveShadow>
            <meshStandardMaterial color={PALETTE.deck} roughness={0.88} metalness={0.08} />
          </RoundedBox>
          <RoundedBox args={[zones.blankMagazine.width + 0.4, 0.22, zones.blankMagazine.depth + 0.3]} radius={0.15} position={[zones.blankMagazine.x, 0.62, zones.blankMagazine.z]} receiveShadow>
            <meshStandardMaterial color={PALETTE.deck} roughness={0.92} metalness={0.08} />
          </RoundedBox>
          <RoundedBox args={[zones.blankTransport.width, 0.18, zones.blankTransport.depth]} radius={0.12} position={[zones.blankTransport.x, 1.44, zones.blankTransport.z]} receiveShadow>
            <meshStandardMaterial color={PALETTE.frameDark} roughness={0.9} metalness={0.08} transparent opacity={0.4} />
          </RoundedBox>
          <RoundedBox args={[zones.mainTransport.width + 0.8, 0.2, zones.mainTransport.depth + 0.7]} radius={0.12} position={[zones.mainTransport.x, 2.48, 0]} receiveShadow>
            <meshStandardMaterial color={PALETTE.frameDark} roughness={0.88} metalness={0.08} />
          </RoundedBox>
          <mesh position={[-10.8, 2.88, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.22, 5.8]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.18} roughness={0.58} />
          </mesh>
          <mesh position={[1.45, 2.88, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.28, 0.34, 4.4]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.18} roughness={0.58} />
          </mesh>
          {[-1.5, 1.5].map((z) => (
            <mesh key={`transfer-side-bed-${z}`} position={[1.25, 2.94, z]} castShadow receiveShadow>
              <boxGeometry args={[4.8, 0.12, 0.3]} />
              <meshStandardMaterial color={PALETTE.frameDark} metalness={0.16} roughness={0.64} />
            </mesh>
          ))}
          {[-1.88, 1.88].map((z) => (
            <mesh key={`transport-side-plate-${z}`} position={[10.8, 3.08, z]} castShadow receiveShadow>
              <boxGeometry args={[12.1, 0.18, 0.18]} />
              <meshStandardMaterial color={PALETTE.frame} metalness={0.24} roughness={0.42} />
            </mesh>
          ))}
          <DividerModule currentLane={model.currentLane} rowCount={model.rowCount} />
        </group>
      )}

      {layerVisibility.tray && (
        <group>
          <mesh position={[zones.blankMagazine.x - 0.2, 1.58, zones.blankMagazine.z]} castShadow receiveShadow>
            <boxGeometry args={[3.8, 1.8, 2.0]} />
            <meshStandardMaterial color="#334155" metalness={0.24} roughness={0.72} />
          </mesh>
          {Array.from({ length: 8 }).map((_, index) => (
            <mesh key={`roll-${index}`} position={[zones.blankMagazine.x - 2.1 + index * 0.58, deckHeights.low, zones.blankMagazine.z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
              <cylinderGeometry args={[0.12, 0.12, 2.6, 18]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.4} roughness={0.3} />
            </mesh>
          ))}
          {Array.from({ length: 6 }).map((_, index) => (
            <mesh key={index} position={[zones.blankMagazine.x - 0.1 + index * 0.06, 2.38 + index * 0.08, zones.blankMagazine.z]} castShadow receiveShadow>
              <boxGeometry args={[2.8, 0.09, 1.5]} />
              <meshStandardMaterial color="#92400E" roughness={0.82} metalness={0.03} />
            </mesh>
          ))}
          <mesh position={[zones.crossTransfer.x, 1.08, zones.crossTransfer.z]} castShadow receiveShadow>
            <boxGeometry args={[zones.crossTransfer.width, 0.12, zones.crossTransfer.depth]} />
            <meshStandardMaterial color="#15803D" roughness={0.72} metalness={0.12} />
          </mesh>
          {[-6.7, -5.8, -4.9].map((x) => (
            <mesh key={`blank-holder-${x}`} position={[x, 2.38, 1.42]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.72, 0.18]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.32} roughness={0.32} />
            </mesh>
          ))}
          {[-6.7, -5.8, -4.9].map((x) => (
            <mesh key={`blank-holder-r-${x}`} position={[x, 2.38, 3.0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.72, 0.18]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.32} roughness={0.32} />
            </mesh>
          ))}
          <SuctionArm active={model.phase === 'BLANK_FEED'} progress={model.phaseProgress} z={blankPath.z} />
          <mesh position={[zones.blankWithdraw.x - 0.2, 1.58, blankPath.z]} receiveShadow>
            <boxGeometry args={[3.6, 0.08, 0.2]} />
            <meshStandardMaterial color="#64748B" metalness={0.22} roughness={0.6} />
          </mesh>
          <BlankLiftPath />
          <FlowArrow position={[-11.4, 1.32, zones.blankMagazine.z]} length={3.6} active={phaseActive('BLANK_FEED')} color="#F59E0B" />
          <FlowArrow position={[-4.4, 1.18, blankPath.z]} length={11.8} active={phaseActive('BLANK_FEED') || phaseActive('TRANSFER')} color="#F59E0B" />
          <FlatBlank visible={model.blankVisible} x={model.blankX} z={model.blankZ} />
        </group>
      )}

      {layerVisibility.product && (
        <group>
          <FlowArrow position={[-8.1, 0.09, -6.1]} length={9.6} active={phaseActive('GROUPING') || phaseActive('CAPTURED')} color="#10B981" />
          {Array.from({ length: model.rowCount }).map((_, lane) => {
            const z = lerp(-2.55, 2.55, model.rowCount === 1 ? 0.5 : lane / (model.rowCount - 1));
            return (
              <mesh key={lane} position={[zones.grouping.x, 2.55, z]} receiveShadow>
                <boxGeometry args={[zones.grouping.width - 0.2, 0.1, 0.08]} />
                <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.2} />
              </mesh>
            );
          })}
          <GroupedLaneFill laneFillCounts={model.laneFillCounts} rowCount={model.rowCount} colCount={model.colCount} />
          <ProductSlug
            visible={model.slugVisible}
            x={model.slugX}
            opacity={model.slugOpacity}
            rowCount={model.rowCount}
            colCount={model.colCount}
            compression={model.slugCompression}
            productScale={model.productScale}
          />
          <SidePushers progress={model.sidePusherProgress} />
          <mesh ref={pusherRef} position={[MACHINE_LAYOUT_3D.productPath.transferX - 2.4, 2.96, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.96, 3.4]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.48} roughness={0.3} />
          </mesh>
          <ChainInfeed
            active={model.chainInfeedActive}
            progress={model.chainInfeedOffset}
            gapSensorActive={model.gapSensorActive}
            completenessCameraActive={model.completenessCameraActive}
          />
        </group>
      )}

      {layerVisibility.transport && (
        <group>
          <FlowArrow position={[8.5, 0.09, -5.9]} length={13.4} active={phaseActive('PACKING') || phaseActive('DISCHARGE')} color="#38BDF8" />
          <mesh position={[10.35, 3.0, 0]} receiveShadow>
            <boxGeometry args={[12.3, 0.035, 2.86]} />
            <meshStandardMaterial color="#1D4ED8" roughness={0.82} metalness={0.02} transparent opacity={0.78} />
          </mesh>
          {Array.from({ length: 8 }).map((_, index) => (
            <mesh key={`transport-belt-slat-${index}`} position={[5.6 + index * 1.46, 3.03, 0]} receiveShadow>
              <boxGeometry args={[0.82, 0.012, 2.7]} />
              <meshStandardMaterial color="#2563EB" roughness={0.9} metalness={0.01} transparent opacity={0.32} />
            </mesh>
          ))}
          <mesh position={[zones.mainTransport.x - 3.3, 2.78, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.92, 6.6]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.42} roughness={0.34} />
          </mesh>
          <mesh position={[zones.mainTransport.x - 2.9, 2.78, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.92, 6.6]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.42} roughness={0.34} />
          </mesh>
          <mesh position={[10.2, deckHeights.guides, 2.08]} castShadow receiveShadow>
            <boxGeometry args={[10.8, 0.14, 0.14]} />
            <meshStandardMaterial color="#86EFAC" metalness={0.16} roughness={0.42} emissive="#14532D" emissiveIntensity={model.glueActive ? 0.14 : 0.04} />
          </mesh>
          <mesh position={[10.2, deckHeights.guides, -2.08]} castShadow receiveShadow>
            <boxGeometry args={[10.8, 0.14, 0.14]} />
            <meshStandardMaterial color="#86EFAC" metalness={0.16} roughness={0.42} emissive="#14532D" emissiveIntensity={model.glueActive ? 0.14 : 0.04} />
          </mesh>
          <mesh position={[11.2, 3.06, 2.34]} rotation={[0, 0, -0.45]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 1.1, 0.18]} />
            <meshStandardMaterial color="#22C55E" metalness={0.16} roughness={0.42} />
          </mesh>
          <mesh position={[11.2, 3.06, -2.34]} rotation={[0, 0, 0.45]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 1.1, 0.18]} />
            <meshStandardMaterial color="#22C55E" metalness={0.16} roughness={0.42} />
          </mesh>
          <mesh position={[10.2, 3.32, 2.1]} castShadow receiveShadow>
            <boxGeometry args={[10.8, 0.14, 0.14]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.25} roughness={0.4} emissive="#CBD5E1" emissiveIntensity={model.guideActive ? 0.08 : 0.02} />
          </mesh>
          <mesh position={[10.2, 3.32, -2.1]} castShadow receiveShadow>
            <boxGeometry args={[10.8, 0.14, 0.14]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.25} roughness={0.4} emissive="#CBD5E1" emissiveIntensity={model.guideActive ? 0.08 : 0.02} />
          </mesh>
          <group position={[8.8, deckHeights.glue, 0]}>
            {[-1, 1].map((sign) => (
              <mesh key={sign} position={[0, 0, sign * 1.55]} castShadow receiveShadow>
                <cylinderGeometry args={[0.12, 0.12, 0.55, 20]} />
                <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={model.glueActive ? 1.4 : 0.25} />
              </mesh>
            ))}
          </group>
          <LugTrack active={model.machineState === 'RUNNING' || model.machineState === 'RUN_EMPTY'} />
          <FormedCarton
            visible={model.packVisible}
            x={model.packX}
            z={model.packZ}
            formProgress={model.packFormProgress}
            rejectActive={model.rejectActive}
          />
          <RejectConveyor
            storedPositions={model.rejectConveyorPositions}
            active={model.faultCode === 'REJECT_BIN_FULL' || model.warningCode === 'REJECT_BIN_NEAR_FULL'}
            liveRejectActive={model.rejectActive && model.phase === 'DISCHARGE'}
            liveRejectX={lerp(MACHINE_LAYOUT_3D.productPath.rejectBranchX - 0.5, MACHINE_LAYOUT_3D.productPath.rejectBranchX + 1.4, model.visualProgress)}
          />
        </group>
      )}

      {layerVisibility.sensors && (
        <group>
          <SensorPost position={[15.6, 3.08, 1.35]} active={!model.rejectActive && model.phase === 'DISCHARGE'} label="OUTLET" />
          <SensorPost position={[14.9, 3.08, -1.35]} active={model.phase === 'DISCHARGE'} label="PLATE" />
          <ZoneLabel position={[-14.2, 0.16, 6]} label="BLANK MAGAZINE" active={phaseActive('BLANK_FEED')} />
          <ZoneLabel position={[-9.1, 0.16, 6]} label="CROSS TRANSFER" active={phaseActive('BLANK_FEED')} />
          <ZoneLabel position={[-5, 0.16, 5.15]} label="BLANK WITHDRAW" active={phaseActive('BLANK_FEED') || phaseActive('TRANSFER')} />
          <ZoneLabel position={[-7.4, 0.16, -6.6]} label="SEPARATOR + GROUPING" active={phaseActive('GROUPING') || phaseActive('CAPTURED')} />
          <ZoneLabel position={[0.9, 0.16, -6.4]} label="CHAIN INFEED" active={phaseActive('TRANSFER')} />
          <ZoneLabel position={[0.35, 0.16, 3.55]} label="GAP SENSOR + 3D CHECK" active={model.gapSensorActive || model.completenessCameraActive} />
          <ZoneLabel position={[8.8, 0.16, -6.4]} label="MAIN TRANSPORT" active={phaseActive('PACKING') || phaseActive('DISCHARGE')} />
          <ZoneLabel position={[11.1, 0.16, 3.3]} label="GLUE + GUIDES" active={phaseActive('PACKING') || phaseActive('DISCHARGE')} />
          <ZoneLabel position={[15.2, 0.16, -3.5]} label="OUTFEED" active={phaseActive('DISCHARGE')} />
          <ZoneLabel position={[16.7, 0.16, 5.6]} label="REJECT CONVEYOR" active={model.rejectCount > 0 || model.rejectActive} />
        </group>
      )}
    </>
  );
}

export function SimulationView3D({
  state,
  cameraPreset = 'overview',
  layerVisibility = DEFAULT_LAYERS,
  controlsEnabled = false,
  showSceneHud = true,
}: SimulationView3DProps) {
  const model = useMachineSceneModel(state);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!state) {
    return (
      <div className="flex h-full min-h-[580px] items-center justify-center rounded-3xl border border-white/5 bg-[#020617]">
        <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-slate-500">Awaiting Simulation Data...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[580px] overflow-hidden rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_38%),linear-gradient(180deg,#030712_0%,#020617_100%)]">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:36px_36px]" />

      {showSceneHud && (
        <>
          <div className="absolute left-5 top-5 z-10 max-w-sm rounded-2xl border border-emerald-500/15 bg-slate-950/80 p-4 backdrop-blur-md">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">3D Guided View</div>
            <div className="mt-2 text-sm font-semibold text-white">{model?.phase?.replace('_', ' ') ?? 'Initializing'}</div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              {model?.phaseDescription ?? 'Preparing machine scene.'}
            </p>
          </div>
          <div className="absolute right-5 top-5 z-10 rounded-2xl border border-slate-700/60 bg-slate-950/75 p-3 backdrop-blur-md">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Flow Story</div>
            <div className="mt-2 flex flex-col gap-1 text-[11px] font-semibold text-slate-200">
              <span>1. Blank magazine feeds left-side belt</span>
              <span>2. Tray infeed delivers flat blank to transfer</span>
              <span>3. Slide-in section drives product onto blank</span>
              <span>4. Main transport chains hold and form the box</span>
              <span>5. Guides keep it closed through glue dry</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-xl border border-slate-700/60 bg-slate-950/85 p-1.5 backdrop-blur-md">
            {['IDLE', 'GROUPING', 'CAPTURED', 'BLANK_FEED', 'TRANSFER', 'PACKING', 'DISCHARGE'].map((phase) => (
              <div
                key={phase}
                className={`rounded px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${model?.phase === phase ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-600'}`}
              >
                {phase.replace('_', ' ')}
              </div>
            ))}
          </div>
        </>
      )}

      {mounted ? (
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }} className="h-full w-full">
          <MachineScene
            state={state}
            cameraPreset={cameraPreset}
            layerVisibility={layerVisibility}
            controlsEnabled={controlsEnabled}
          />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">
          Preparing 3D Scene...
        </div>
      )}
    </div>
  );
}
