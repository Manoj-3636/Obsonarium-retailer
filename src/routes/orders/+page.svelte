<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Loader2,
		Package,
		CheckCircle2,
		History
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';

	interface OrderItem {
		id: number;
		order_id: number;
		product_id: number;
		qty: number;
		unit_price: number;
		status: string;
	}

	interface ConsumerOrder {
		id: number;
		consumer_id: number;
		payment_method: string;
		payment_status: string;
		order_status: string;
		total_amount: number;
		scheduled_at: string | null;
		address_id: number | null;
		created_at: string;
		updated_at: string;
		items: OrderItem[];
	}

	type StatusFilter =
		| 'all'
		| 'accepted'
		| 'rejected'
		| 'shipped'
		| 'delivered'
		| 'pending'
		| 'cancelled';

	const statusOptions = [
		{ value: 'all', label: 'All', icon: Package }
	];

	let loading = $state(true);
	let orders = $state<ConsumerOrder[]>([]);
	let errorMessage = $state<string | null>(null);
	let statusFilter = $state<StatusFilter>('all');
	let updatingItemId = $state<number | null>(null);

	onMount(() => {
		loadOrders();
	});

	async function loadOrders() {
		loading = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/retailer/orders', {
				credentials: 'include'
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				window.location.href = '/signin';
				return;
			}

			if (!res.ok) throw new Error('Failed to fetch orders');

			const data = await res.json();
			orders = data.orders || [];
		} catch (err) {
			console.error(err);
			errorMessage = 'Failed to load orders';
		} finally {
			loading = false;
		}
	}

	async function updateItemStatus(itemId: number, newStatus: string) {
		updatingItemId = itemId;

		try {
			const res = await fetch(`/api/retailer/orders/items/${itemId}/status`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				window.location.href = '/signin';
				return;
			}

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Failed to update status');
			}

			toast.success('Order item status updated successfully');


			await loadOrders();
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || 'Failed to update status');
		} finally {
			updatingItemId = null;
		}
	}

	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			accepted: 'bg-blue-100 text-blue-800 border-blue-300',
			rejected: 'bg-red-100 text-red-800 border-red-300',
			shipped: 'bg-purple-100 text-purple-800 border-purple-300',
			delivered: 'bg-green-100 text-green-800 border-green-300'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
	}

	const filteredOrders = $derived(() => {
		return orders;
	});
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-6xl">
		<Button variant="ghost" class="mb-6 px-0" href={resolve('/dashboard')}>
			&larr; Back to Dashboard
		</Button>

		<div class="flex items-center justify-between mb-6">
			<h1 class="text-3xl font-bold tracking-tight">Manage Orders</h1>
			<Button variant="outline" href={resolve('/orders/history')}>
				<History class="size-4 mr-2" />
				View History
			</Button>
		</div>

		{#if loading}
			<div class="space-y-4">
				{#each Array(3) as _}
					<Card.Root>
						<Card.Content class="p-6">
							<Skeleton class="h-6 w-1/4 mb-4" />
							<Skeleton class="h-4 w-full mb-2" />
							<Skeleton class="h-4 w-3/4" />
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else if filteredOrders().length === 0}
			<Card.Root>
				<Card.Content class="p-12 text-center">
					<Package class="size-12 mx-auto mb-4 text-muted-foreground" />
					<p class="text-lg font-medium mb-2">No orders found</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-6">
				{#each filteredOrders() as order (order.id)}
					<Card.Root class="overflow-hidden border shadow-sm rounded-xl">
						<Card.Header class="bg-muted/40 px-6 py-4 flex justify-between">
							<div>
								<h2 class="font-semibold text-lg">Order #{order.id}</h2>
								<p class="text-sm text-muted-foreground">
									{new Date(order.created_at).toLocaleString()}
								</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium">Order: {order.order_status}</p>
							</div>
						</Card.Header>

						<Card.Content class="px-6 py-4 space-y-5">
							{#each order.items as item (item.id)}
								<div class="border rounded-lg p-4 shadow-sm bg-card">

									<!-- ITEM HEADER -->
									<div class="flex justify-between items-center mb-3">
										<div>
											<p class="font-medium">Product #{item.product_id}</p>
											<p class="text-sm text-muted-foreground">
												Qty: {item.qty} × ₹{item.unit_price.toFixed(2)}
											</p>
										</div>

										<div
											class="rounded-full px-3 py-1 text-xs font-medium border {getStatusColor(
												item.status
											)}"
										>
											{#if item.status === 'pending'}
												Awaiting Response
											{:else if item.status === 'accepted'}
												Accepted
											{:else if item.status === 'shipped'}
												Shipped
											{:else if item.status === 'delivered'}
												Delivered
											{:else}
												{item.status}
											{/if}
										</div>
									</div>

									<!-- STATUS ACTION ROW -->
									<div class="flex gap-2 mt-2 flex-wrap">
										{#if item.status === 'pending'}
											<!-- Step 1: Accept or Reject -->
											<Button
												size="sm"
												variant="default"
												disabled={updatingItemId === item.id}
												onclick={() => updateItemStatus(item.id, 'accepted')}
											>
												Accept Order
											</Button>

											<Button
												size="sm"
												variant="destructive"
												disabled={updatingItemId === item.id}
												onclick={() => updateItemStatus(item.id, 'rejected')}
											>
												Reject Order
											</Button>
										{:else if item.status === 'accepted'}
											<!-- Step 2: Mark as Shipped -->
											<Button
												size="sm"
												variant="default"
												disabled={updatingItemId === item.id}
												onclick={() => updateItemStatus(item.id, 'shipped')}
											>
												Mark as Shipped
											</Button>

											<Button
												size="sm"
												variant="outline"
												disabled={updatingItemId === item.id}
												onclick={() => updateItemStatus(item.id, 'rejected')}
											>
												Cancel Order
											</Button>
										{:else if item.status === 'shipped'}
											<!-- Step 3: Mark as Delivered -->
											<Button
												size="sm"
												variant="default"
												disabled={updatingItemId === item.id}
												onclick={() => updateItemStatus(item.id, 'delivered')}
											>
												Mark as Delivered
											</Button>
										{:else if item.status === 'delivered'}
											<!-- Step 4: Completed - No actions -->
											<div class="text-sm text-green-600 font-medium flex items-center gap-2">
												<CheckCircle2 class="size-4" />
												Order Completed
											</div>
										{/if}
									</div>

									{#if updatingItemId === item.id}
										<div class="flex items-center text-xs mt-2 text-muted-foreground">
											<Loader2 class="size-3 animate-spin mr-2" /> Updating...
										</div>
									{/if}
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
</div>
