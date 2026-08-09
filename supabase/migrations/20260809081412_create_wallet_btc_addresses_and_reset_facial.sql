

CREATE TABLE IF NOT EXISTS public.wallet_btc_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL,
  label text NOT NULL DEFAULT 'Carteira principal',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_btc_addresses_user_address_key UNIQUE (user_id, address)
);

ALTER TABLE public.wallet_btc_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own BTC addresses" ON public.wallet_btc_addresses;
CREATE POLICY "Users can view own BTC addresses"
  ON public.wallet_btc_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own BTC addresses" ON public.wallet_btc_addresses;
CREATE POLICY "Users can create own BTC addresses"
  ON public.wallet_btc_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own BTC addresses" ON public.wallet_btc_addresses;
CREATE POLICY "Users can update own BTC addresses"
  ON public.wallet_btc_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own BTC addresses" ON public.wallet_btc_addresses;
CREATE POLICY "Users can delete own BTC addresses"
  ON public.wallet_btc_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.wallet_btc_addresses (user_id, address, label, is_primary)
SELECT id, btc_address, 'Carteira principal', true
FROM public.wallet_profiles
WHERE btc_address IS NOT NULL
ON CONFLICT (user_id, address) DO NOTHING;

UPDATE public.wallet_profiles
SET facial_verified = false,
    facial_verified_at = NULL,
    updated_at = now()
WHERE facial_verified = true;
