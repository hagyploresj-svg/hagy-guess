
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';

function House({ level }: { level: number }) {
  const modern = level >= 2;
  const luxury = level >= 3;

  return (
    <group>
      {/* Bahçe */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[9, 0.2, 9]} />
        <meshStandardMaterial color="#387d46" />
      </mesh>

      {/* Ev zemini */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[4.5, 0.3, 4]} />
        <meshStandardMaterial color="#a3a3a3" />
      </mesh>

      {/* Ev gövdesi */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[4, 2.2, 3.6]} />
        <meshStandardMaterial
          color={modern ? '#e2e8f0' : '#f1d7a8'}
        />
      </mesh>

      {/* Çatı */}
      <mesh
        position={[0, 2.65, 0]}
        rotation={[0, 0, Math.PI / 4]}
        castShadow
      >
        <boxGeometry args={[3.15, 3.15, 4.1]} />
        <meshStandardMaterial
          color={modern ? '#334155' : '#a94438'}
        />
      </mesh>

      {/* Çatının altındaki gövde */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[4, 0.5, 3.6]} />
        <meshStandardMaterial
          color={modern ? '#e2e8f0' : '#f1d7a8'}
        />
      </mesh>

      {/* Kapı */}
      <mesh position={[0, 0.85, 1.815]}>
        <boxGeometry args={[0.8, 1.6, 0.08]} />
        <meshStandardMaterial color="#75452c" />
      </mesh>

      {/* Kapı kolu */}
      <mesh position={[0.27, 0.85, 1.88]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#facc15" metalness={0.6} />
      </mesh>

      {/* Pencereler */}
      {[-1.2, 1.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.55, 1.83]}>
            <boxGeometry args={[0.85, 0.85, 0.09]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[x, 1.55, 1.9]}>
            <boxGeometry args={[0.7, 0.7, 0.05]} />
            <meshStandardMaterial
              color="#38bdf8"
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Bahçe yolu */}
      <mesh position={[0, 0.01, 3.3]}>
        <boxGeometry args={[1.25, 0.05, 2.5]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>

      {/* Ağaçlar */}
      {[
        [-3.2, -2.5],
        [3.2, -2.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.6, 10]} />
            <meshStandardMaterial color="#795548" />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <sphereGeometry args={[0.85, 16, 16]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      ))}

      {/* Seviye 3: Havuz */}
      {luxury && (
        <group position={[2.8, 0.01, 2.4]}>
          <mesh>
            <boxGeometry args={[1.9, 0.08, 2.2]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[1.65, 0.03, 1.95]} />
            <meshStandardMaterial
              color="#06b6d4"
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function House3D() {
  const [level, setLevel] = useState(1);

  return (
    <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#102033]">
      <div className="h-[480px] sm:h-[600px]">
        <Canvas
          shadows
          camera={{
            position: [8, 6, 9],
            fov: 45,
          }}
        >
          <color attach="background" args={['#102033']} />
          <ambientLight intensity={1.6} />

          <directionalLight
            position={[5, 10, 5]}
            intensity={2.2}
            castShadow
          />

          <House level={level} />

          <OrbitControls
            target={[0, 1, 0]}
            enablePan={false}
            minDistance={6}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </div>

      <div className="border-t border-white/10 bg-slate-900 p-5 text-white">
        <h2 className="text-lg font-bold">
          HAGY WORLD • Ev Seviye {level}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Evi döndürmek için sürükle.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLevel(n)}
              className={
                'rounded-xl px-3 py-3 text-sm font-bold ' +
                (level === n
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-800 text-white')
              }
            >
              Seviye {n}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Şimdilik önizleme. Coin harcanmaz.
        </p>
      </div>
    </div>
  );
}
