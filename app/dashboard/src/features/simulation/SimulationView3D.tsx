import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';
import type { SimulatorState } from '../../hooks/simTypes';
import { useMachineSceneModel } from './hooks/useMachineSceneModel';
import type { MachineSceneModel } from './hooks/useMachineSceneModel';
import { MACHINE_LAYOUT_3D } from './machineLayout';
import { SceneStats } from './scene3d/dev/SceneStats';
import { PERF_ENABLED } from './scene3d/dev/perfFlag';
import { acquireSceneAssets, releaseSceneAssets } from './scene3d/core/materials';
import { MachineLighting } from './scene3d/core/Lighting';
import { MachineSupport } from './scene3d/parts/static/MachineSupport';
import { SensorPost } from './scene3d/parts/sensors/SensorPost';
import { RejectConveyor } from './scene3d/parts/transport/RejectConveyor';
import { LugTrack } from './scene3d/parts/transport/LugTrack';
import { ChainInfeed } from './scene3d/parts/product/ChainInfeed';
import { SidePushers } from './scene3d/parts/product/SidePushers';
import { GroupedLaneFill } from './scene3d/parts/product/GroupedLaneFill';
import { SuctionArm } from './scene3d/parts/blank/SuctionArm';
import { FlatBlank } from './scene3d/parts/blank/FlatBlank';
import { BlankLiftPath } from './scene3d/parts/static/BlankLiftPath';
import { DividerModule } from './scene3d/parts/product/DividerModule';
import { ProductSlug } from './scene3d/parts/product/ProductSlug';
import { FormedCarton } from './scene3d/parts/transport/FormedCarton';
import { ManualZoneHighlight, MaintenanceJogButton, ZoneLabel, FlowArrow } from './scene3d/parts/overlay/Overlays';
import { lerp } from './scene3d/core/mathUtils';
import { damp, FOLLOW_LAMBDA } from './animation/constants';
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
  sendCommand?: (action: string) => Promise<unknown>;
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


function CameraRig({
  presetKey,
  controlsEnabled,
}: {
  presetKey: CameraPresetKey;
  controlsEnabled: boolean;
}) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function MachineScene({
  model,
  cameraPreset,
  layerVisibility,
  controlsEnabled,
  sendCommand,
}: {
  model: MachineSceneModel | null;
  cameraPreset: CameraPresetKey;
  layerVisibility: ViewerLayerState;
  controlsEnabled: boolean;
  sendCommand?: (action: string) => Promise<unknown>;
}) {
  const pusherRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!model || !pusherRef.current) return;
    pusherRef.current.position.x = damp(pusherRef.current.position.x, model.pusherX, FOLLOW_LAMBDA, delta);
  });

  if (!model) return null;

  const phaseActive = (phase: string) => model.phase === phase;
  const { frame, zones, supports, deckHeights, blankPath } = MACHINE_LAYOUT_3D;

  return (
    <>
      <MachineLighting faultActive={!!model.faultCode} manualActive={model.isManualMode} />

      {PERF_ENABLED && <SceneStats />}
      <CameraRig presetKey={cameraPreset} controlsEnabled={controlsEnabled} />
      {model.isManualMode && (
        <>
          <ManualZoneHighlight position={[MACHINE_LAYOUT_3D.zones.grouping.x, 3.02, MACHINE_LAYOUT_3D.zones.grouping.z]} width={MACHINE_LAYOUT_3D.zones.grouping.width} depth={MACHINE_LAYOUT_3D.zones.grouping.depth} label="Infeed Zone" active={model.rowCount * model.colCount > model.groupedCount} />
          <ManualZoneHighlight position={[MACHINE_LAYOUT_3D.zones.blankMagazine.x, 1.08, MACHINE_LAYOUT_3D.zones.blankMagazine.z]} width={MACHINE_LAYOUT_3D.zones.blankMagazine.width} depth={MACHINE_LAYOUT_3D.zones.blankMagazine.depth} label="Mag System" active={model.machineState === 'IDLE'} />
          <ManualZoneHighlight position={[MACHINE_LAYOUT_3D.zones.mainTransport.x, 3.02, MACHINE_LAYOUT_3D.zones.mainTransport.z]} width={MACHINE_LAYOUT_3D.zones.mainTransport.width} depth={MACHINE_LAYOUT_3D.zones.mainTransport.depth} label="Packing Unit" active={true} />
          
          {sendCommand && (
            <>
              <MaintenanceJogButton position={[MACHINE_LAYOUT_3D.zones.grouping.x - 3, 4.2, MACHINE_LAYOUT_3D.zones.grouping.z]} label="Jog Infeed" action="jog_infeed" onJog={sendCommand} />
              <MaintenanceJogButton position={[MACHINE_LAYOUT_3D.zones.blankMagazine.x, 2.5, MACHINE_LAYOUT_3D.zones.blankMagazine.z]} label="Jog Blank Feed" action="jog_blank_feed" onJog={sendCommand} />
              <MaintenanceJogButton position={[MACHINE_LAYOUT_3D.zones.mainTransport.x, 4.2, MACHINE_LAYOUT_3D.zones.mainTransport.z]} label="Jog Unit Step" action="jog_pack_advance" onJog={sendCommand} />
            </>
          )}
        </>
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
  sendCommand,
}: SimulationView3DProps) {
  // Computed once here and threaded into both the HUD and the scene. It used to
  // be called separately in each, which doubled the work and produced two
  // distinct object identities per snapshot.
  const model = useMachineSceneModel(state);

  // The material/geometry registries are module singletons shared by both mount
  // points (this view and ThreeDSimPage), so disposal is refcounted — unmounting
  // one scene must not free assets the other is still drawing with.
  useEffect(() => {
    acquireSceneAssets();
    return () => releaseSceneAssets();
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
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">3D Guided View</div>
              {model?.isManualMode && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-0.5 border border-amber-500/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-300">Manual Mode</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{model?.phase?.replace('_', ' ') ?? 'Initializing'}</div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              {model?.isManualMode 
                ? 'Maintenance state active. Use 3D jog points to step machine components.'
                : (model?.phaseDescription ?? 'Preparing machine scene.')}
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

      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        className="h-full w-full"
      >
        <MachineScene
          model={model}
          cameraPreset={cameraPreset}
          layerVisibility={layerVisibility}
          controlsEnabled={controlsEnabled}
          sendCommand={sendCommand}
        />
      </Canvas>
    </div>
  );
}
