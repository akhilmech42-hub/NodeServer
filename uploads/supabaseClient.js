const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = 'https://lztlwneysejamblyxeuf.supabase.co';
const supabaseKey = 'sb_publishable_w-Wpjff_1uCHTfs9IJfzYg_KleDp_GM';

const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        transport: ws
    }
});

module.exports = supabase;