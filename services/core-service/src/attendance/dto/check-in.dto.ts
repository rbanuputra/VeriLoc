import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsLatitude, IsLongitude, IsOptional } from 'class-validator';

/**
 * Payload absensi (multipart form-data). Field `file` (foto) ditangani
 * FileInterceptor; latitude & longitude datang sebagai string lalu
 * di-transform ke number.
 */
export class CheckInDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  /**
   * Flag dari klien (mobile) bahwa lokasi terdeteksi PALSU (mock location).
   * Klien wajib deteksi mock provider & kirim true bila terdeteksi.
   * String "true"/"1" dari form-data ikut dikonversi ke boolean.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  is_mock_location?: boolean;
}
