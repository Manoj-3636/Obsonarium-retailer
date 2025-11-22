<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, ShoppingCart, Loader2, ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	/** ---- PRODUCT TYPE ---- **/
	interface Product {
		id: number;
		name: string;
		price: number;
		image: string;
		stock_qty: number;

		cartQty: number | null; // null → not added yet
		isQtyLoading: boolean; // spinner while waiting
	}

	let searchQuery = $state<string>('');
	let loading = $state<boolean>(true);
	let errorMessage = $state<string | null>(null);

	let products = $state<Product[]>([]);
	let allProducts = $state<Product[]>([]); // Store all products for filtering

	// Filter and sort state
	let minPrice = $state<number | null>(null);
	let maxPrice = $state<number | null>(null);
	let sortBy = $state<string>('default'); // "default", "price_asc", "price_desc"

	/** ---- LOAD CART QUANTITIES ---- **/
	async function loadCartQuantities() {
		try {
			const response = await fetch('/api/retailer/cart', {
				credentials: 'include'
			});

			if (response.status === 401) {
				// Not authenticated, cart quantities will be null
				return;
			}

			if (!response.ok) return;

			const data = await response.json();
			const cartItems = Array.isArray(data.cart) ? data.cart : [];

			// Create a map of product_id -> quantity
			const cartMap = new Map<number, number>();
			cartItems.forEach((item: any) => {
				cartMap.set(item.product_id, item.quantity);
			});

			// Update products and allProducts with cart quantities
			products.forEach((p) => {
				const qty = cartMap.get(p.id);
				if (qty !== undefined) {
					p.cartQty = qty;
				}
			});

			allProducts.forEach((p) => {
				const qty = cartMap.get(p.id);
				if (qty !== undefined) {
					p.cartQty = qty;
				}
			});
		} catch (err) {
			console.error('Failed to load cart quantities', err);
		}
	}

	/** ---- LOAD PRODUCTS ---- **/
	async function loadProducts(query: string) {
		loading = true;
		errorMessage = null;

		try {
			const trimmed = query.trim();
			const url = trimmed ? `/api/wholesale?q=${encodeURIComponent(trimmed)}` : `/api/wholesale`;

			const response = await fetch(url);
			if (!response.ok) throw new Error('API failure');

			const data = await response.json();

			allProducts = data.products.map(
				(product: any): Product => ({
					id: product.id,
					name: product.name,
					price: product.price,
					image: product.image_url,
					stock_qty: product.stock_qty,

					cartQty: null,
					isQtyLoading: false
				})
			);

			applyFiltersAndSort();
			await loadCartQuantities();
		} catch (err) {
			console.error(err);
			errorMessage = 'Failed to fetch products.';
			products = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => loadProducts(''));

	/** ---- SEARCH ---- **/
	function performSearch() {
		if (searchQuery.trim() === '') return;
		loadProducts(searchQuery);
	}

	/** ---- FILTER AND SORT ---- **/
	function applyFiltersAndSort() {
		let filtered = [...allProducts];

		// Apply price filter
		if (minPrice !== null && minPrice !== undefined) {
			const min = minPrice;
			filtered = filtered.filter((p) => p.price >= min);
		}
		if (maxPrice !== null && maxPrice !== undefined) {
			const max = maxPrice;
			filtered = filtered.filter((p) => p.price <= max);
		}

		// Apply sorting
		if (sortBy === 'price_asc') {
			filtered.sort((a, b) => a.price - b.price);
		} else if (sortBy === 'price_desc') {
			filtered.sort((a, b) => b.price - a.price);
		}
		// "default" keeps original order (already sorted by backend)

		// Preserve cart quantities from products array when filtering
		// Match by product ID to keep cart state
		const cartQuantityMap = new Map(
			products.map((p) => [p.id, { cartQty: p.cartQty, isQtyLoading: p.isQtyLoading }])
		);
		filtered = filtered.map((p) => {
			const cartData = cartQuantityMap.get(p.id);
			if (cartData) {
				p.cartQty = cartData.cartQty;
				p.isQtyLoading = cartData.isQtyLoading;
			}
			return p;
		});

		products = filtered;
	}

	function handleMinPriceChange(value: string) {
		minPrice = value === '' ? null : parseFloat(value);
		applyFiltersAndSort();
	}

	function handleMaxPriceChange(value: string) {
		maxPrice = value === '' ? null : parseFloat(value);
		applyFiltersAndSort();
	}

	function handleSortChange(newSort: string) {
		sortBy = newSort;
		applyFiltersAndSort();
	}

	function clearFilters() {
		minPrice = null;
		maxPrice = null;
		sortBy = 'default';
		applyFiltersAndSort();
	}

	/** ------------------------------------------------------------------
	    ADD TO CART (unified logic with + button)
	   ------------------------------------------------------------------ **/
	async function addToCart(productId: number) {
		// Update in both products and allProducts to preserve state
		const p = products.find((p) => p.id === productId);
		const allP = allProducts.find((p) => p.id === productId);
		if (!p) return;

		// Start spinner immediately
		p.isQtyLoading = true;

		// Show quantity controls immediately
		if (p.cartQty === null) p.cartQty = 0;

		// Optimistic: pretend we're adding one - update both arrays
		const optimistic = p.cartQty + 1;
		p.cartQty = optimistic;
		if (allP) {
			allP.cartQty = optimistic;
			allP.isQtyLoading = true;
		}

		// Success toast stays as requested
		toast.success(`${p.name} added to cart`, { duration: 2000 });

		try {
			const res = await fetch('/api/retailer/cart', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_id: productId,
					quantity: 1
				})
			});

			if (res.status === 401) {
				toast.error('Please sign in to add items to cart');
				await goto(resolve('/signin'));
				return;
			}

			if (!res.ok) throw new Error('Add to cart failed');

			const data = await res.json();

			p.cartQty = data.quantity; // backend truth
			p.isQtyLoading = false;
			if (allP) {
				allP.cartQty = data.quantity;
				allP.isQtyLoading = false;
			}
		} catch (err) {
			console.error(err);

			// Rollback - update both arrays
			p.cartQty = null;
			p.isQtyLoading = false;
			if (allP) {
				allP.cartQty = null;
				allP.isQtyLoading = false;
			}

			toast.error('Failed to add to cart');
		}
	}

	/** ---- INCREASE QUANTITY ---- **/
	async function increaseQty(productId: number) {
		// Update in both products and allProducts to preserve state
		const p = products.find((p) => p.id === productId);
		const allP = allProducts.find((p) => p.id === productId);
		if (!p || p.cartQty === null) return;

		// Check stock limit before increasing
		if (p.cartQty >= p.stock_qty) {
			toast.error(`Only ${p.stock_qty} available in stock. Cannot add more.`);
			return;
		}

		const oldQty = p.cartQty;

		// Optimistic - update both arrays
		p.cartQty++;
		p.isQtyLoading = true;
		if (allP) {
			allP.cartQty = p.cartQty;
			allP.isQtyLoading = true;
		}

		try {
			const res = await fetch('/api/retailer/cart', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_id: productId,
					quantity: 1
				})
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				await goto(resolve('/signin'));
				return;
			}

			if (!res.ok) throw new Error('Failed to update quantity');

			const data = await res.json();
			p.cartQty = data.quantity;
			p.isQtyLoading = false;
			if (allP) {
				allP.cartQty = data.quantity;
				allP.isQtyLoading = false;
			}
		} catch (err) {
			console.error(err);
			p.cartQty = oldQty;
			p.isQtyLoading = false;
			if (allP) {
				allP.cartQty = oldQty;
				allP.isQtyLoading = false;
			}

			toast.error('Failed to update quantity');
		}
	}

	/** ---- DECREASE QUANTITY ---- **/
	async function decreaseQty(productId: number) {
		// Update in both products and allProducts to preserve state
		const p = products.find((p) => p.id === productId);
		const allP = allProducts.find((p) => p.id === productId);
		if (!p || p.cartQty === null) return;

		const oldQty = p.cartQty;

		// optimistic - update both arrays
		p.cartQty--;
		p.isQtyLoading = true;
		if (allP) {
			allP.cartQty = p.cartQty;
			allP.isQtyLoading = true;
		}

		try {
			const res = await fetch('/api/retailer/cart', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_id: productId,
					quantity: -1
				})
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				await goto(resolve('/signin'));
				return;
			}

			if (!res.ok) throw new Error('Failed to update quantity');

			const data = await res.json();

			const newQty = data.quantity;
			p.cartQty = newQty <= 0 ? null : newQty;
			p.isQtyLoading = false;

			if (allP) {
				allP.cartQty = p.cartQty;
				allP.isQtyLoading = false;
			}
		} catch (err) {
			console.error(err);
			p.cartQty = oldQty;
			p.isQtyLoading = false;
			if (allP) {
				allP.cartQty = oldQty;
				allP.isQtyLoading = false;
			}

			toast.error('Failed to update quantity');
		}
	}
