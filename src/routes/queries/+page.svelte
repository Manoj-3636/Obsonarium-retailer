<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Loader2, MessageSquare, CheckCircle2, XCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';

	interface ProductQuery {
		id: number;
		product_id: number;
		user_id: number;
		query_text: string;
		response_text: string | null;
		is_resolved: boolean;
		created_at: string;
		resolved_at: string | null;
		product_name?: string;
	}

	let loading = $state(true);
	let queries = $state<ProductQuery[]>([]);
	let errorMessage = $state<string | null>(null);

	// Resolve query state
	let resolvingQueryId = $state<number | null>(null);
	let showResolveForm = $state<number | null>(null);
	let resolveResponse = $state('');

	onMount(() => {
		loadQueries();
	});

	async function loadQueries() {
		loading = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/retailer/queries', {
				credentials: 'include'
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				window.location.href = '/signin';
				return;
			}

			if (!res.ok) throw new Error('Failed to fetch queries');

			const data = await res.json();
			queries = data.queries || [];
		} catch (err) {
			console.error(err);
			errorMessage = 'Failed to load queries';
		} finally {
			loading = false;
		}
	}

	async function handleResolve(queryId: number) {
		if (!resolveResponse.trim()) {
			toast.error('Please enter a response');
			return;
		}

		resolvingQueryId = queryId;

		try {
			const res = await fetch(`/api/retailer/queries/${queryId}/resolve`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					response_text: resolveResponse.trim()
				})
			});

			if (res.status === 401) {
				toast.error('Please sign in to continue');
				window.location.href = '/signin';
				return;
			}

			if (!res.ok) throw new Error('Failed to resolve query');

			toast.success('Query resolved successfully');
			showResolveForm = null;
			resolveResponse = '';
			await loadQueries();
		} catch (err) {
			console.error(err);
			toast.error('Failed to resolve query');
		} finally {
			resolvingQueryId = null;
		}
	}

	function openResolveForm(queryId: number) {
		showResolveForm = queryId;
		resolveResponse = '';
	}

	function cancelResolve() {
		showResolveForm = null;
		resolveResponse = '';
	}

	const unresolvedQueries = $derived(queries.filter((q) => !q.is_resolved));
	const resolvedQueries = $derived(queries.filter((q) => q.is_resolved));
</script>

<div class="min-h-screen bg-background px-4 py-8 md:px-8">
	<div class="mx-auto max-w-6xl">
		<Button variant="ghost" class="mb-6 px-0" href={resolve('/dashboard')}>
			&larr; Back to Dashboard
		</Button>

		<div class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight mb-2">Customer Queries</h1>
			<p class="text-muted-foreground">
				View and respond to customer questions about your products
			</p>
		</div>

		{#if loading}
			<div class="space-y-4">
				{#each Array(5) as _}
					<Card.Root>
						<Card.Content class="p-4">
							<Skeleton class="h-6 w-1/4 mb-2" />
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
					<Button onclick={loadQueries} class="mt-4">Retry</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Unresolved Queries -->
			{#if unresolvedQueries.length > 0}
				<div class="mb-8">
					<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
						<XCircle class="size-5 text-orange-500" />
						Unresolved ({unresolvedQueries.length})
					</h2>
					<div class="space-y-4">
						{#each unresolvedQueries as query (query.id)}
							<Card.Root>
								<Card.Content class="p-6">
									<div class="flex items-start justify-between mb-4">
										<div class="flex-1">
											<p class="text-sm text-muted-foreground mb-1">
												Product ID: {query.product_id} • {new Date(query.created_at).toLocaleString()}
											</p>
											<p class="text-base font-medium mb-2">{query.query_text}</p>
										</div>
									</div>

									{#if showResolveForm === query.id}
										<div class="mt-4 space-y-4 border-t pt-4">
											<div>
												<Label for="response-{query.id}">Your Response</Label>
												<textarea
													id="response-{query.id}"
													bind:value={resolveResponse}
													placeholder="Enter your response to this query..."
													class="w-full min-h-[100px] mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
												></textarea>
											</div>
											<div class="flex gap-2">
												<Button
													onclick={() => handleResolve(query.id)}
													disabled={resolvingQueryId === query.id}
												>
													{#if resolvingQueryId === query.id}
														<Loader2 class="size-4 mr-2 animate-spin" />
													{/if}
													Submit Response
												</Button>
												<Button variant="outline" onclick={cancelResolve}>Cancel</Button>
											</div>
										</div>
									{:else}
										<Button
											variant="outline"
											onclick={() => openResolveForm(query.id)}
											disabled={resolvingQueryId !== null}
										>
											<MessageSquare class="size-4 mr-2" />
											Respond
										</Button>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Resolved Queries -->
			{#if resolvedQueries.length > 0}
				<div>
					<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
						<CheckCircle2 class="size-5 text-green-500" />
						Resolved ({resolvedQueries.length})
					</h2>
					<div class="space-y-4">
						{#each resolvedQueries as query (query.id)}
							<Card.Root>
								<Card.Content class="p-6">
									<div class="flex items-start justify-between mb-4">
										<div class="flex-1">
											<p class="text-sm text-muted-foreground mb-1">
												Product ID: {query.product_id} • {new Date(query.created_at).toLocaleString()}
											</p>
											<p class="text-base font-medium mb-2">{query.query_text}</p>
										</div>
										<div class="flex items-center gap-2 text-green-600">
											<CheckCircle2 class="size-5" />
											<span class="text-sm font-medium">Resolved</span>
										</div>
									</div>

									{#if query.response_text}
										<div class="mt-4 border-t pt-4">
											<p class="text-sm font-medium mb-2 text-muted-foreground">Your Response:</p>
											<p class="text-sm bg-muted p-3 rounded-md">{query.response_text}</p>
											{#if query.resolved_at}
												<p class="text-xs text-muted-foreground mt-2">
													Resolved on {new Date(query.resolved_at).toLocaleString()}
												</p>
											{/if}
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/if}

			{#if queries.length === 0}
				<Card.Root>
					<Card.Content class="p-12 text-center">
						<MessageSquare class="size-12 mx-auto mb-4 text-muted-foreground" />
						<p class="text-lg font-medium mb-2">No queries yet</p>
						<p class="text-muted-foreground">Customer queries will appear here when they ask questions about your products.</p>
					</Card.Content>
				</Card.Root>
			{/if}
		{/if}
	</div>
</div>
