// Conexão do site com o banco de dados NexPay no Supabase.
// A chave "publishable" pode ficar no front-end: quem protege os dados
// são as regras de segurança (RLS) criadas em database/01_estrutura.sql.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://oftxtrormkpcfgpediij.supabase.co';
const SUPABASE_KEY = 'sb_publishable__YqSOEPPAK6_0WDOTAOFQA_qeypDA-q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
