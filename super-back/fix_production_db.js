import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    console.log('Iniciando configuração do banco de dados de produção...');

    // Tabela OnboardingState
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "OnboardingState" (
        id TEXT PRIMARY KEY,
        is_dismissed BOOLEAN DEFAULT false,
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Inserir estado inicial se não existir
    await pool.query(`
      INSERT INTO "OnboardingState" (id, is_dismissed) 
      VALUES ('default', false) 
      ON CONFLICT (id) DO NOTHING;
    `);

    // Tabela CompanyProfile
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "CompanyProfile" (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        address TEXT,
        "logoUrl" TEXT,
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Inserir perfil inicial se não existir
    await pool.query(`
      INSERT INTO "CompanyProfile" (id, name) 
      VALUES ('default', 'Supercell AI Store') 
      ON CONFLICT (id) DO NOTHING;
    `);

    // Tabela TeamMember
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TeamMember" (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabela SecuritySettings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SecuritySettings" (
        id TEXT PRIMARY KEY,
        "twoFactorEnabled" BOOLEAN DEFAULT false,
        "lastPasswordChange" TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      INSERT INTO "SecuritySettings" (id) 
      VALUES ('default') 
      ON CONFLICT (id) DO NOTHING;
    `);

    // Tabela Invoice
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        id TEXT PRIMARY KEY,
        amount TEXT,
        status TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Configuração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na configuração do banco:', err);
  } finally {
    pool.end();
  }
}

setup();