</script>

<div class="min-h-screen bg-background">
	<header
		class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
	>
		<div class="container mx-auto grid h-16 grid-cols-3 items-center gap-4 px-4">
			<!-- Brand -->
			<div class="flex items-center">
				<Button
					variant="ghost"
					class="bg-linear-to-r from-white to-gray-400 bg-clip-text text-2xl font-extrabold tracking-wide text-transparent px-0"
					href={resolve('/dashboard')}
				>
					Obsonarium
				</Button>
			</div>

			<!-- Search -->
			<div class="flex items-center mx-auto w-full max-w-xl gap-2 relative">
				<div class="relative flex-1">
					<Search class="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />

					<Input
						type="search"
						placeholder="Search products..."
						bind:value={searchQuery}
						class="w-full h-11 pl-11 pr-10 text-base"
						onkeydown={(e) => {
							if (e.key === 'Enter') performSearch();
						}}
					/>
				</div>

				<Button onclick={performSearch} size="default">Search</Button>
			</div>

			<!-- Cart Button -->
			<div class="flex items-center justify-end gap-4">
				<Button variant="outline" href={resolve('/wholesale/cart')} class="gap-2">
					<ShoppingCart class="size-5" />
					Cart
				</Button>
			</div>
		</div>
	</header>

	<main class="container mx-auto px-4 py-8">
		<!-- Back Button -->
		<Button variant="ghost" class="mb-6 px-0" href={resolve('/dashboard')}>
			<ArrowLeft class="mr-2 size-4" /> Back to Dashboard
		</Button>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Min Price:</label>
				<Input
					type="number"
					placeholder="Min"
					class="w-24"
					value={minPrice?.toString() ?? ''}
					oninput={(e) => handleMinPriceChange((e.target as HTMLInputElement).value)}
				/>
			</div>

			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Max Price:</label>
				<Input
					type="number"
					placeholder="Max"
					class="w-24"
					value={maxPrice?.toString() ?? ''}
					oninput={(e) => handleMaxPriceChange((e.target as HTMLInputElement).value)}
				/>
			</div>

			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Sort:</label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					value={sortBy}
					onchange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}
				>
					<option value="default">Default</option>
					<option value="price_asc">Price: Low to High</option>
					<option value="price_desc">Price: High to Low</option>
				</select>
			</div>

			<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
		</div>

		<!-- Loading -->
		{#if loading}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each Array(8) as _}
					<Card.Root class="overflow-hidden">
						<div class="relative aspect-square w-full bg-muted">
							<Skeleton class="h-full w-full" />
						</div>
						<Card.Content class="p-4">
							<Card.Header class="p-0 pb-2">
								<Skeleton class="h-6 w-3/4 mb-2" />
								<Skeleton class="h-4 w-full" />
							</Card.Header>
							<Card.Footer class="flex items-center justify-between p-0 pt-4">
								<Skeleton class="h-6 w-20" />
								<Skeleton class="h-9 w-24" />
							</Card.Footer>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<!-- Product Grid -->
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each products as product (product.id)}
					<Card.Root class="group overflow-hidden transition-shadow hover:shadow-lg">
						<a
							href={resolve(`/wholesale/${product.id}`)}
							class="block relative aspect-square w-full overflow-hidden bg-muted"
						>
							<img
								src={product.image}
								alt={product.name}
								class="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
						</a>

						<Card.Content class="p-4">
							<Card.Header class="p-0 pb-2">
								<a href={resolve(`/wholesale/${product.id}`)} class="hover:text-primary transition-colors">
									<Card.Title class="text-lg font-semibold line-clamp-1">
										{product.name}
									</Card.Title>
								</a>

								{#if product.stock_qty > 0}
									<Card.Description class="text-sm text-muted-foreground">
										{product.stock_qty} in stock
									</Card.Description>
								{:else}
									<Card.Description class="text-sm text-destructive">Out of stock</Card.Description>
								{/if}
							</Card.Header>

							<Card.Footer class="flex items-center justify-between p-0 pt-4">
								<span class="text-xl font-bold">₹{product.price.toFixed(2)}</span>

								<!-- CART UI -->
								{#if product.cartQty === null}
									<!-- Add to Cart Button -->
									<Button
										size="sm"
										disabled={product.stock_qty === 0}
										onclick={() => addToCart(product.id)}
									>
										Add to Cart
									</Button>
								{:else}
									<!-- Quantity Controls -->
									<div class="flex items-center gap-2">
										<Button
											size="sm"
											disabled={product.isQtyLoading}
											onclick={() => decreaseQty(product.id)}
										>
											-
										</Button>

										{#if product.isQtyLoading}
											<Loader2 class="size-4 animate-spin" />
										{:else}
											<span class="font-semibold">{product.cartQty}</span>
										{/if}

										<Button
											size="sm"
											disabled={product.isQtyLoading || (product.cartQty !== null && product.cartQty >= product.stock_qty)}
											onclick={() => increaseQty(product.id)}
										>
											+
										</Button>
									</div>
								{/if}
							</Card.Footer>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			{#if products.length === 0}
				<div class="pt-12 text-center text-muted-foreground">
					<p class="text-lg font-medium">No products found</p>
					<p class="mt-2 text-sm">Try refining your search</p>
				</div>
			{/if}
		{/if}
	</main>
</div>
