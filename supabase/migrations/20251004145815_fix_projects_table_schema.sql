/*
  # Correção da tabela projects

  1. Alterações
    - Renomear coluna `title` para `name` para compatibilidade com o código
    - Adicionar coluna `preview_image` (equivalente a thumbnail_url)
    - Renomear coluna `files_data` para `files` para compatibilidade
    
  2. Notas
    - Mantém todos os dados existentes
    - Usa IF EXISTS para segurança
*/

-- Renomear title para name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'title'
  ) THEN
    ALTER TABLE projects RENAME COLUMN title TO name;
  END IF;
END $$;

-- Renomear files_data para files
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'files_data'
  ) THEN
    ALTER TABLE projects RENAME COLUMN files_data TO files;
  END IF;
END $$;

-- Adicionar preview_image se não existir (alias para thumbnail_url)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'preview_image'
  ) THEN
    ALTER TABLE projects ADD COLUMN preview_image text;
    
    -- Copiar dados de thumbnail_url se existir
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'thumbnail_url'
    ) THEN
      UPDATE projects SET preview_image = thumbnail_url WHERE thumbnail_url IS NOT NULL;
    END IF;
  END IF;
END $$;
