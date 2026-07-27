import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';
import type { SimulatorState } from '../../hooks/simTypes';
import { useMachineSceneModel } from './hooks/useMachineSceneModel';
import type { MachineSceneModel } from './hooks/useMachineSceneModel';
import { MACHINE_LAYOUT_3D } from './machineLayout';
import { SceneStats } from './scene3d/dev/SceneStats';
import { PERF_ENABLED } from './scene3d/dev/perfFlag';
import { acquireSceneAssets, releaseSceneAssets } from './scene3d/core/materials';
import { MachineLighting } from './scene3d/core/Lighting';
import { Box, Plane } from './scene3d/core/primitives';
import { MachineFrame } from './scene3d/parts/static/MachineFrame';
import { TrayStation } from './scene3d/parts/static/TrayStation';
import { TransportBed } from './scene3d/parts/static/TransportBed';
import { GlueStation } from './scene3d/parts/transport/GlueStation';
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
  const pusherRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!model || !pusherRef.current) return;
    pusherRef.current.position.x = damp(pusherRef.current.position.x, model.pusherX, FOLLOW_LAMBDA, delta);
  });

  if (!model) return null;

  const phaseActive = (phase: string) => model.phase === phase;
  const { zones, blankPath } = MACHINE_LAYOUT_3D;

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

      <Plane mat="floor" rot={[-Math.PI / 2, 0, 0]} pos={[0, -0.05, 0]} size={[40, 20, 1]} receiveShadow />

      {layerVisibility.frame && (
        <group>
          <MachineFrame />
          <DividerModule currentLane={model.currentLane} rowCount={model.rowCount} />
        </group>
      )}

      {layerVisibility.tray && (
        <group>
          <TrayStation />
          <SuctionArm active={model.phase === 'BLANK_FEED'} progress={model.phaseProgress} z={blankPath.z} />
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
              <Box key={lane} mat="frame" pos={[zones.grouping.x, 2.55, z]} size={[zones.grouping.width - 0.2, 0.1, 0.08]} receiveShadow />
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
          />
          <SidePushers progress={model.sidePusherProgress} />
          <Box ref={pusherRef} mat="steelMid" pos={[MACHINE_LAYOUT_3D.productPath.transferX - 2.4, 2.96, 0]} size={[0.12, 0.96, 3.4]} castShadow receiveShadow />
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
          <TransportBed />
          <GlueStation glueActive={model.glueActive} guideActive={model.guideActive} />
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
