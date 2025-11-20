<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Loader2, ImageIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let name = '';
	let price = '';
	let stockQty = '';
	let imageUrl = '';
	let description = '';

	let uploadingImage = false;
	let saving = false;

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadingImage = true;
		try {
			const url = await uploadImage(file);
			imageUrl = url;
			toast.success('Image uploaded');
		} catch (error) {
			console.error('Image upload failed', error);
			toast.error('Failed to upload image');
		} finally {
			uploadingImage = false;
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

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		const parsedPrice = Number(price);
		const parsedStock = Number(stockQty);

		if (!name.trim()) {
			toast.error('Product name is required');
			return;
		}

		if (!imageUrl) {
			toast.error('Please upload an image');
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

		saving = true;
		try {
			const response = await fetch('/api/retailer/products', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					price: parsedPrice,
					stock_qty: parsedStock,
					image_url: imageUrl,
					description: description.trim()
				})
			});

			if (response.status === 401) {
				toast.error('Please sign in to add products');
				await goto('/signin');
				return;
			}

			if (!response.ok) throw new Error('Failed to create product');

			toast.success('Product created');
			goto('/inventory');
		} catch (error) {
			console.error(error);
			toast.error('Failed to create product');
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-3xl">
		<Button variant="ghost" class="mb-6 px-0" href="/inventory">
			&larr; Back to Inventory
		</Button>

		<div class="space-y-8 rounded-lg border bg-card p-6 shadow-sm">
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Add Product</h1>
				<p class="text-muted-foreground">Create a new item for your store</p>
			</div>

			<form class="space-y-6" on:submit={handleSubmit}>
				<div class="space-y-2">
					<label class="text-sm font-medium" for="name">Product Name</label>
					<Input id="name" bind:value={name} placeholder="Enter product name" required />
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="price">Price</label>
						<Input
							id="price"
							type="number"
							min="0"
							step="0.01"
							bind:value={price}
							placeholder="0.00"
							required
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-medium" for="stock">Stock Quantity</label>
						<Input
							id="stock"
							type="number"
							min="0"
							step="1"
							bind:value={stockQty}
							placeholder="0"
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<label class="text-sm font-medium" for="description">Description (optional)</label>
					<textarea
						id="description"
						class="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						bind:value={description}
					></textarea>
				</div>

				<div class="space-y-2">
					<label class="text-sm font-medium" for="image">Product Image</label>
					<div class="flex flex-col gap-4 rounded-lg border p-4">
						{#if imageUrl}
							<img src={imageUrl} alt="Preview" class="h-48 w-full rounded-md object-cover" />
						{:else}
							<div class="flex h-48 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
								<ImageIcon class="size-10" />
							</div>
						{/if}

						<!-- use native input instead of <Input> -->
						<input
							id="image"
							type="file"
							accept="image/*"
							class="text-sm"
							on:change={handleFileChange}
						/>

						{#if uploadingImage}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 class="size-4 animate-spin" />
								Uploading image...
							</div>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-3">
					<Button type="submit" disabled={saving || uploadingImage} class="min-w-32">
						{#if saving}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Saving...
						{:else}
							Save Product
						{/if}
					</Button>
					<Button type="button" variant="secondary" href="/inventory" disabled={saving}>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	</div>
</div>
