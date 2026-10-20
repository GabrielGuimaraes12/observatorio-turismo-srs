-- Corrige o perfil padrão de novos usuários.
-- Novos cadastros devem receber USER, não ADMIN.

ALTER TABLE "User"
ALTER COLUMN "role" SET DEFAULT 'USER';