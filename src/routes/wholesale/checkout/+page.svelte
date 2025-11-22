<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Loader2,
		ShoppingBag,
		CreditCard,
		Banknote
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';

	interface CartItem {
		id: number;
		product_id: number;
		quantity: number;
		name: string;
		price: number;
		image: string;
	}

	let loadingCart = $state(true);
	let cartItems = $state<CartItem[]>([]);
	let placingOrder = $state(false);
	let paymentMethod = $state<'online' | 'offline'>('online');

	let total = $derived(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

	onMount(() => {
		loadCart();
	});

	async function loadCart() {
		loadingCart = true;
		try {
			const res = await fetch('/api/retailer/cart', {
				credentials: 'include'
			});

			if (res.status === 401) {
				toast.error('Please sign in to view your cart');
				await goto(resolve('/signin'));
				return;
			}

			if (!res.ok) throw new Error('Failed to fetch cart');

			const data = await res.json();
			const raw = Array.isArray(data.cart) ? data.cart : [];

			cartItems = raw.map((row: any): CartItem => {
				const p = row.product || {};
				return {
					id: row.id,
					product_id: row.product_id,
					quantity: row.quantity,
					name: p.name ?? 'Unknown Product',
					price: Number(p.price ?? 0),
					image: p.image_url ?? '/placeholder.png'
				};
			});

			// Redirect to cart if empty
			if (cartItems.length === 0) {
				toast.error('Your cart is empty');
				goto(resolve('/wholesale/cart'));
			}
		} catch (err) {
			console.error(err);
			toast.error('Failed to load cart');
			goto(resolve('/wholesale/cart'));
		} finally {
			loadingCart = false;
		}
	}

	let orderPlaced = $state(false);

	async function handlePlaceOrder() {
		placingOrder = true;

		try {
			const res = await fetch('/api/retailer/checkout', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					payment_method: paymentMethod,
					cart_items: cartItems.map((item) => ({
						product_id: item.product_id,
						quantity: item.quantity
					}))
				})
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(errData.error || 'Failed to place order');
			}

			const data = await res.json();

			// If online payment, redirect to Stripe checkout
			if (paymentMethod === 'online' && data.session_url) {
				window.location.href = data.session_url;
				return;
			}

			// For offline payment, show success message
			orderPlaced = true;
			toast.success('Order placed successfully!');
		} catch (err) {
			console.error(err);
			if (err instanceof Error) {
				toast.error(err.message);
			} else {
				toast.error('An unexpected error occurred');
			}
		} finally {
			placingOrder = false;
		}
	}
</script>

<main class="container mx-auto px-4 py-8 max-w-6xl">
	{#if orderPlaced}
		<div
			class="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in zoom-in-95 duration-500"
		>
			<div
				class="size-24 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4"
			>
				<ShoppingBag class="size-12" />
			</div>
			<h1 class="text-3xl font-bold text-center">Order Placed Successfully!</h1>
			<p class="text-muted-foreground text-center max-w-md">
				Thank you for your purchase. Your order has been received and will be processed shortly.
			</p>
			<div class="pt-6">
				<Button href={resolve('/wholesale')} class="h-12 px-8 text-lg">Continue Shopping</Button>
			</div>
		</div>
	{:else}
		<div class="mb-6">
			<Button variant="ghost" href={resolve('/wholesale/cart')} class="gap-2">
				<ArrowLeft class="size-4" />
				Back to Cart
			</Button>
		</div>

		<div class="flex gap-6 items-start">
			<!-- LEFT COLUMN -->
			<div class="flex-1 space-y-6">
				<!-- ORDER ITEMS -->
				<div class="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
					<h2 class="text-xl font-semibold mb-4">Order Items</h2>
					{#if loadingCart}
						<div class="space-y-4">
							{#each Array(3) as _}
								<Skeleton class="h-20 w-full" />
							{/each}
						</div>
					{:else}
						<div class="space-y-4">
							{#each cartItems as item (item.product_id)}
								<div class="flex items-center gap-4 p-4 border rounded-lg">
									<img src={item.image} alt={item.name} class="h-16 w-16 object-cover rounded-md" />
									<div class="flex-1">
										<h3 class="font-semibold">{item.name}</h3>
										<p class="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
									</div>
									<div class="text-right">
										<p class="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
										<p class="text-xs text-muted-foreground">₹{item.price.toFixed(2)} each</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- PAYMENT METHOD -->
				<div class="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
					<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
						<CreditCard class="size-5 text-primary" /> Payment Method
					</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						<label
							class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:border-primary transition bg-card/50 {paymentMethod ===
							'online'
								? 'border-primary bg-primary/5 ring-1 ring-primary/10'
								: ''}"
						>
							<input
								type="radio"
								name="payment"
								value="online"
								bind:group={paymentMethod}
								class="hidden"
							/>
							<div
								class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"
							>
								<CreditCard class="size-5" />
							</div>
							<div>
								<div class="font-semibold">Online Payment</div>
								<div class="text-xs text-muted-foreground">UPI, Cards, Netbanking</div>
							</div>
						</label>

						<label
							class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:border-primary transition bg-card/50 {paymentMethod ===
							'offline'
								? 'border-primary bg-primary/5 ring-1 ring-primary/10'
								: ''}"
						>
							<input
								type="radio"
								name="payment"
								value="offline"
								bind:group={paymentMethod}
								class="hidden"
							/>
							<div
								class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"
							>
								<Banknote class="size-5" />
							</div>
							<div>
								<div class="font-semibold">Cash on Delivery</div>
								<div class="text-xs text-muted-foreground">Pay when you receive</div>
							</div>
						</label>
					</div>
				</div>
			</div>

			<!-- RIGHT: ORDER SUMMARY -->
			<div class="w-[35%] sticky top-10">
				<div class="border bg-card rounded-xl p-6 space-y-6 shadow-lg">
					<h2 class="text-xl font-semibold flex items-center gap-2">
						<ShoppingBag class="size-5 text-primary" /> Order Summary
					</h2>

					<div class="space-y-3">
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Subtotal</span>
							<span>₹{total.toFixed(2)}</span>
						</div>

						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Shipping</span>
							<span class="text-green-600 font-medium">Free</span>
						</div>

						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Tax</span>
							<span>₹0.00</span>
						</div>
					</div>

					<div class="border-t pt-4">
						<div class="flex justify-between items-end">
							<span class="font-semibold text-lg">Total</span>
							<span class="text-3xl font-bold tracking-tight">₹{total.toFixed(2)}</span>
						</div>
					</div>

					<Button
						class="w-full h-14 text-lg font-semibold shadow-md transition-all hover:scale-[1.02]"
						disabled={placingOrder || cartItems.length === 0}
						onclick={handlePlaceOrder}
					>
						{#if placingOrder}
							<Loader2 class="size-5 animate-spin mr-2" /> Processing…
						{:else}
							Place Order
						{/if}
					</Button>

					<div class="text-xs text-center text-muted-foreground">
						<p>Secure checkout powered by Obsonarium</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</main>

