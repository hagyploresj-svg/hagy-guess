
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

function HumanCharacter({
  animation,
}: {
  animation: string;
}) {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(MODEL_URL);

  const character = useRef(scene.clone(true));

  const { actions } = useAnimations(
    animations,
    group
  );

  useEffect(() => {
    const action = actions[animation];

    if (!action) return;

    action.reset().fadeIn(0.25).play();

    return () => {
      action.fadeOut(0.25);
    };
  }, [actions, animation]);

  useFrame(() => {
    if (!group.current) return;
  });

  return (
    <group ref={group}>
      <primitive
        object={character.current}
        position={[0, 0, 0]}
        scale={1}
      />
    </group>
  );
}

function Loading() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-xl bg-slate-900/90 px-5 py-3 text-sm font-bold text-cyan-300">
        3D karakter yükleniyor...
      </div>
    </Html>
  );
}

export default function CharacterPage() {
  const [animation, setAnimation] =
    useState('Idle');

  return (
    <main className="min-h-dvh bg-[#060c17] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">

        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-cyan-400">
            HAGY WORLD
          </p>

          <h1 className="mt-2 text-3xl font-black">
            3D KARAKTER STÜDYOSU
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Yeni nesil karakter sistemi
          </p>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#24394e] via-[#111e30] to-[#060c17]">

          <div className="h-[480px] sm:h-[600px]">
            <Canvas
              shadows
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
                castShadow
              />

              <directionalLight
                position={[-3, 3, -4]}
                intensity={1.5}
                color="#67e8f9"
              />

              <Suspense fallback={<Loading />}>
                <HumanCharacter
                  animation={animation}
                />

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
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
          </div>

          <div className="absolute left-4 top-4 rounded-xl border border-cyan-400/20 bg-black/40 px-3 py-2 text-xs font-bold text-cyan-300">
            HAGY CHARACTER 3D
          </div>

          <p className="pb-4 text-center text-xs text-slate-400">
            Döndürmek için sürükle • Yakınlaştırmak için kaydır
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5">
          <h2 className="text-lg font-bold">
            Karakter Animasyonları
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Karakterinin hareketlerini test et.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { id: 'Idle', label: 'Bekle' },
              { id: 'Walk', label: 'Yürü' },
              { id: 'Run', label: 'Koş' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setAnimation(item.id)}
                className={
                  'rounded-xl px-4 py-3 text-sm font-bold transition ' +
                  (animation === item.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-white hover:bg-slate-700')
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          HAGY GUESS • 3D Character Prototype
        </p>
      </div>
    </main>
  );
}

useGLTF.preload(MODEL_URL);
