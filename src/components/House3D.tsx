
'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { browserSupabase } from '@/lib/supabase-browser';

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

      {/* Çatı altı */}
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
        <meshStandardMaterial
          color="#facc15"
          metalness={0.6}
        />
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

      {/* Seviye 3 ve üzeri: Havuz */}
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
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHouse() {
      try {
        const supabase = browserSupabase();

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;
        if (!active) return;

        const user = authData.user;

        if (!user) {
          setLoggedIn(false);
          return;
        }

        setLoggedIn(true);

        const { data, error } = await supabase
          .from('user_profiles')
          .select('coins, house_level')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (!active) return;

        setCoins(Number(data.coins ?? 0));
        setLevel(Number(data.house_level ?? 1));
      } catch (error) {
        console.error('Ev bilgileri yüklenemedi:', error);

        if (active) {
          setErrorMessage(
            'Ev bilgileri alınamadı. Profil tablosunu kontrol et.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHouse();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#102033]">
      {/* 3D Ev */}
      <div className="h-[480px] sm:h-[600px]">
        <Canvas
          shadows
          camera={{
            position: [8, 6, 9],
            fov: 45,
          }}
          dpr={[1, 1.75]}
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

      {/* Ev paneli */}
      <div className="border-t border-white/10 bg-slate-900 p-5 text-white">
        <h2 className="text-xl font-black">
          HAGY WORLD
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Evi döndürmek için sürükle.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-cyan-400">
            Ev bilgilerin yükleniyor...
          </p>
        ) : errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : loggedIn ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  HAGY Coin
                </p>

                <p className="mt-1 text-2xl font-black text-yellow-400">
                  🪙 {coins.toLocaleString('tr-TR')}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  Ev Seviyesi
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-400">
                  {level} / 10
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="font-bold">
                🏠 Mevcut Evin
              </p>

              <p className="mt-2 text-sm text-slate-300">
                Seviye {level} evine sahipsin.
              </p>

              <p className="mt-3 text-xs text-slate-400">
                Bir sonraki aşamada HAGY Coin
                kullanarak evini yükseltebileceksin.
              </p>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-300">
              Evini geliştirmek için hesabına giriş yap.
            </p>

            <a
              href="/auth"
              className="mt-3 inline-block rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950"
            >
              Giriş Yap
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
