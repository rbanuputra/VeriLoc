-- Aktifkan extension yang dibutuhkan GeoFace.
-- Dijalankan otomatis oleh entrypoint Postgres saat pertama kali init DB.
CREATE EXTENSION IF NOT EXISTS postgis;   -- geofencing (ST_DistanceSphere)
CREATE EXTENSION IF NOT EXISTS vector;    -- face embedding (pgvector)
