ALTER TABLE public.wallet_profiles
ADD COLUMN IF NOT EXISTS btc_address text NOT NULL DEFAULT 'bc1q9h6tq8x7v2y4n6f3j8k5l2m9p0q3r4s5t6u7v8';
