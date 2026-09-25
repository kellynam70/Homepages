import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://jzdlvrkfktpnlaaqedky.supabase.co';
const supabasePublishableKey = 'sb_publishable_fls1bjNvebOor5q-vzUn0w_0Glh8b2I';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
