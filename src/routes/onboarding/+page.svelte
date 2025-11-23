<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, MapPin } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import AddressAutocomplete from '$lib/components/address-autocomplete.svelte';
	import MapPicker from '$lib/components/map-picker.svelte';

	let businessName = '';
	let phone = '';
	let address = '';
	let streetAddress = '';
	let city = '';
	let state = '';
	let postalCode = '';
	let country = '';
	let latitude: number | null = null;
	let longitude: number | null = null;
	let addressSearchValue = '';
	let showMapPicker = false;
	let loading = false;
	let fetching = true;
	let redirecting = false;
	let mapPickerRef: MapPicker | null = null;
	let gettingCurrentLocation = false;

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
				streetAddress = data.retailer.street_address || '';
				city = data.retailer.city || '';
				state = data.retailer.state || '';
				postalCode = data.retailer.postal_code || '';
				country = data.retailer.country || '';
				latitude = data.retailer.latitude || null;
				longitude = data.retailer.longitude || null;
			}
		} catch (error) {
			console.error('Error fetching retailer profile:', error);
			toast.error('Failed to load profile');
		} finally {
			fetching = false;
		}
	});

	function handleAddressSelect(result: {
		latitude: number;
		longitude: number;
		display_name: string;
		address: {
			street_address: string;
			city: string;
			state: string;
			postcode: string;
			country: string;
		};
	}) {
		address = result.display_name;
		latitude = result.latitude;
		longitude = result.longitude;
		addressSearchValue = result.display_name;

		// Populate structured fields
		streetAddress = result.address.street_address || '';
		city = result.address.city || '';
		state = result.address.state || '';
		postalCode = result.address.postcode || '';
		country = result.address.country || '';
	}

	async function handleLocationChange(lat: number, lon: number) {
		latitude = lat;
		longitude = lon;

		// Reverse geocode to get address
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
				{
					headers: {
						'User-Agent': 'Obsonarium/1.0 (https://obsonarium.com)'
					}
				}
			);

			if (response.ok) {
				const data = await response.json();
				address = data.display_name || '';
				addressSearchValue = data.display_name || '';

				// Populate structured fields
				const addr = data.address || {};
				streetAddress = `${addr.house_number || ''} ${addr.road || ''}`.trim();
				city = addr.city || addr.town || addr.village || '';
				state = addr.state || '';
				postalCode = addr.postcode || '';
				country = addr.country || '';
			}
		} catch (error) {
			console.error('Reverse geocoding failed:', error);
		}
	}

	async function useCurrentLocation() {
		if (!navigator.geolocation) {
			toast.error('Geolocation is not supported by your browser');
			return;
		}

		gettingCurrentLocation = true;
		try {
			// Get current location
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				});
			});

			const lat = position.coords.latitude;
			const lon = position.coords.longitude;

			// Update coordinates
			latitude = lat;
			longitude = lon;

			// Center map on current location
			if (mapPickerRef) {
				await mapPickerRef.centerOnCurrentLocation();
			} else if (showMapPicker) {
				// If map is shown but ref not set, wait a bit
				setTimeout(async () => {
					if (mapPickerRef) {
						await mapPickerRef.centerOnCurrentLocation();
					}
				}, 500);
			}

			// Reverse geocode to get address
			try {
				const response = await fetch(
					`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
					{
						headers: {
							'User-Agent': 'Obsonarium/1.0 (https://obsonarium.com)'
						}
					}
				);

				if (response.ok) {
					const data = await response.json();
					const addr = data.address || {};

					// Populate address field
					address = data.display_name || '';
					addressSearchValue = data.display_name || '';

					// Populate structured fields
					streetAddress = `${addr.house_number || ''} ${addr.road || ''}`.trim();
					city = addr.city || addr.town || addr.village || '';
					state = addr.state || '';
					postalCode = addr.postcode || '';
					country = addr.country || '';

					toast.success('Location detected and address populated');
				} else {
					toast.error('Failed to get address for your location');
				}
			} catch (error) {
				console.error('Reverse geocoding failed:', error);
				toast.error('Failed to get address for your location');
			}
		} catch (error) {
			console.error('Error getting location:', error);
			if (error instanceof GeolocationPositionError) {
				if (error.code === error.PERMISSION_DENIED) {
					toast.error('Location access denied. Please enable location permissions.');
				} else if (error.code === error.POSITION_UNAVAILABLE) {
					toast.error('Location unavailable. Please try again.');
				} else if (error.code === error.TIMEOUT) {
					toast.error('Location request timed out. Please try again.');
				} else {
					toast.error('Failed to get your location. Please try again.');
				}
			} else {
				toast.error('Failed to get your location. Please try again.');
			}
		} finally {
			gettingCurrentLocation = false;
		}
	}

	async function handleSubmit() {
		if (
			!businessName.trim() ||
			!phone.trim() ||
			!address.trim() ||
			!streetAddress.trim() ||
			!city.trim() ||
			!state.trim() ||
			!postalCode.trim() ||
			!country.trim()
		) {
			toast.error('Please fill in all fields');
			return;
		}

		// Validate phone number format
		if (!validatePhone(phone.trim())) {
			toast.error('Please enter a valid 10-digit Indian phone number');
			return;
		}

		// Validate that address has been geocoded (has coordinates)
		if (!latitude || !longitude) {
			toast.error(
				'Please select a valid address from the search results or set your location on the map. The address must be geocoded to enable location-based features.'
			);
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
					address: address.trim(),
					street_address: streetAddress.trim(),
					city: city.trim(),
					state: state.trim(),
					postal_code: postalCode.trim(),
					country: country.trim(),
					latitude: latitude,
					longitude: longitude
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

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<Card.Title class="text-2xl font-bold">Complete Your Profile</Card.Title>
			<Card.Description>
				Please provide your business information to get started with your retailer dashboard.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if fetching || redirecting}
				<div class="flex flex-col items-center justify-center gap-4 py-12">
					<Loader2 class="size-8 animate-spin text-muted-foreground" />
					<p class="text-muted-foreground">
						{redirecting ? 'Redirecting to dashboard...' : 'Loading...'}
					</p>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-6"
				>
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
						<Label for="address">Business Address *</Label>
						<div class="flex gap-2">
							<div class="flex-1">
								<AddressAutocomplete value={addressSearchValue} onSelect={handleAddressSelect} />
							</div>
							<div class="flex items-end">
								<Button
									type="button"
									variant="outline"
									onclick={useCurrentLocation}
									disabled={gettingCurrentLocation || loading}
									class="h-11 whitespace-nowrap"
								>
									{#if gettingCurrentLocation}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
										Getting Location...
									{:else}
										<MapPin class="mr-2 h-4 w-4" />
										Use Current Location
									{/if}
								</Button>
							</div>
						</div>
						<p class="mt-1 text-xs text-muted-foreground">
							Search for your address to auto-fill the details below.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="streetAddress">Street Address *</Label>
							<Input
								id="streetAddress"
								bind:value={streetAddress}
								placeholder="Building, Street, Area"
								required
								disabled={loading}
							/>
						</div>
						<div class="space-y-2">
							<Label for="city">City *</Label>
							<Input id="city" bind:value={city} placeholder="City" required disabled={loading} />
						</div>
						<div class="space-y-2">
							<Label for="state">State *</Label>
							<Input
								id="state"
								bind:value={state}
								placeholder="State"
								required
								disabled={loading}
							/>
						</div>
						<div class="space-y-2">
							<Label for="postalCode">Postal Code *</Label>
							<Input
								id="postalCode"
								bind:value={postalCode}
								placeholder="Postal Code"
								required
								disabled={loading}
							/>
						</div>
						<div class="space-y-2">
							<Label for="country">Country *</Label>
							<Input
								id="country"
								bind:value={country}
								placeholder="Country"
								required
								disabled={loading}
							/>
						</div>
					</div>

					{#if address && (!latitude || !longitude)}
						<p class="mt-1 text-xs text-destructive">
							⚠️ Address location not set. Please select an address from the search or use the map
							below to set your location.
						</p>
					{/if}

					<div class="flex gap-2">
						<Button
							type="button"
							variant={showMapPicker ? 'default' : 'outline'}
							class="flex-1"
							onclick={() => (showMapPicker = !showMapPicker)}
							disabled={loading}
						>
							{showMapPicker ? 'Hide Map' : 'Show Map'}
						</Button>
					</div>

					{#if showMapPicker}
						<div class="space-y-2">
							<Label>Select Shop Location on Map</Label>
							<MapPicker
								bind:this={mapPickerRef}
								bind:latitude
								bind:longitude
								onLocationChange={handleLocationChange}
								autoCenterOnLocation={!latitude && !longitude}
							/>
						</div>
					{/if}

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
