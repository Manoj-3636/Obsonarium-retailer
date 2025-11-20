<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Loader2, ImageIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
    import { resolve } from '$app/paths';

	type Product = {
		id: number;
		name: string;
		price: number;
		stock_qty: number;
		image_url: string;
	};

	let products = $state<Product[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');

	onMount(async () => {
		try {
			const response = await fetch('/api/retailer/products', {
				credentials: 'include'
			});

			if (response.status === 401) {
				toast.error('Please sign in to view your inventory');
				await goto('/signin');
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to load inventory');
			}

			const data = await response.json();
			products = data.products ?? [];
		} catch (error) {
			console.error('Failed to load inventory', error);
			errorMessage = 'Failed to load inventory. Please try again.';
		} finally {
			loading = false;
		}
	});

	function viewProduct(productId: number) {
		goto(`/inventory/${productId}`);
	}
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-6xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Inventory</h1>
				<p class="text-muted-foreground">Manage products that are available in your store</p>
			</div>
			<Button href={resolve('/inventory/new')}>Add Product</Button>
		</div>

		{#if loading}
			<div class="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
				<Loader2 class="size-8 animate-spin text-muted-foreground" />
				<p class="text-muted-foreground">Loading products...</p>
			</div>
		{:else if errorMessage}
			<div class="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive">
				<p>{errorMessage}</p>
			</div>
		{:else if products.length === 0}
			<div class="rounded-lg border border-dashed p-10 text-center">
				<p class="text-lg font-medium">No products yet</p>
				<p class="text-muted-foreground">Start by adding your first product.</p>
			</div>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each products as product}
					<Card.Root
						class="cursor-pointer transition-shadow hover:shadow-lg"
						onclick={() => viewProduct(product.id)}
					>
						<Card.Content class="p-0">
							{#if product.image_url}
								<img
									src={product.image_url}
									alt={product.name}
									class="h-48 w-full rounded-t-lg object-cover"
								/>
							{:else}
								<div
									class="flex h-48 w-full items-center justify-center rounded-t-lg bg-muted text-muted-foreground"
								>
									<ImageIcon class="size-10" />
								</div>
							{/if}
						</Card.Content>
						<Card.Header class="space-y-2">
							<Card.Title>{product.name}</Card.Title>
							<Card.Description class="text-base font-semibold text-foreground">
								₹ {product.price.toFixed(2)}
							</Card.Description>
							<p class="text-sm text-muted-foreground">Stock: {product.stock_qty}</p>
						</Card.Header>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>

	<a
		href="/inventory/new"
		class="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg"
		aria-label="Add product"
	>
		+
	</a>
</div>

min-h-20