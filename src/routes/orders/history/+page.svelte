<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Loader2, Package, CheckCircle2, XCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';

	interface OrderItem {
		id: number;
		order_id: number;
		product_id: number;
		product_name?: string;
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
			<h1 class="mb-2 text-3xl font-bold tracking-tight">Order History</h1>
			<p class="text-muted-foreground">View completed and rejected orders</p>
		</div>

		{#if loading}
			<div class="space-y-4">
				{#each Array(3) as _}
					<Card.Root>
						<Card.Content class="p-6">
							<Skeleton class="mb-4 h-6 w-1/4" />
							<Skeleton class="mb-2 h-4 w-full" />
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
					<Package class="mx-auto mb-4 size-12 text-muted-foreground" />
					<p class="mb-2 text-lg font-medium">No order history yet</p>
					<p class="text-muted-foreground">Completed and rejected orders will appear here.</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-6">
				{#each orders as order (order.id)}
					<Card.Root class="overflow-hidden rounded-xl border shadow-sm">
						<Card.Header class="flex justify-between bg-muted/40 px-6 py-4">
							<div>
								<h2 class="text-lg font-semibold">Order #{order.id}</h2>
								<p class="text-sm text-muted-foreground">
									{new Date(
										order.created_at.endsWith('Z')
											? order.created_at.slice(0, -1)
											: order.created_at
									).toLocaleString('en-IN', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
										hour12: true
									})}
								</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium">Order: {order.order_status}</p>
							</div>
						</Card.Header>

						<Card.Content class="space-y-5 px-6 py-4">
							{#each order.items as item (item.id)}
								{@const StatusIcon = getStatusIcon(item.status)}
								<div class="rounded-lg border bg-card p-4 shadow-sm">
									<!-- ITEM HEADER -->
									<div class="mb-3 flex items-center justify-between">
										<div>
											<p class="font-medium">{item.product_name || `Product #${item.product_id}`}</p>
											<p class="text-sm text-muted-foreground">
												Qty: {item.qty} × ₹{item.unit_price.toFixed(2)}
											</p>
										</div>

										<div
											class="rounded-full border px-3 py-1 text-xs font-medium {getStatusColor(
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
									<div class="flex items-center gap-2 text-sm font-medium text-green-600">
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
