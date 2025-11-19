<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { ShoppingCart, Package, Store, MessageSquare, ArrowRight } from "@lucide/svelte";
	import { resolve } from "$app/paths";
</script>

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
