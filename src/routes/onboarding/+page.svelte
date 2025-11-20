<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let businessName = '';
	let phone = '';
	let address = '';
	let loading = false;
	let fetching = true;
	let redirecting = false;

	// Phone number validation - allow digits, spaces, +, -
	function handlePhoneInput(e: Event) {
		const target = e.target as HTMLInputElement;
		let value = target.value;
		// Allow digits, spaces, +, -
		const allowed = value.replace(/[^0-9+\-\s]/g, '');
		
		// Update the bound value
		phone = allowed;
		// Update the input value directly to reflect the sanitized value
		if (target.value !== allowed) {
			target.value = allowed;
		}
	}

	// Sanitize phone number to 10 digits
	function sanitizePhone(phoneNumber: string): string {
		let digitsOnly = phoneNumber.replace(/\D/g, '');
		
		// Handle +91 or 91 prefix
		if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
			digitsOnly = digitsOnly.slice(2);
		}
		// Handle 0 prefix
		else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
			digitsOnly = digitsOnly.slice(1);
		}
		
		return digitsOnly;
	}

	// Validate phone number format - must be exactly 10 digits after sanitization
	function validatePhone(phoneNumber: string): boolean {
		const sanitized = sanitizePhone(phoneNumber);
		return sanitized.length === 10;
	}

	onMount(async () => {
		try {
			const response = await fetch('/api/retailers/me', {
				credentials: 'include'
			});

			// Step 1: Check authentication
			if (response.status === 401) {
				// Not authenticated, redirect to signin
				toast.error('Please sign in to access the onboarding page');
				window.location.href = '/signin';
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to fetch retailer profile');
			}

			// Step 2: Check onboarding status
			const data = await response.json();
			if (data.onboarded) {
				// Already onboarded, redirect to dashboard silently
				redirecting = true;
				await goto('/dashboard');
				return;
			}

			// Step 3: Load existing data if available
			if (data.retailer) {
				businessName = data.retailer.business_name || '';
				phone = data.retailer.phone || '';
				address = data.retailer.address || '';
			}
		} catch (error) {
			console.error('Error fetching retailer profile:', error);
			toast.error('Failed to load profile');
		} finally {
			fetching = false;
		}
	});

	async function handleSubmit() {
		if (!businessName.trim() || !phone.trim() || !address.trim()) {
			toast.error('Please fill in all fields');
			return;
		}

		// Validate phone number format
		if (!validatePhone(phone.trim())) {
			toast.error('Please enter a valid 10-digit Indian phone number');
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/retailers/me', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					business_name: businessName.trim(),
					phone: sanitizePhone(phone), // Ensure only 10 digits are sent
					address: address.trim()
				})
			});

			if (response.status === 401) {
				window.location.href = '/signin';
				return;
			}

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update profile');
			}

			const data = await response.json();
			if (data.onboarded) {
				// Show success and redirect to dashboard
				toast.success('Profile completed successfully!');
				redirecting = true;
				// Small delay to show success message before redirect
				setTimeout(async () => {
					await goto('/dashboard');
				}, 500);
			}
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update profile');
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<Card.Title class="text-2xl font-bold">Complete Your Profile</Card.Title>
			<Card.Description>
				Please provide your business information to get started with your retailer dashboard.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if fetching || redirecting}
				<div class="flex flex-col items-center justify-center py-12 gap-4">
					<Loader2 class="size-8 animate-spin text-muted-foreground" />
					<p class="text-muted-foreground">
						{redirecting ? 'Redirecting to dashboard...' : 'Loading...'}
					</p>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
					<div class="space-y-2">
						<label for="businessName" class="text-sm font-medium">Business Name *</label>
						<Input
							id="businessName"
							type="text"
							bind:value={businessName}
							placeholder="Enter your business name"
							required
							disabled={loading}
						/>
					</div>

					<div class="space-y-2">
						<label for="phone" class="text-sm font-medium">Phone Number *</label>
						<Input
							id="phone"
							type="tel"
							bind:value={phone}
							oninput={handlePhoneInput}
							placeholder="e.g., 9876543210"
							required
							disabled={loading}
							pattern="[0-9+\-\s]*"
							title="Enter a valid Indian phone number (e.g. 9876543210, +91 9876543210)"
						/>
						<p class="text-xs text-muted-foreground">
							Enter your Indian phone number (e.g. +91 9876543210)
						</p>
					</div>

					<div class="space-y-2">
						<label for="address" class="text-sm font-medium">Business Address *</label>
						<textarea
							id="address"
							bind:value={address}
							placeholder="Enter your business address"
							required
							disabled={loading}
							class="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							rows="3"
						></textarea>
					</div>

					<div class="flex gap-4 pt-4">
						<Button type="submit" class="flex-1" disabled={loading}>
							{loading ? 'Saving...' : 'Complete Onboarding'}
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

