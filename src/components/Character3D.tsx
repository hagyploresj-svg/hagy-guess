
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  ContactShadows,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb';

function Civilian({
  playing,
}: {
  playing: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[names[0]];

    if (!action) return;

    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    action.paused = !playing;

    return () => {
      action.stop();
    };
  }, [actions, names, playing]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-xl bg-slate-900 px-4 py-3 text-sm text-cyan-300">
        Karakter yükleniyor...
      </div>
    </Html>
  );
}

export default function Character3D() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#0b1424]">
      <div className="relative h-[480px] sm:h-[600px]">
        <Canvas
          camera={{
            position: [0, 1.5, 4],
            fov: 40,
          }}
          dpr={[1, 1.75]}
          shadows
        >
          <color attach="background" args={['#0b1424']} />

          <ambientLight intensity={1.8} />

          <directionalLight
            position={[4, 7, 5]}
            intensity={2.5}
            castShadow
          />

          <directionalLight
            position={[-4, 3, -3]}
            intensity={1.2}
            color="#67e8f9"
          />

          <Suspense fallback={<Loading />}>
            <Civilian playing={playing} />

            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.4}
              scale={5}
              blur={2.5}
              far={3}
            />
          </Suspense>

          <OrbitControls
            target={[0, 1, 0]}
            enablePan={false}
            minDistance={1.5}
            maxDistance={7}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>

        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-cyan-400/20 bg-black/50 px-3 py-2 text-xs font-bold text-cyan-300">
          HAGY WORLD • CHARACTER
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className={
              'rounded-xl px-4 py-3 text-sm font-bold transition ' +
              (!playing
                ? 'bg-cyan-400 text-slate-950'
                : 'bg-slate-800 text-white hover:bg-slate-700')
            }
          >
            Bekle
          </button>

          <button
            type="button"
            onClick={() => setPlaying(true)}
            className={
              'rounded-xl px-4 py-3 text-sm font-bold transition ' +
              (playing
                ? 'bg-cyan-400 text-slate-950'
                : 'bg-slate-800 text-white hover:bg-slate-700')
            }
          >
            Animasyonu Oynat
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Karakteri döndürmek için sürükle.
          Yakınlaştırmak için kaydır.
        </p>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
