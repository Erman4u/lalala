// Konfigurasi Supabase Project
const SUPABASE_URL = 'https://urzhdvycpalrgqumsjjy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VNqRbsKckLe_CcaLnFxaPQ_JHJiyMjN';

// Pakai var (bukan const) agar bisa diakses global dari semua script file
// window.supabase = library CDN → kita panggil createClient → hasilnya jadi window.supabase baru (client)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
