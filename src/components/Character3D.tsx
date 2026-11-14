
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';

const MODEL_URL =
  'https://threejs.org/examples/models/gltf/Soldier.glb';

function Model() {
  const { scene } = useGLTF(MODEL_URL);

  return <primitive object={scene} />;
}

function Loading() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-white">
        Karakter yükleniyor...
      </div>
    </Html>
  );
}

export default function Character3D() {
  return (
    <div className="h-[500px] w-full overflow-hidden rounded-2xl bg-slate-900">
      <Canvas camera={{ position: [0, 1.5, 4], fov: 40 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 5]} intensity={2} />

        <Suspense fallback={<Loading />}>
          <Model />
        </Suspense>

        <OrbitControls
          target={[0, 1, 0]}
          enablePan={false}
          minDistance={2}
          maxDistance={7}
        />
      </Canvas>
    </div>
  );
}
