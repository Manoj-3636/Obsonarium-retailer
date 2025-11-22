<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { XCircle } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<div class="container mx-auto px-4 py-20">
	<div class="max-w-2xl mx-auto text-center space-y-6">
		<div class="size-24 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-6">
			<XCircle class="size-12" />
		</div>
		<h1 class="text-4xl font-bold">Payment Cancelled</h1>
		<p class="text-lg text-muted-foreground">
			Your payment was cancelled. No charges were made.
		</p>
		<div class="pt-6 space-x-4">
			<Button href={resolve('/wholesale/cart')} size="lg">Back to Cart</Button>
			<Button href={resolve('/wholesale')} variant="outline" size="lg">Continue Shopping</Button>
		</div>
	</div>
</div>

