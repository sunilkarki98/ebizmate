import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthSyncController } from './sync/auth-sync.controller';
import { AuthSyncService } from './sync/auth-sync.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('NEXTAUTH_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthSyncService],
  controllers: [AuthController, AuthSyncController],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule { }
