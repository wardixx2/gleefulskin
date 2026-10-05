import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://hvbvrgeaxyhaazyhlcgr.supabase.co";
export const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2YnZyZ2VheHloYWF6eWhsY2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDExMzMsImV4cCI6MjA5NzQxNzEzM30.FqCeGDkQegpbrvLs9YaCSCyRKVKUzUKvFgqeLoeuCSc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
