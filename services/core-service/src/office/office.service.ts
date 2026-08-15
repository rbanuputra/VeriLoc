import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTenantService } from '../common/services/base-tenant.service';
import { Office } from './entities/office.entity';

/** Kantor terdekat + jarak (meter) dari sebuah titik. */
export interface NearestOffice {
  office: Office;
  distance: number;
}

/**
 * Reuse BaseTenantService → create/findAll/findOne/update/remove otomatis
 * ter-scope tenant + ber-pagination. Hanya menambah findNearest (geofence).
 */
@Injectable()
export class OfficeService extends BaseTenantService<Office> {
  constructor(
    @InjectRepository(Office)
    repo: Repository<Office>,
  ) {
    super(repo, 'Kantor');
  }

  /**
   * Kantor aktif TERDEKAT dari koordinat user, DALAM tenant tsb, memakai
   * PostGIS ST_DistanceSphere (meter). Dipakai geofence absensi.
   */
  async findNearest(
    organizationId: string,
    latitude: number,
    longitude: number,
  ): Promise<NearestOffice | null> {
    const rows = await this.repository.query(
      `SELECT id,
              ST_DistanceSphere(
                ST_MakePoint(longitude::float8, latitude::float8),
                ST_MakePoint($1::float8, $2::float8)
              ) AS distance
         FROM offices
        WHERE is_active = true AND organization_id = $3
        ORDER BY distance ASC
        LIMIT 1`,
      [longitude, latitude, organizationId],
    );
    if (!rows.length) return null;

    const office = await this.findOne(organizationId, rows[0].id);
    return { office, distance: Number(rows[0].distance) };
  }
}
