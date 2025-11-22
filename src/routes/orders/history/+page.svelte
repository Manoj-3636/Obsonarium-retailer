<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Loader2,
		Package,
		CheckCircle2,
		XCircle
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

	let loading = $state(true);
	let orders = $state<ConsumerOrder[]>([]);
	let errorMessage = $state<string | null>(null);

	onMount(() => {
		loadOrders();
	});

	async function loadOrders() {
		loading = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/retailer/orders/history', {
				credentials: 'include'
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				window.location.href = '/signin';
				return;
			}

			if (!res.ok) throw new Error('Failed to fetch order history');

			const data = await res.json();
			orders = data.orders || [];
		} catch (err) {
			console.error(err);
			errorMessage = 'Failed to load order history';
		} finally {
			loading = false;
		}
	}

	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			rejected: 'bg-red-100 text-red-800 border-red-300',
			delivered: 'bg-green-100 text-green-800 border-green-300'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
	}

	function getStatusIcon(status: string) {
		const icons: Record<string, any> = {
			rejected: XCircle,
			delivered: CheckCircle2
		};
		return icons[status] || Package;
	}
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-6xl">
		<Button variant="ghost" class="mb-6 px-0" href={resolve('/orders')}>
			&larr; Back to Active Orders
		</Button>

		<div class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight mb-2">Order History</h1>
			<p class="text-muted-foreground">View completed and rejected orders</p>
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
		{:else if errorMessage}
			<Card.Root>
				<Card.Content class="p-6 text-center text-destructive">
					<p>{errorMessage}</p>
					<Button onclick={loadOrders} class="mt-4">Retry</Button>
				</Card.Content>
			</Card.Root>
		{:else if orders.length === 0}
			<Card.Root>
				<Card.Content class="p-12 text-center">
					<Package class="size-12 mx-auto mb-4 text-muted-foreground" />
					<p class="text-lg font-medium mb-2">No order history yet</p>
					<p class="text-muted-foreground">Completed and rejected orders will appear here.</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-6">
				{#each orders as order (order.id)}
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
								{@const StatusIcon = getStatusIcon(item.status)}
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
											{#if item.status === 'rejected'}
												Rejected
											{:else if item.status === 'delivered'}
												Delivered
											{:else}
												{item.status}
											{/if}
										</div>
									</div>

									<!-- COMPLETED STATUS -->
									<div class="text-sm text-green-600 font-medium flex items-center gap-2">
										{#if item.status === 'delivered'}
											<CheckCircle2 class="size-4" />
											Order Completed Successfully
										{:else if item.status === 'rejected'}
											<XCircle class="size-4" />
											Order Rejected
										{/if}
									</div>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
</div>

