import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource khusus TypeORM CLI (generate/run/revert migration).
 * Runtime app TIDAK memakai ini — app pakai TypeOrmModule di app.module.
 *
 * Alur produksi (synchronize=false):
 *   1. npm run build
 *   2. npm run migration:generate -- src/migrations/Init
 *   3. npm run migration:run
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
});
