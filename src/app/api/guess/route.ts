
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPayload } from '@/lib/sign';
import { haversineKm, scoreFor } from '@/lib/geo';
import { limit } from '@/lib/ratelimit';
import { ApiError, fail } from '@/lib/http';
import { admin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const Body = z.object({
  roundToken: z.string().min(1).max(2000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: Request) {
  try {
    limit(req, 'guess', 60);

    const b = Body.parse(await req.json());

    const t = verifyPayload<{
      lat: number;
      lng: number;
      roundId: string;
    }>(b.roundToken);

    if (
      !t ||
      !Number.isFinite(t.lat) ||
      !Number.isFinite(t.lng) ||
      !t.roundId
    ) {
      throw new ApiError(
        400,
        'Tur süresi doldu veya geçersiz'
      );
    }

    const actual = {
      lat: t.lat,
      lng: t.lng,
    };

    const distanceKm = haversineKm(
      { lat: b.lat, lng: b.lng },
      actual
    );

    const score = Math.max(
      0,
      Math.min(5000, Math.floor(scoreFor(distanceKm)))
    );

    const result: {
      actual: typeof actual;
      distanceKm: number;
      score: number;
      reward?: {
        awarded: boolean;
        xp: number;
        coins: number;
        totalXp: number;
        level: number;
        balance: number;
      };
    } = {
      actual,
      distanceKm,
      score,
    };

    // Ödül yalnızca giriş yapmış oyuncuya verilir.
    const authorization = req.headers.get('authorization');

    if (authorization?.startsWith('Bearer ')) {
      const accessToken = authorization.slice(7);

      const authClient = createClient(
        env.supabaseUrl,
        env.serviceKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser(accessToken);

      if (!authError && user) {
        const { data, error } = await admin().rpc(
          'award_round',
          {
            p_user_id: user.id,
            p_round_id: t.roundId,
            p_score: score,
          }
        );

        if (error) {
          console.error('Reward error:', error.message);
        } else {
          const reward = Array.isArray(data)
            ? data[0]
            : data;

          if (reward) {
            result.reward = {
              awarded: reward.awarded,
              xp: reward.earned_xp,
              coins: reward.earned_coins,
              totalXp: reward.current_xp,
              level: reward.current_level,
              balance: reward.current_coins,
            };
          }
        }
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
