<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2 } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	$: orderId = $page.url.searchParams.get('order_id');
</script>

<div class="container mx-auto px-4 py-20">
	<div class="max-w-2xl mx-auto text-center space-y-6">
		<div class="size-24 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-6">
			<CheckCircle2 class="size-12" />
		</div>
		<h1 class="text-4xl font-bold">Payment Successful!</h1>
		<p class="text-lg text-muted-foreground">
			Your order has been placed successfully.
			{#if orderId}
				<br />
				Order ID: <span class="font-semibold text-foreground">#{orderId}</span>
			{/if}
		</p>
		<div class="pt-6 space-x-4">
			<Button href={resolve('/wholesale')} size="lg">Continue Shopping</Button>
			<Button href={resolve('/wholesale/orders')} variant="outline" size="lg">View Orders</Button>
		</div>
	</div>
</div>

