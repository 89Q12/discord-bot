import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class JwtAuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async login(user: User) {
    const payload = {
      sub: {
        name: user.name,
        user_id: user.userId.toString(),
      },
    };
    return {
      user: {
        name: user.name,
        user_id: user.userId.toString(),
      },
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        algorithm: 'HS256',
      }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER'),
        algorithm: 'HS256',
      }),
    };
  }
  async refreshToken(user: { user: User }) {
    const payload = {
      sub: user.user,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
