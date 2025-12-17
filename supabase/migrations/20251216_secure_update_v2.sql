-- 1. Function to handle new users with 65 credits (65 points)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 65);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix Admin Users RLS (Prevent recursion, allow self-check)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;

-- Allow users to check ONLY their own admin status
CREATE POLICY "Users can check own admin status" ON public.admin_users
    FOR SELECT TO authenticated
    USING (email = auth.jwt() ->> 'email');

-- 4. Fix User Credits RLS (Allow Admins to view ALL credits)
DROP POLICY IF EXISTS "Admins can view all credits" ON public.user_credits;

CREATE POLICY "Admins can view all credits" ON public.user_credits
    FOR SELECT TO authenticated
    USING (
        -- User can see own credits OR User is an Admin
        (auth.uid() = user_id) 
        OR 
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE email = auth.jwt() ->> 'email'
        )
    );
