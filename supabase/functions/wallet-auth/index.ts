import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, message, signature } = await req.json();

    // Validate inputs
    if (!wallet_address || !message || !signature) {
      console.error('Missing required fields:', { wallet_address: !!wallet_address, message: !!message, signature: !!signature });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: wallet_address, message, signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate wallet address format (Solana base58, 32-44 chars)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(wallet_address)) {
      console.error('Invalid wallet address format:', wallet_address);
      return new Response(
        JSON.stringify({ error: 'Invalid Solana wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the signature
    console.log('Verifying signature for wallet:', wallet_address);
    
    let isValid = false;
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(wallet_address);
      
      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Invalid signature format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValid) {
      console.error('Signature verification failed for wallet:', wallet_address);
      return new Response(
        JSON.stringify({ error: 'Invalid signature - wallet ownership not verified' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully for wallet:', wallet_address);

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate deterministic credentials from verified wallet address
    const walletEmail = `${wallet_address}@wallet.local`;

    // IMPORTANT: keep password <= 72 chars (bcrypt limit). Use a stable hash.
    const salt = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').slice(0, 32);
    const raw = new TextEncoder().encode(`kol-platform:${wallet_address}:${salt}`);
    const digest = await crypto.subtle.digest('SHA-256', raw);
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const walletPassword = `w_${hashHex.slice(0, 48)}`;

    let userId: string;
    let session: any;

    // Prefer sign-in first (avoids heavy listUsers and handles existing users reliably)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: walletEmail,
      password: walletPassword,
    });

    if (!signInError && signInData?.session && signInData.user) {
      console.log('Signed in existing user for wallet:', wallet_address);
      userId = signInData.user.id;
      session = signInData.session;
    } else {
      // Create user if they don't exist, then sign in
      console.log('Creating new user for wallet:', wallet_address);
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: { wallet_address },
      });

      if (signUpError) {
        // If the user already exists (race condition / prior attempt), try sign-in one more time
        console.error('Sign up error:', signUpError);
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
          email: walletEmail,
          password: walletPassword,
        });

        if (retryError || !retryData?.session || !retryData.user) {
          return new Response(
            JSON.stringify({ error: 'Failed to create or sign in user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = retryData.user.id;
        session = retryData.session;
      } else {
        userId = signUpData.user!.id;

        const { data: newSession, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
          email: walletEmail,
          password: walletPassword,
        });

        if (sessionError || !newSession?.session) {
          console.error('Session creation error:', sessionError);
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        session = newSession.session;
      }
    }

    // Ensure profile is linked to auth user - try update first, then insert
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id')
      .eq('wallet_address', wallet_address)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile to link auth_user_id
      if (!existingProfile.auth_user_id || existingProfile.auth_user_id !== userId) {
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ auth_user_id: userId })
          .eq('wallet_address', wallet_address);
        
        if (updateError) {
          console.error('Profile update error:', updateError);
        } else {
          console.log('Profile linked to auth user:', userId);
        }
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({ wallet_address, auth_user_id: userId });
      
      if (insertError) {
        console.error('Profile insert error:', insertError);
      } else {
        console.log('New profile created for wallet:', wallet_address);
      }
    }

    console.log('Authentication successful for wallet:', wallet_address);

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
        },
        user: {
          id: userId,
          wallet_address,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Wallet auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});