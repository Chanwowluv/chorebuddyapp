import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const PLAN_PRICE_IDS = {
  premium: {
    monthly: Deno.env.get("STRIPE_PRICE_ID_MONTHLY"),
    yearly: Deno.env.get("STRIPE_PRICE_ID_YEARLY")
  },
  family_plus: {
    monthly: Deno.env.get("STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY"),
    yearly: Deno.env.get("STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY")
  }
};

const REVERSE_PRICE_MAP = {};
for (const tier in PLAN_PRICE_IDS) {
  for (const interval in PLAN_PRICE_IDS[tier]) {
    const priceId = PLAN_PRICE_IDS[tier][interval];
    if (priceId) {
      REVERSE_PRICE_MAP[priceId] = { tier, interval };
    }
  }
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient()
});

const handleCreateCheckoutSession = async (payload, user, base44, origin) => {
    if (!payload || typeof payload !== 'object') {
        return new Response(
            JSON.stringify({ error: "Missing payload" }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    const { planId, isYearly } = payload;
    if (typeof planId !== 'string' || typeof isYearly !== 'boolean') {
        return new Response(
            JSON.stringify({ error: "Invalid input types" }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    if (!PLAN_PRICE_IDS[planId]) {
        return new Response(JSON.stringify({ error: "Invalid plan ID" }), { status: 400 });
    }

    const priceId = PLAN_PRICE_IDS[planId][isYearly ? 'yearly' : 'monthly'];
    if (!priceId) {
        console.error(`Stripe price ID for plan '${planId}' (${isYearly ? 'yearly' : 'monthly'}) is not configured.`);
        return new Response(JSON.stringify({ error: "This plan is not available." }), { status: 500 });
    }
    
    const successUrl = `https://chorebuddyapp.com/PaymentSuccess`;
    const cancelUrl = `https://chorebuddyapp.com/PaymentCancel`;
    
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ email: user.email, name: user.full_name });
        stripeCustomerId = customer.id;
        await base44.asServiceRole.entities.User.update(user.id, { stripe_customer_id: stripeCustomerId });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: { metadata: { base44_user_id: user.id } }
    });
    
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const handleCreateCustomer = async (user, base44) => {
    if (user.stripe_customer_id) {
        return new Response(
            JSON.stringify({ stripe_customer_id: user.stripe_customer_id }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { base44_user_id: user.id }
    });

    await base44.asServiceRole.entities.User.update(user.id, {
        stripe_customer_id: customer.id
    });

    return new Response(
        JSON.stringify({ stripe_customer_id: customer.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
};

const handleCreatePortalSession = async (user, base44, origin) => {
    if (!user.stripe_customer_id) {
        return new Response(JSON.stringify({ error: "No customer ID found" }), { status: 400 });
    }
    
    const returnUrl = `https://chorebuddyapp.com/Account`;
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: returnUrl,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const handleWebhook = async (req, base44) => {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    let event;

    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(err.message, { status: 400 });
    }

    const adminBase44 = base44.asServiceRole;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (!session.subscription || !session.customer) break;

                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                const userId = subscription.metadata?.base44_user_id;
                if (!userId) {
                    console.error('checkout.session.completed: No base44_user_id in subscription metadata');
                    break;
                }

                const priceId = subscription.items.data[0].price.id;
                const planInfo = REVERSE_PRICE_MAP[priceId];

                await adminBase44.entities.User.update(userId, {
                    stripe_customer_id: session.customer,
                    subscription_tier: planInfo?.tier || 'free',
                    subscription_status: subscription.status,
                });
                break;
            }
            case 'customer.subscription.created': {
                const subscription = event.data.object;
                const users = await adminBase44.entities.User.filter({ stripe_customer_id: subscription.customer });
                
                if (users && users.length > 0) {
                    const user = users[0];
                    const priceId = subscription.items.data[0].price.id;
                    const planInfo = REVERSE_PRICE_MAP[priceId];
                    
                    await adminBase44.entities.User.update(user.id, {
                        subscription_tier: planInfo?.tier || 'free',
                        subscription_status: subscription.status,
                    });
                }
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const users = await adminBase44.entities.User.filter({ stripe_customer_id: subscription.customer });
                
                if (users && users.length > 0) {
                    const user = users[0];
                    const priceId = subscription.items.data[0].price.id;
                    const planInfo = REVERSE_PRICE_MAP[priceId];
                    
                    await adminBase44.entities.User.update(user.id, {
                        subscription_tier: planInfo?.tier || user.subscription_tier,
                        subscription_status: subscription.status,
                    });
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const users = await adminBase44.entities.User.filter({ stripe_customer_id: subscription.customer });
                
                if (users && users.length > 0) {
                    const user = users[0];
                    await adminBase44.entities.User.update(user.id, {
                        subscription_tier: 'free',
                        subscription_status: 'canceled',
                    });
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const users = await adminBase44.entities.User.filter({ stripe_customer_id: invoice.customer });
                
                if (users && users.length > 0) {
                    const user = users[0];
                    await adminBase44.entities.User.update(user.id, {
                        subscription_status: 'past_due',
                    });
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const users = await adminBase44.entities.User.filter({ stripe_customer_id: invoice.customer });
                
                if (users && users.length > 0) {
                    const user = users[0];
                    if (invoice.subscription) {
                        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                        await adminBase44.entities.User.update(user.id, {
                            subscription_status: subscription.status,
                        });
                    }
                }
                break;
            }
        }
    } catch (error) {
        console.error(`Webhook handler error for ${event.type}:`, error);
    }
    
    return new Response(JSON.stringify({ received: true }), { status: 200 });
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    if (req.headers.has('stripe-signature')) {
        return handleWebhook(req, base44);
    }
    
    try {
        const user = await base44.auth.me();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        const { endpoint, payload } = await req.json();
        const origin = req.headers.get('origin');

        switch (endpoint) {
            case 'create-customer':
                return handleCreateCustomer(user, base44);
            case 'create-checkout-session':
                return handleCreateCheckoutSession(payload, user, base44, origin);
            case 'create-portal-session':
                return handleCreatePortalSession(user, base44, origin);
            default:
                return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404 });
        }
    } catch (e) {
        console.error("Main handler error:", e);
        return new Response(JSON.stringify({ error: e.message || "Invalid request" }), { status: 400 });
    }
});