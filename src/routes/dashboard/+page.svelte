<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { ShoppingCart, Package, Store, MessageSquare, ArrowRight, Loader2 } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let checking = $state(true);
	let showDashboard = $state(false);
	let hasRedirected = $state(false); // Prevent multiple redirects

	onMount(async () => {
		// Prevent multiple onMount calls from causing loops
		if (hasRedirected) return;

		try {
			const response = await fetch('/api/retailers/me', {
				credentials: 'include'
			});

			// Step 1: Check authentication
			if (response.status === 401) {
				// Not authenticated, redirect to signin
				if (!hasRedirected) {
					hasRedirected = true;
					toast.error('Please sign in to access the dashboard');
					await goto('/signin');
				}
				return;
			}

			// Step 2: Check if request was successful
			if (!response.ok) {
				throw new Error('Failed to check authentication and onboarding status');
			}

			// Step 3: Check onboarding status
			const data = await response.json();
			if (!data.onboarded) {
				// Authenticated but not onboarded, redirect to onboarding
				if (!hasRedirected) {
					hasRedirected = true;
					await goto('/onboarding');
				}
				return;
			}

			// Step 4: Authenticated and onboarded - show dashboard
			showDashboard = true;
		} catch (error) {
			console.error('Error checking authentication/onboarding status:', error);
			toast.error('Failed to verify authentication. Please try again.');
			// On error, redirect to signin as a safe fallback
			if (!hasRedirected) {
				hasRedirected = true;
				await goto('/signin');
			}
		} finally {
			checking = false;
		}
	});
</script>

{#if checking}
	<div class="min-h-screen bg-background flex items-center justify-center">
		<div class="flex flex-col items-center gap-4">
			<Loader2 class="size-8 animate-spin text-muted-foreground" />
			<p class="text-muted-foreground">Verifying authentication...</p>
		</div>
	</div>
{:else if showDashboard}
<div class="min-h-screen bg-background">
	<header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
		<div class="container mx-auto flex h-16 items-center justify-between px-4">
			<h1
				class="bg-linear-to-r from-white to-gray-400 bg-clip-text text-2xl font-extrabold tracking-wide text-transparent"
			>
				Retailer Dashboard
			</h1>

			<Button variant="ghost" href={resolve("/")}>Back to Home</Button>
		</div>
	</header>

	<main class="container mx-auto px-4 py-10">
		<h2 class="text-3xl font-bold tracking-tight mb-2">Welcome, Retailer</h2>
		<p class="text-muted-foreground mb-10">
			Manage your store, track orders, handle customers, and place wholesale orders.
		</p>

		<!-- Dashboard Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">

			<!-- Inventory Management -->
			<Card.Root class="flex flex-col h-full justify-between hover:shadow-lg transition-shadow">
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="text-xl font-semibold">Inventory</Card.Title>
						<Package class="size-6 text-muted-foreground" />
					</div>
					<Card.Description>Manage your products and stock levels</Card.Description>
				</Card.Header>

				<Card.Footer>
					<Button class="w-full" href={resolve('/inventory')}>
						Manage Inventory <ArrowRight class="ml-2 size-4" />
					</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Customer Orders -->
			<Card.Root class="flex flex-col h-full justify-between hover:shadow-lg transition-shadow">
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="text-xl font-semibold">Customer Orders</Card.Title>
						<ShoppingCart class="size-6 text-muted-foreground" />
					</div>
					<Card.Description>View and manage orders placed by customers</Card.Description>
				</Card.Header>

				<Card.Footer>
					<Button class="w-full" href={resolve('/orders')}>
						View Orders <ArrowRight class="ml-2 size-4" />
					</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Orders from Wholesalers -->
			<Card.Root class="flex flex-col h-full justify-between hover:shadow-lg transition-shadow">
                <Card.Header>
                    <div class="flex items-center justify-between">
                        <Card.Title class="text-xl font-semibold">Wholesale Orders</Card.Title>
                        <Store class="size-6 text-muted-foreground" />
                    </div>
                    <Card.Description>
                        Order items from wholesalers
                    </Card.Description>
                </Card.Header>
            
                <Card.Footer class="flex flex-col gap-2">
                    <Button class="w-full" href={resolve('/wholesale')}>
                        Order from Wholesalers <ArrowRight class="ml-2 size-4" />
                    </Button>
            
                    <Button variant="secondary" class="w-full" href={resolve('/wholesale/status')}>
                        View Order Status <ArrowRight class="ml-2 size-4" />
                    </Button>
                </Card.Footer>
            </Card.Root>
            

			<!-- Customer Queries & Reviews -->
			<Card.Root class="flex flex-col h-full justify-between hover:shadow-lg transition-shadow">
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="text-xl font-semibold">Customer Queries</Card.Title>
						<MessageSquare class="size-6 text-muted-foreground" />
					</div>
					<Card.Description>
						See customer messages, complaints, and reviews
					</Card.Description>
				</Card.Header>

				<Card.Footer>
					<Button class="w-full" href={resolve('/queries')}>
						View Queries <ArrowRight class="ml-2 size-4" />
					</Button>
				</Card.Footer>
			</Card.Root>
           
		</div>
	</main>
</div>
{/if}
