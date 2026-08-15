import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';

/**
 * Ambil organization_id (tenant) dari user yang login.
 * Melempar error kalau dipakai di route tanpa tenant (mis. SuperAdmin platform)
 * agar tidak ada query yang tidak ter-scope secara tidak sengaja.
 *
 * Pemakaian: `@TenantId() organizationId: string`
 */
export const TenantId = createParamDecorator(
  (_data, ctx: ExecutionContext): string => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user?.organizationId) {
      throw new InternalServerErrorException(
        'Konteks tenant tidak tersedia pada request ini',
      );
    }
    return user.organizationId;
  },
);
