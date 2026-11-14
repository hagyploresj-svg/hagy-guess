
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
  'https://threejs.org/examples/models/gltf/Soldier.glb';

type AnimationName = 'Idle' | 'Walk' | 'Run';

function HumanCharacter({
  animation,
}: {
  animation: AnimationName;
}) {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(MODEL_URL);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[animation];

    if (!action) return;

    action.reset().fadeIn(0.2).play();

    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, animation]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-3 text-sm text-cyan-300">
        Karakter yükleniyor...
      </div>
    </Html>
  );
}

export default function CharacterPage() {
  const [animation, setAnimation] =
    useState<AnimationName>('Idle');

  return (
    <main className="min-h-screen bg-[#060c17] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-3xl font-black">
          HAGY CHARACTER 3D
        </h1>

        <p className="mt-2 text-center text-slate-400">
          Karakterini 360 derece döndür ve hareketlerini dene
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#24394e] to-[#060c17]">
          <div className="h-[480px] sm:h-[600px]">
            <Canvas
              camera={{
                position: [0, 1.5, 4.5],
                fov: 38,
              }}
              dpr={[1, 1.75]}
            >
              <ambientLight intensity={1.5} />

              <directionalLight
                position={[3, 6, 5]}
                intensity={2.5}
              />

              <Suspense fallback={<Loading />}>
                <HumanCharacter animation={animation} />

                <ContactShadows
                  position={[0, 0, 0]}
                  opacity={0.5}
                  scale={5}
                  blur={2.5}
                  far={3}
                />
              </Suspense>

              <OrbitControls
                target={[0, 1, 0]}
                enablePan={false}
                minDistance={2}
                maxDistance={7}
              />
            </Canvas>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h2 className="mb-4 text-lg font-bold">
            Karakter Animasyonları
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'Idle', label: 'Bekle' },
              { id: 'Walk', label: 'Yürü' },
              { id: 'Run', label: 'Koş' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setAnimation(item.id as AnimationName)
                }
                className={
                  'rounded-xl px-3 py-3 text-sm font-bold ' +
                  (animation === item.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-white')
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

useGLTF.preload(MODEL_URL);
