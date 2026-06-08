import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ssxltdsoikgmkybervok.supabase.co";
const supabaseAnonKey = "sb_publishable_vxELt7NgrqOj9VSPpzs6Hg_5hj0Wq52";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);