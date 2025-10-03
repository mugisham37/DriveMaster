-- Initialize databases for different services
CREATE DATABASE auth_service;
CREATE DATABASE user_service;
CREATE DATABASE content_service;

-- Create users for different services
CREATE USER auth_user WITH PASSWORD 'auth_password';
CREATE USER user_user WITH PASSWORD 'user_password';
CREATE USER content_user WITH PASSWORD 'content_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;
GRANT ALL PRIVILEGES ON DATABASE user_service TO user_user;
GRANT ALL PRIVILEGES ON DATABASE content_service TO content_user;

-- Enable required extensions
\c auth_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c user_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c content_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";