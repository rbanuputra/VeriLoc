import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

/** Bentuk 1 hasil embedding dari ai-service (DeepFace.represent). */
interface EmbedResult {
  embedding: number[];
  facial_area?: Record<string, number>;
  face_confidence?: number;
}
interface EmbedResponse {
  count: number;
  embeddings: EmbedResult[];
}

/**
 * Client HTTP ke GeoFace AI Service (FastAPI + DeepFace).
 * Core-service tidak menjalankan model apa pun — hanya meminta embedding.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('AI_SERVICE_URL');
  }

  /**
   * Kirim gambar wajah ke ai-service dan kembalikan 1 vektor embedding.
   * Menjamin tepat satu wajah terdeteksi (enrollment & absensi harus 1 wajah).
   */
  async embed(
    buffer: Buffer,
    filename = 'face.jpg',
    contentType = 'image/jpeg',
  ): Promise<number[]> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      filename,
    );

    let data: EmbedResponse;
    try {
      const res = await firstValueFrom(
        this.http.post<EmbedResponse>(`${this.baseUrl}/embed`, form),
      );
      data = res.data;
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      // 422 dari ai-service = wajah tidak terdeteksi.
      if (ax.response?.status === 422) {
        throw new UnprocessableEntityException(
          ax.response.data?.detail ?? 'Wajah tidak terdeteksi',
        );
      }
      this.logger.error(`AI /embed gagal: ${ax.message}`);
      throw new InternalServerErrorException('AI service tidak tersedia');
    }

    if (data.count < 1) {
      throw new UnprocessableEntityException('Wajah tidak terdeteksi');
    }
    if (data.count > 1) {
      throw new UnprocessableEntityException(
        'Terdeteksi lebih dari satu wajah, gunakan foto dengan satu wajah',
      );
    }
    return data.embeddings[0].embedding;
  }

  /**
   * Cek liveness / anti-spoofing sebuah foto wajah (mis. selfie absensi).
   * @returns { isReal, score } — isReal=false artinya wajah palsu (foto/video).
   */
  async checkLiveness(
    buffer: Buffer,
    filename = 'face.jpg',
    contentType = 'image/jpeg',
  ): Promise<{ isReal: boolean; score: number }> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      filename,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<{ is_real: boolean; antispoof_score: number }>(
          `${this.baseUrl}/liveness`,
          form,
        ),
      );
      return { isReal: res.data.is_real, score: res.data.antispoof_score };
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      if (ax.response?.status === 422) {
        throw new UnprocessableEntityException(
          ax.response.data?.detail ?? 'Wajah tidak terdeteksi',
        );
      }
      this.logger.error(`AI /liveness gagal: ${ax.message}`);
      throw new InternalServerErrorException('AI service tidak tersedia');
    }
  }

  /**
   * OCR dokumen kontrak (PDF/gambar) → teks mentah. Dipakai onboarding untuk
   * mengekstrak data kontrak.
   */
  async ocr(
    buffer: Buffer,
    filename = 'contract.pdf',
    contentType = 'application/pdf',
  ): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      filename,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<{ text: string }>(`${this.baseUrl}/ocr`, form, {
          timeout: 120_000, // OCR bisa lambat untuk dokumen banyak halaman
        }),
      );
      return res.data.text ?? '';
    } catch (err) {
      const ax = err as AxiosError;
      this.logger.error(`AI /ocr gagal: ${ax.message}`);
      throw new InternalServerErrorException('OCR service tidak tersedia');
    }
  }
}
