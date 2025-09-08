import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { CartItem, CustomerInfo, CustomerAddress, DiscountDetail } from '@/types';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

interface PaymentIntentRequest {
  items: CartItem[];
  customerInfo: CustomerInfo;
  discountCode?: string;
}

async function checkFirstOrderEligibility(email: string, address: CustomerAddress): Promise<boolean> {
  try {
    // Check if user has made any previous orders
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_email', email)
      .limit(1);

    if (ordersError) {
      console.error('Error checking existing orders:', ordersError);
      return false;
    }

    if (existingOrders && existingOrders.length > 0) {
      return false; // User has made orders before
    }

    // Check if there are orders with the same address (fraud prevention)
    const addressString = `${address.street}, ${address.city}, ${address.postalCode}`;
    const { data: addressOrders, error: addressError } = await supabase
      .from('orders')
      .select('id')
      .ilike('shipping_address', `%${address.street}%`)
      .ilike('shipping_address', `%${address.city}%`)
      .ilike('shipping_address', `%${address.postalCode}%`)
      .limit(1);

    if (addressError) {
      console.error('Error checking address orders:', addressError);
      return false;
    }

    if (addressOrders && addressOrders.length > 0) {
      return false; // Same address has been used before
    }

    return true; // Eligible for first order discount
  } catch (error) {
    console.error('Error in checkFirstOrderEligibility:', error);
    return false;
  }
}

async function validateDiscountCode(code: string): Promise<{ valid: boolean; discount: number; type: string }> {
  try {
    const { data: discountData, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code.toLowerCase())
      .eq('active', true)
      .single();

    if (error || !discountData) {
      return { valid: false, discount: 0, type: '' };
    }

    // Check if discount code is expired
    if (discountData.expires_at && new Date(discountData.expires_at) < new Date()) {
      return { valid: false, discount: 0, type: '' };
    }

    // Check usage limit
    if (discountData.usage_limit && discountData.used_count >= discountData.usage_limit) {
      return { valid: false, discount: 0, type: '' };
    }

    return {
      valid: true,
      discount: discountData.discount_percentage / 100,
      type: discountData.type || 'percentage'
    };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return { valid: false, discount: 0, type: '' };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Payment intent creation started');

    const session = await getServerSession();

    if (!session?.user?.email) {
      console.log('❌ No authenticated user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', session.user.email);

    const body: PaymentIntentRequest = await request.json();
    const { items, customerInfo, discountCode } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check for first order discount eligibility
    const isFirstOrderEligible = await checkFirstOrderEligibility(
      customerInfo.email,
      customerInfo.address
    );

    let totalDiscount = 0;
    const discountDetails: DiscountDetail[] = [];

    // Apply first order discount (25%)
    if (isFirstOrderEligible) {
      const firstOrderDiscount = subtotal * 0.25;
      totalDiscount += firstOrderDiscount;
      discountDetails.push({
        type: 'first_order',
        description: 'Zniżka dla nowych klientów (25%)',
        amount: firstOrderDiscount
      });
    }

    // Apply discount code if provided
    if (discountCode) {
      const codeValidation = await validateDiscountCode(discountCode);
      if (codeValidation.valid) {
        const codeDiscount = subtotal * codeValidation.discount;
        totalDiscount += codeDiscount;
        discountDetails.push({
          type: 'discount_code',
          description: `Kod rabatowy: ${discountCode.toUpperCase()}`,
          amount: codeDiscount
        });

        // Update usage count for discount code
        await supabase
          .from('discount_codes')
          .update({ used_count: supabase.sql`used_count + 1` })
          .eq('code', discountCode.toLowerCase());
      }
    }

    const finalAmount = Math.max(subtotal - totalDiscount, 0);

    console.log('💰 Payment calculation:', {
      subtotal: subtotal.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
      isFirstOrder: isFirstOrderEligible
    });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency: 'pln',
      customer_email: customerInfo.email,
      metadata: {
        user_email: session.user.email,
        customer_first_name: customerInfo.firstName,
        customer_last_name: customerInfo.lastName,
        customer_address: JSON.stringify(customerInfo.address),
        items: JSON.stringify(items),
        subtotal: subtotal.toString(),
        total_discount: totalDiscount.toString(),
        final_amount: finalAmount.toString(),
        discount_details: JSON.stringify(discountDetails),
        is_first_order: isFirstOrderEligible.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent in database for tracking
    const { error: dbError } = await supabase
      .from('payment_intents')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        user_email: session.user.email,
        customer_email: customerInfo.email,
        amount: finalAmount,
        subtotal: subtotal,
        discount_amount: totalDiscount,
        discount_details: discountDetails,
        items: items,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('❌ Error storing payment intent:', dbError);
    } else {
      console.log('✅ Payment intent stored in database');
    }

    console.log('🎉 Payment intent created successfully:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      discountDetails: discountDetails,
      isFirstOrder: isFirstOrderEligible,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
