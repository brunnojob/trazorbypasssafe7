

CREATE TABLE IF NOT EXISTS public.wallet_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_type text NOT NULL,
  agency text NOT NULL,
  account_number text NOT NULL,
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet bank account" ON public.wallet_bank_accounts;
CREATE POLICY "Users can view own wallet bank account"
  ON public.wallet_bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own wallet bank account" ON public.wallet_bank_accounts;
CREATE POLICY "Users can create own wallet bank account"
  ON public.wallet_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallet bank account" ON public.wallet_bank_accounts;
CREATE POLICY "Users can update own wallet bank account"
  ON public.wallet_bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallet bank account" ON public.wallet_bank_accounts;
CREATE POLICY "Users can delete own wallet bank account"
  ON public.wallet_bank_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
