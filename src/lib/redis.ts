import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface PasswordResetToken {
  userId: string;
  email: string;
  createdAt: number;
  used: boolean;
}

export class TokenManager {
  private static TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

  static async createToken(userId: string, email: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenData: PasswordResetToken = {
      userId,
      email,
      createdAt: Date.now(),
      used: false,
    };
    
    await redis.set(`reset_token:${token}`, JSON.stringify(tokenData), {
      ex: 3600 // 1 hour expiry
    });
    
    return token;
  }

  static async validateToken(token: string): Promise<PasswordResetToken | null> {
    const data = await redis.get(`reset_token:${token}`);
    if (!data) return null;
    
    const tokenData: PasswordResetToken = JSON.parse(data as string);
    
    if (tokenData.used || Date.now() - tokenData.createdAt > this.TOKEN_EXPIRY) {
      await redis.del(`reset_token:${token}`);
      return null;
    }
    
    return tokenData;
  }

  static async markTokenUsed(token: string): Promise<void> {
    await redis.del(`reset_token:${token}`);
  }
} 