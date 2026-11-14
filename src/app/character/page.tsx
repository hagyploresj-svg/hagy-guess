
'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

type AvatarProps = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  hairstyle: string;
};

function Avatar({
  skin,
  hair,
  shirt,
  pants,
  shoes,
  hairstyle,
}: AvatarProps) {
  const skinMat = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.85,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: hair,
    roughness: 0.9,
  });

  return (
    <group position={[0, -1.15, 0]}>
      {/* Gövde */}
      <mesh position={[0, 1.55, 0]}>
        <capsuleGeometry args={[0.39, 0.55, 12, 32]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>

      {/* Boyun */}
      <mesh position={[0, 2.12, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.23, 24]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Kafa */}
      <mesh position={[0, 2.43, 0]} scale={[0.86, 1.06, 0.85]}>
        <sphereGeometry args={[0.34, 40, 32]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Kulaklar */}
      {[-1, 1].map((side) => (
        <mesh key={`ear-${side}`} position={[side * 0.3, 2.42, 0]}>
          <sphereGeometry args={[0.09, 20, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      ))}

      {/* Gözler */}
      {[-1, 1].map((side) => (
        <group key={`eye-${side}`}>
          <mesh position={[side * 0.13, 2.48, 0.275]}>
            <sphereGeometry args={[0.057, 20, 20]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[side * 0.13, 2.48, 0.325]}>
            <sphereGeometry args={[0.028, 20, 20]} />
            <meshStandardMaterial color="#473629" />
          </mesh>
          <mesh
            position={[side * 0.13, 2.56, 0.29]}
            rotation={[0, 0, side * 0.12]}
          >
            <boxGeometry args={[0.12, 0.025, 0.035]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Burun */}
      <mesh position={[0, 2.36, 0.3]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Ağız */}
      <mesh position={[0, 2.23, 0.285]}>
        <boxGeometry args={[0.13, 0.018, 0.018]} />
        <meshStandardMaterial color="#8f534b" />
      </mesh>

      {/* Saç */}
      <mesh position={[0, 2.67, 0]}>
        <sphereGeometry
          args={[
            0.34,
            32,
            20,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.53,
          ]}
        />
        <primitive object={hairMat} attach="material" />
      </mesh>

      {hairstyle === 'spiky' &&
        Array.from({ length: 7 }, (_, i) => {
          const angle = (i / 7) * Math.PI * 2;

          return (
            <mesh
              key={i}
              position={[
                Math.sin(angle) * 0.19,
                2.79,
                Math.cos(angle) * 0.19,
              ]}
              rotation={[Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3]}
            >
              <coneGeometry args={[0.095, 0.25, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          );
        })}

      {hairstyle === 'long' && (
        <mesh position={[0, 2.43, -0.15]}>
          <capsuleGeometry args={[0.28, 0.52, 12, 24]} />
          <primitive object={hairMat} attach="material" />
        </mesh>
      )}

      {/* Kollar ve eller */}
      {[-1, 1].map((side) => (
        <group key={`arm-${side}`}>
          <mesh
            position={[side * 0.52, 1.55, 0]}
            rotation={[0, 0, side * 0.13]}
          >
            <capsuleGeometry args={[0.145, 0.5, 12, 24]} />
            <meshStandardMaterial color={shirt} />
          </mesh>
          <mesh position={[side * 0.6, 1.08, 0]}>
            <capsuleGeometry args={[0.105, 0.18, 12, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Bel */}
      <mesh position={[0, 1.04, 0]}>
        <cylinderGeometry args={[0.33, 0.32, 0.25, 24]} />
        <meshStandardMaterial color={pants} />
      </mesh>

      {/* Bacaklar */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`}>
          <mesh position={[side * 0.19, 0.59, 0]}>
            <capsuleGeometry args={[0.16, 0.65, 12, 24]} />
            <meshStandardMaterial color={pants} roughness={0.9} />
          </mesh>

          {/* Ayakkabı */}
          <mesh position={[side * 0.19, 0.11, 0.11]}>
            <boxGeometry args={[0.32, 0.19, 0.52]} />
            <meshStandardMaterial color={shoes} roughness={0.6} />
          </mesh>

          <mesh position={[side * 0.19, 0.025, 0.12]}>
            <boxGeometry args={[0.34, 0.055, 0.55]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function CharacterPage() {
  const [skin, setSkin] = useState('#d6a27c');
  const [hair, setHair] = useState('#241b18');
  const [shirt, setShirt] = useState('#111827');
  const [pants, setPants] = useState('#334155');
  const [shoes, setShoes] = useState('#f8fafc');
  const [hairstyle, setHairstyle] = useState('short');

  return (
    <main className="min-h-dvh bg-[#070d19] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.35em] text-cyan-400">
            HAGY WORLD
          </p>
          <h1 className="mt-2 text-3xl font-black">
            KARAKTER OLUŞTURUCU
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Kendi 3D karakterini tasarla
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#1c3448] to-[#09111e]">
          <div className="h-[440px] sm:h-[540px]">
            <Canvas
              camera={{
                position: [0, 1.7, 5.2],
                fov: 36,
              }}
              dpr={[1, 2]}
              gl={{ antialias: true }}
            >
              <ambientLight intensity={1.6} />
              <directionalLight
                position={[3, 6, 5]}
                intensity={2.5}
              />
              <directionalLight
                position={[-4, 3, -3]}
                intensity={1.2}
                color="#67e8f9"
              />

              <Avatar
                skin={skin}
                hair={hair}
                shirt={shirt}
                pants={pants}
                shoes={shoes}
                hairstyle={hairstyle}
              />

              <ContactShadows
                position={[0, -1.15, 0]}
                opacity={0.45}
                scale={5}
                blur={2.5}
                far={3}
              />

              <OrbitControls
                target={[0, 0.35, 0]}
                enablePan={false}
                minDistance={3}
                maxDistance={7}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
          </div>
          <p className="pb-4 text-center text-xs text-slate-400">
            Karakteri döndürmek için sürükle
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5">
          <h2 className="mb-4 text-lg font-bold">
            Karakterini Özelleştir
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'Ten rengi', value: skin, setter: setSkin },
              { label: 'Saç rengi', value: hair, setter: setHair },
              { label: 'Üst kıyafet', value: shirt, setter: setShirt },
              { label: 'Pantolon', value: pants, setter: setPants },
              { label: 'Ayakkabı', value: shoes, setter: setShoes },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <span className="text-sm font-semibold">
                  {item.label}
                </span>
                <input
                  type="color"
                  value={item.value}
                  onChange={(e) => item.setter(e.target.value)}
                  className="h-10 w-14 cursor-pointer"
                />
              </label>
            ))}

            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="text-sm font-semibold">
                Saç modeli
              </span>
              <select
                value={hairstyle}
                onChange={(e) => setHairstyle(e.target.value)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="short">Kısa</option>
                <option value="spiky">Dik</option>
                <option value="long">Uzun</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
