<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Loader2, ImageIcon, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let productId = '';
	productId = $page.params.id ?? "";

	let name = $state('');
	let price = $state('');
	let stockQty = $state('');
	let imageUrl = $state('');
	let description = $state('');

	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let uploadingImage = $state(false);
	let errorMessage = $state('');

	let fileInput: HTMLInputElement | null = $state(null);

	onMount(async () => {
		await loadProduct();
	});

	async function loadProduct() {
		if (!productId) return;
		loading = true;
		try {
			const response = await fetch(`/api/retailer/products/${productId}`, {
				credentials: 'include'
			});

			if (response.status === 401) {
				toast.error('Please sign in to continue');
				await goto('/signin');
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to load product');
			}

			const data = await response.json();
			const product = data.product;
			name = product.name ?? '';
			price = product.price?.toString() ?? '';
			stockQty = product.stock_qty?.toString() ?? '';
			imageUrl = product.image_url ?? '';
			description = product.description ?? '';
		} catch (error) {
			console.error('Failed to load product', error);
			errorMessage = 'Failed to load product details.';
		} finally {
			loading = false;
		}
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadingImage = true;
		try {
			const url = await uploadImage(file);
			imageUrl = url;
			toast.success('Image updated');
		} catch (error) {
			console.error('Failed to upload image', error);
			toast.error('Failed to upload image');
		} finally {
			uploadingImage = false;
			if (fileInput) {
				fileInput.value = '';
			}
		}
	}

	async function uploadImage(file: File) {
		const formData = new FormData();
		formData.append('image', file);

		const response = await fetch('/api/upload/product-image', {
			method: 'POST',
			body: formData,
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to upload image');
		}

		const data = await response.json();
		return data.url as string;
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		const parsedPrice = Number(price);
		const parsedStock = Number(stockQty);

		if (!name.trim()) {
			toast.error('Product name is required');
			return;
		}

		if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
			toast.error('Enter a valid price');
			return;
		}

		if (Number.isNaN(parsedStock) || parsedStock < 0) {
			toast.error('Enter a valid stock quantity');
			return;
		}

		if (!imageUrl) {
			toast.error('Please upload an image');
			return;
		}

		saving = true;
		try {
			const response = await fetch(`/api/retailer/products/${productId}`, {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					price: parsedPrice,
					stock_qty: parsedStock,
					image_url: imageUrl,
					description: description.trim()
				})
			});

			if (response.status === 401) {
				toast.error('Please sign in to continue');
				await goto('/signin');
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to save product');
			}

			toast.success('Product updated');
			await goto('/inventory');
		} catch (error) {
			console.error('Failed to save product', error);
			toast.error('Failed to save product');
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Delete this product?')) {
			return;
		}

		deleting = true;
		try {
			const response = await fetch(`/api/retailer/products/${productId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (response.status === 401) {
				toast.error('Please sign in to continue');
				await goto('/signin');
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to delete product');
			}

			toast.success('Product deleted');
			await goto('/inventory');
		} catch (error) {
			console.error('Failed to delete product', error);
			toast.error('Failed to delete product');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-3xl">
		<Button variant="ghost" class="mb-6 px-0" href="/inventory">
			&larr; Back to Inventory
		</Button>

		{#if loading}
			<div class="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
				<Loader2 class="size-8 animate-spin text-muted-foreground" />
				<p class="text-muted-foreground">Loading product...</p>
			</div>
		{:else if errorMessage}
			<div class="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive">
				<p>{errorMessage}</p>
			</div>
		{:else}
			<div class="space-y-8 rounded-lg border bg-card p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold tracking-tight">{name || 'Product'}</h1>
						<p class="text-muted-foreground">Update product details and images</p>
					</div>
					<Button
						type="button"
						variant="destructive"
						onclick={handleDelete}
						disabled={deleting}
						class="min-w-32"
					>
						{#if deleting}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Deleting...
						{:else}
							<Trash2 class="mr-2 size-4" />
							Delete
						{/if}
					</Button>
				</div>

				<form class="space-y-6" onsubmit={handleSave}>
					<div class="space-y-2">
						<label class="text-sm font-medium" for="name">Product Name</label>
						<Input id="name" bind:value={name} required />
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<label class="text-sm font-medium" for="price">Price</label>
							<Input id="price" type="number" min="0" step="0.01" bind:value={price} required />
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium" for="stock">Stock Quantity</label>
							<Input id="stock" type="number" min="0" step="1" bind:value={stockQty} required />
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium" for="description">Description</label>
						<textarea
							id="description"
							class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							bind:value={description}
						></textarea>
					</div>

					<div class="space-y-2">
						<span class="text-sm font-medium">Product Image</span>
						<div class="flex flex-col gap-4 rounded-lg border p-4">
							{#if imageUrl}
								<img src={imageUrl} alt="Uploaded" class="h-48 w-full rounded-md object-cover" />
							{:else}
								<div class="flex h-48 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
									<ImageIcon class="size-10" />
								</div>
							{/if}

							<div class="flex items-center gap-3">
								<Button type="button" variant="outline" onclick={() => fileInput?.click()}>
									Change Image
								</Button>
								{#if uploadingImage}
									<div class="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 class="size-4 animate-spin" />
										Uploading...
									</div>
								{/if}
							</div>
							<input
								type="file"
								accept="image/*"
								class="hidden"
								bind:this={fileInput}
								onchange={handleFileChange}
							/>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<Button type="submit" disabled={saving || uploadingImage} class="min-w-32">
							{#if saving}
								<Loader2 class="mr-2 size-4 animate-spin" />
								Saving...
							{:else}
								Save Changes
							{/if}
						</Button>
						<Button type="button" variant="secondary" href="/inventory" disabled={saving}>
							Cancel
						</Button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

