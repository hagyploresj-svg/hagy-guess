
'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function Character({
  skin,
  shirt,
  hair,
}: {
  skin: string;
  shirt: string;
  hair: string;
}) {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Gövde */}
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.42, 0.65, 8, 24]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>

      {/* Kafa */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={skin} />
      </mesh>

      {/* Saç */}
      <mesh position={[0, 1.9, 0]}>
        <sphereGeometry
          args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color={hair} />
      </mesh>

      {/* Kollar */}
      {[-1, 1].map(side => (
        <mesh
          key={side}
          position={[side * 0.57, 0.65, 0]}
          rotation={[0, 0, side * 0.18]}
        >
          <capsuleGeometry args={[0.15, 0.7, 8, 16]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      ))}

      {/* Bacaklar */}
      {[-1, 1].map(side => (
        <mesh
          key={side}
          position={[side * 0.2, -0.35, 0]}
        >
          <capsuleGeometry args={[0.18, 0.8, 8, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

export default function CharacterPage() {
  const [skin, setSkin] = useState('#d6a27c');
  const [shirt, setShirt] = useState('#22d3ee');
  const [hair, setHair] = useState('#1c1917');

  return (
    <main className="min-h-dvh bg-[#07111d] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-3xl font-black">
          HAGY CHARACTER
        </h1>

        <p className="mt-2 text-center text-slate-400">
          Kendi 3D karakterini oluştur
        </p>

        <div className="mt-6 h-[450px] overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-b from-[#173047] to-[#07111d]">
          <Canvas camera={{ position: [0, 1.5, 5], fov: 40 }}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[3, 5, 5]} intensity={2} />

            <Character
              skin={skin}
              shirt={shirt}
              hair={hair}
            />

            <OrbitControls
              enablePan={false}
              minDistance={3}
              maxDistance={7}
            />
          </Canvas>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:grid-cols-3">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Ten rengi</span>
            <input
              type="color"
              value={skin}
              onChange={e => setSkin(e.target.value)}
              className="h-10 w-14 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Kıyafet</span>
            <input
              type="color"
              value={shirt}
              onChange={e => setShirt(e.target.value)}
              className="h-10 w-14 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Saç rengi</span>
            <input
              type="color"
              value={hair}
              onChange={e => setHair(e.target.value)}
              className="h-10 w-14 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </main>
  );
}
