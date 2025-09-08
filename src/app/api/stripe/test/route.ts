import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import type { StripeErrorType } from '@/types';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET() {
  try {
    console.log('🔍 Testing Stripe configuration...');

    // Check if we have the keys
    const hasPublishableKey = !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const hasSecretKey = !!env.STRIPE_SECRET_KEY;

    console.log('🔑 Keys check:', { hasPublishableKey, hasSecretKey });

    if (!hasSecretKey) {
      return NextResponse.json({
        success: false,
        error: 'Stripe secret key not found',
        message: 'Environment variables not configured'
      }, { status: 500 });
    }

    // Simple test - create a minimal payment intent
    const testPaymentIntent = await stripe.paymentIntents.create({
      amount: 200, // 2.00 PLN (minimum for PLN)
      currency: 'pln',
      metadata: { test: 'true' }
    });

    console.log('✅ Test payment intent created:', testPaymentIntent.id);

    return NextResponse.json({
      success: true,
      stripe_connected: true,
      test_payment_intent_id: testPaymentIntent.id,
      publishable_key_available: hasPublishableKey,
      secret_key_available: hasSecretKey,
      message: 'Stripe configuration is working!'
    });

  } catch (error: unknown) {
    const stripeError = error as StripeErrorType;
    console.error('❌ Stripe test error:', stripeError);

    return NextResponse.json({
      success: false,
      stripe_connected: false,
      error: stripeError.message || 'Unknown Stripe error',
      code: stripeError.code,
      type: stripeError.type,
      message: 'Stripe configuration has issues'
    }, { status: 500 });
  }
}
