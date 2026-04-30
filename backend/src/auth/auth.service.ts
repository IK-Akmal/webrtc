import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: Omit<User, 'passwordHash' | 'refreshTokenHash'> }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
    });

    const accessToken = this.signAccess(user);
    return { accessToken, user: this.sanitize(user) };
  }

  async login(user: User): Promise<{ accessToken: string; user: Omit<User, 'passwordHash' | 'refreshTokenHash'> }> {
    const accessToken = this.signAccess(user);
    return { accessToken, user: this.sanitize(user) };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpires'),
      },
    );
    const hash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    await this.usersService.updateRefreshToken(userId, hash);
    return token;
  }

  async rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(oldToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Session expired');

    const valid = await bcrypt.compare(oldToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Refresh token reuse detected');

    const accessToken = this.signAccess(user);
    const refreshToken = await this.generateRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private signAccess(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpires'),
    });
  }

  private sanitize(user: User): Omit<User, 'passwordHash' | 'refreshTokenHash'> {
    const { passwordHash: _p, refreshTokenHash: _r, ...safe } = user;
    void _p; void _r;
    return safe;
  }
}
