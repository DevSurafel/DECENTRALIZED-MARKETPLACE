import { supabase as typedSupabase } from "@/integrations/supabase/client";

// NOTE: The generated database types in this project may not include all tables
// used by the app. This wrapper intentionally disables type-checking for
// supabase.from('<table>') calls while keeping runtime behavior identical.
export const supabase = typedSupabase as any;
