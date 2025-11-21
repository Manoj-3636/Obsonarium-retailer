export interface CheckoutResponse {
    url: string;
}

export async function createRetailerCheckoutSession(successUrl: string, cancelUrl: string): Promise<string> {
    const res = await fetch('/api/retailer/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            success_url: successUrl,
            cancel_url: cancelUrl
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create checkout session');
    }

    const data: CheckoutResponse = await res.json();
    return data.url;
}
