

CREATE TABLE IF NOT EXISTS public.wallet_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Paulo Renato Crema Miranda Filho',
  birth_date date NOT NULL DEFAULT '2004-06-06',
  cpf text NOT NULL DEFAULT '150.303.097-05',
  facial_verified boolean NOT NULL DEFAULT false,
  facial_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet profile" ON public.wallet_profiles;
CREATE POLICY "Users can view own wallet profile"
  ON public.wallet_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own wallet profile" ON public.wallet_profiles;
CREATE POLICY "Users can create own wallet profile"
  ON public.wallet_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own wallet profile" ON public.wallet_profiles;
CREATE POLICY "Users can update own wallet profile"
  ON public.wallet_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE DELETE ON public.wallet_profiles FROM authenticated;
