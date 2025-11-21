<script lang="ts">
	import { CheckCircle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
</script>

<main class="container mx-auto px-4 py-20 flex flex-col items-center text-center space-y-6">
	<CheckCircle class="h-24 w-24 text-green-500" />
	<h1 class="text-4xl font-bold tracking-tight">Order Placed Successfully!</h1>
	<p class="text-muted-foreground text-lg max-w-md">
		Your wholesale order has been placed. You will receive an email confirmation shortly.
	</p>
	<div class="flex gap-4">
		<Button href={resolve('/wholesale')} size="lg">Continue Shopping</Button>
		<Button href={resolve('/orders')} variant="outline" size="lg">View Orders</Button>
	</div>
</main>
