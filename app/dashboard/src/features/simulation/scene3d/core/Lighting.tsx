import { memo } from 'react';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';

/**
 * Lighting rig for the machine hall.
 *
 * The scene used to run `ambientLight intensity={1.2}` to compensate for a
 * removed `<Environment preset="studio" />` (the drei presets fetch HDRs from
 * raw.githubusercontent.com, which was 503ing). That is why everything looked
 * flat and plastic: ambient light contributes no specular and no reflection, so
 * `metalness` had nothing to reflect and stainless rendered as grey paint.
 *
 * This restores image-based lighting with **zero network dependency** by
 * building the environment from `<Lightformer>` emitters instead of an HDR file.
 * drei renders them into a PMREM internally; `frames={1}` bakes once, so the
 * per-frame cost is nil.
 */
export const MachineLighting = memo(function MachineLighting({
  faultActive,
  manualActive,
}: {
  faultActive: boolean;
  manualActive: boolean;
}) {
  // One accent light, always mounted. Mounting/unmounting a light changes the
  // shader permutation and forces three.js to recompile every material in the
  // scene — a guaranteed hitch on every fault or mode change. Vary it instead.
  const accentColor = faultActive ? '#EF4444' : manualActive ? '#F59E0B' : '#38BDF8';
  const accentIntensity = faultActive ? 2.2 : manualActive ? 2.4 : 0.5;
  const accentPosition: [number, number, number] = faultActive
    ? [0, 8, 0]
    : manualActive
      ? [-4, 5, 0]
      : [-8, 4, 7];

  return (
    <>
      <color attach="background" args={['#0B1220']} />
      {/* The machine is ~35 units long; the old [22, 44] fog cut it in half at the overview camera. */}
      <fog attach="fog" args={['#0B1220', 34, 78]} />

      <Environment frames={1} resolution={128} background={false}>
        {/* Long overhead strip — this is what makes 35 units of rail read as brushed metal */}
        <Lightformer
          form="rect"
          intensity={6}
          scale={[42, 6, 1]}
          position={[0, 14, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          color="#FFFFFF"
        />
        {/* Cool back fill, warm front fill — gives the stainless a direction to shade along */}
        <Lightformer form="rect" intensity={2} scale={[30, 10, 1]} position={[0, 6, -16]} color="#9CC7FF" />
        <Lightformer form="rect" intensity={1.4} scale={[30, 10, 1]} position={[0, 5, 16]} color="#FFD9A0" />
        {/* Narrow side kickers to pick out the long edges */}
        <Lightformer form="rect" intensity={1.8} scale={[4, 12, 1]} position={[-22, 7, 0]} rotation={[0, Math.PI / 2, 0]} color="#DCEBFF" />
        <Lightformer form="rect" intensity={1.8} scale={[4, 12, 1]} position={[22, 7, 0]} rotation={[0, -Math.PI / 2, 0]} color="#DCEBFF" />
      </Environment>

      {/* Ambient now only lifts the blacks — the environment does the real work. */}
      <ambientLight intensity={0.15} />

      {/*
        Key light. The shadow camera is framed tightly to the machine footprint:
        the default ortho frustum is far larger than the machine, so almost every
        texel of the shadow map was being spent on empty space.
      */}
      <directionalLight
        position={[12, 18, 10]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-normalBias={0.02}
      />

      <pointLight
        position={accentPosition}
        intensity={accentIntensity}
        color={accentColor}
        distance={faultActive || manualActive ? 20 : 0}
        decay={2}
      />

      {/* frames={1}: the base never moves, so baking once avoids a full extra scene render every frame. */}
      <ContactShadows
        frames={1}
        position={[0, -0.04, 0]}
        opacity={0.55}
        scale={44}
        blur={2.5}
        far={4}
        resolution={512}
        color="#000000"
      />
    </>
  );
});
