-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on company name for faster searches
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies (name);

-- Add RLS policy for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by all authenticated users"
    ON public.companies
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Companies are insertable by admins only"
    ON public.companies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid() AND admin_users.status = 'active'
        )
    );

CREATE POLICY "Companies are updatable by admins only"
    ON public.companies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid() AND admin_users.status = 'active'
        )
    );

-- Add foreign key reference if it doesn't exist in profiles table
DO $$ 
BEGIN
    -- Check if company_id column exists in profiles table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
    
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'profiles' 
          AND ccu.column_name = 'id'
          AND ccu.table_name = 'companies'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;
END $$; 