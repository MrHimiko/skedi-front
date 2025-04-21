import { api } from '@utils/api';
import { UserStore } from '@stores/user';
import { timezoneUtils } from '@utils/timezone';
import { storage } from '@utils/storage';

/**
 * BookingsService - Enhanced service for managing bookings
 * With support for pending and canceled bookings status management
 */
export class BookingsService {
	// Cache bookings to reduce API calls
	static bookingsCache = {
		upcoming: { data: [], timestamp: 0 },
		past: { data: [], timestamp: 0 },
		canceled: { data: [], timestamp: 0 },
		pending: { data: [], timestamp: 0 },
		active: { data: [], timestamp: 0 },
		all: { data: [], timestamp: 0 }
	};
	
	// Cache expiry time (5 minutes)
	static CACHE_EXPIRY = 5 * 60 * 1000;
	
	// Pagination settings
	static DEFAULT_PAGE_SIZE = 50;
	
	/**
	 * Get current user ID from user store
	 */
	static getCurrentUserId() {
		const userStore = UserStore();
		return userStore.getId();
	}
	
	/**
	 * Generate cache key for future Redis implementation
	 */
	static getCacheKey(userId, status, timeRange) {
		return `bookings:${userId}:${status}:${timeRange}`;
	}

	/**
	 * Get data from cache (will be Redis in future)
	 */
	static async getFromCache(key) {
		// In future: return Redis.get(key)
		return this.bookingsCache[key]?.data || null;
	}

	/**
	 * Set data to cache (will be Redis in future)
	 */
	static async setToCache(key, data, expiry = this.CACHE_EXPIRY) {
		// In future: Redis.set(key, data, 'EX', expiry / 1000)
		this.bookingsCache[key] = {
			data,
			timestamp: Date.now()
		};
	}
	
	/**
	 * Get bookings with pagination support and fetch related data
	 */
	static async getBookings({
		status = 'upcoming',
		startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
		endTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
		page = 1,
		pageSize = this.DEFAULT_PAGE_SIZE,
		useCache = true,
		internalOnly = false,
		fetchRelatedData = true,
		userId = null
	}) {
		const now = Date.now();
		const cacheKey = status.toLowerCase();
		const actualUserId = userId || this.getCurrentUserId();
		
		// Generate a more specific cache key for future Redis implementation
		const specificCacheKey = this.getCacheKey(actualUserId, status, `${startTime}_${endTime}`);
		
		// Check if we have valid cached data
		if (
			useCache && 
			this.bookingsCache[cacheKey]?.data?.bookings?.length > 0 &&
			now - this.bookingsCache[cacheKey].timestamp < this.CACHE_EXPIRY
		) {
			console.log(`Using cached ${status} bookings`);
			return this.bookingsCache[cacheKey].data;
		}
		
		// Build query params
		const queryParams = new URLSearchParams();
		queryParams.append('start_time', startTime);
		queryParams.append('end_time', endTime);
		queryParams.append('status', status);
		queryParams.append('page', page.toString());
		queryParams.append('page_size', pageSize.toString());
		
		if (internalOnly) {
			queryParams.append('internal', 'true');
		}
		
		try {
			// Use the user/{id}/bookings endpoint
			const response = await api.get(`user/${actualUserId}/bookings?${queryParams.toString()}`);
			
			if (response && response.success && response.data) {
				// Process bookings with timezone handling if exists
				if (response.data.bookings && Array.isArray(response.data.bookings)) {
					response.data.bookings = this.handleTimezoneConversion(response.data.bookings);
				}
				
				// Store the entire response object in the cache
				this.bookingsCache[cacheKey] = {
					data: response.data,
					timestamp: now
				};
				
				// Store in specific cache for future Redis implementation
				await this.setToCache(specificCacheKey, response.data);
				
				// If fetch related data is requested and we have bookings array
				if (fetchRelatedData && response.data.bookings) {
					const bookings = response.data.bookings;
					
					// For large datasets, consider batching these related data requests
					// instead of sequential processing which can be slow
					const batchPromises = [];
					
					for (let i = 0; i < bookings.length; i++) {
						const booking = bookings[i];
						
						if (booking.event_id) {
							try {
								// Get organization_id
								let organizationId = booking.organization_id;
								if (!organizationId) {
									const userStore = UserStore();
									organizationId = userStore.getSelectedOrganizationId();
								}
								
								if (organizationId) {
									// Add to batch promises instead of awaiting immediately
									batchPromises.push(
										(async () => {
											try {
												// Fetch event details
												const eventResponse = await api.get(`events/${booking.event_id}?organization_id=${organizationId}`);
												if (eventResponse && eventResponse.success) {
													booking.event = eventResponse.data;
												}
												
												// Fetch booking details if booking_id exists
												if (booking.booking_id) {
													const bookingResponse = await api.get(`organizations/${organizationId}/events/${booking.event_id}/bookings/${booking.booking_id}`);
													if (bookingResponse && bookingResponse.success) {
														booking.booking_details = bookingResponse.data;
													}
												}
											} catch (error) {
												console.warn(`Failed to fetch related data for booking:`, error);
											}
										})()
									);
								}
							} catch (error) {
								console.warn(`Failed to fetch related data for booking:`, error);
							}
						}
					}
					
					// Process batch promises with concurrency limit to avoid overwhelming API
					const CONCURRENCY_LIMIT = 5;
					for (let i = 0; i < batchPromises.length; i += CONCURRENCY_LIMIT) {
						await Promise.all(
							batchPromises.slice(i, i + CONCURRENCY_LIMIT)
						);
					}
				}
				
				return response.data;
			}
			
			throw new Error(response?.message || 'Failed to fetch bookings');
		} catch (error) {
			console.error('Error fetching bookings:', error);
			throw error;
		}
	}
	
	/**
	 * Get a single booking by ID with optimized caching
	 */
	static async getBooking(id) {
		try {
			// Check if booking exists in any of our caches first
			// This reduces need for individual API calls
			for (const cacheKey of Object.keys(this.bookingsCache)) {
				const cachedData = this.bookingsCache[cacheKey].data;
				if (cachedData && cachedData.bookings) {
					const cachedBooking = cachedData.bookings.find(b => b.id == id);
					if (cachedBooking) {
						console.log('Using cached booking data');
						return cachedBooking;
					}
				}
			}
			
			const userId = this.getCurrentUserId();
			const response = await api.get(`user/${userId}/bookings/${id}`);
			
			if (response && response.success) {
				const booking = response.data;
				
				// Fetch related data if event_id exists
				if (booking.event_id) {
					try {
						// Get organization_id
						let organizationId = booking.organization_id;
						if (!organizationId) {
							const userStore = UserStore();
							organizationId = userStore.getSelectedOrganizationId();
						}
						
						if (organizationId) {
							// Fetch event details
							const eventResponse = await api.get(`events/${booking.event_id}?organization_id=${organizationId}`);
							if (eventResponse && eventResponse.success) {
								booking.event = eventResponse.data;
							}
							
							// If booking_id exists, fetch booking details
							if (booking.booking_id) {
								const bookingResponse = await api.get(`organizations/${organizationId}/events/${booking.event_id}/bookings/${booking.booking_id}`);
								if (bookingResponse && bookingResponse.success) {
									booking.booking_details = bookingResponse.data;
								}
							}
						}
					} catch (error) {
						console.warn(`Failed to fetch related data for booking:`, error);
					}
				}
				
				// Store this booking in a dedicated cache for future use
				await this.setToCache(`booking:${id}`, booking);
				
				return booking;
			}
			
			throw new Error(response?.message || 'Failed to fetch booking');
		} catch (error) {
			console.error(`Error fetching booking ${id}:`, error);
			throw error;
		}
	}
	
	static async changeBookingStatus(id, eventId, organizationId, status) {
		try {
			// The API expects a data object containing the status
			const data = { status };
			
			// Call the update endpoint with the new status
			const response = await api.put(
				`organizations/${organizationId}/events/${eventId}/bookings/${id}`, 
				data
			);
			
			if (response && response.success) {
				// Clear all caches after status change
				this.clearCache();
				return response.data;
			}
			
			throw new Error(`Failed to change booking status to ${status}`);
		} catch (error) {
			console.error(`Error changing booking status (${id}) to ${status}:`, error);
			throw error;
		}
	}
	
	/**
	 * Confirm a pending booking
	 */
	static async confirmBooking(id, eventId, organizationId) {
		return this.changeBookingStatus(id, eventId, organizationId, 'confirmed');
	}
	
	/**
	 * Cancel a booking
	 */
	static async cancelBooking(id, eventId, organizationId) {
		return this.changeBookingStatus(id, eventId, organizationId, 'canceled');
	}
	
	/**
	 * Remove a booking
	 */
	static async removeBooking(id, eventId, organizationId) {
		return this.changeBookingStatus(id, eventId, organizationId, 'removed');
	}

	
	/**
	 * Get bookings with efficient pagination (for scaling to large datasets)
	 */
	static async getBookingsPaginated(userId, status, page = 1, pageSize = 100) {
		// This method would use efficient DB pagination in future
		// For now uses existing method but sets up for future optimization
		return this.getBookings({
			status,
			page,
			pageSize,
			userId
		});
	}
	
	/**
	 * Get bookings for a specific date range (e.g., current week Sunday-Saturday)
	 */
	static async getWeekBookings(startDate, endDate, status = 'upcoming') {
		// Format dates for API
		const startTime = startDate.toISOString();
		const endTime = endDate.toISOString();
		
		return this.getBookings({
			status,
			startTime,
			endTime,
			useCache: false // Always fresh data for week view
		});
	}
	
	/**
	 * Get bookings for current week (Sunday-Saturday)
	 */
	static async getCurrentWeekBookings(status = 'upcoming') {
		const today = new Date();
		const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
		
		// Calculate Sunday (start of week)
		const sunday = new Date(today);
		sunday.setDate(today.getDate() - dayOfWeek);
		sunday.setHours(0, 0, 0, 0);
		
		// Calculate Saturday (end of week)
		const saturday = new Date(today);
		saturday.setDate(today.getDate() + (6 - dayOfWeek));
		saturday.setHours(23, 59, 59, 999);
		
		return this.getWeekBookings(sunday, saturday, status);
	}
	
	/**
	 * Get bookings for specific week
	 */
	static async getSpecificWeekBookings(year, month, day, status = 'upcoming') {
		// Create date for the Sunday of that week
		const sunday = new Date(year, month - 1, day); // month is 0-indexed in JS
		sunday.setHours(0, 0, 0, 0);
		
		// Calculate the Saturday
		const saturday = new Date(sunday);
		saturday.setDate(sunday.getDate() + 6);
		saturday.setHours(23, 59, 59, 999);
		
		return this.getWeekBookings(sunday, saturday, status);
	}
	
	/**
	 * Get currently happening bookings
	 */
	static async getNowBookings() {
		const now = new Date();
		
		// Create time window 15 minutes before and after current time
		const startTime = new Date(now);
		startTime.setMinutes(now.getMinutes() - 15);
		
		const endTime = new Date(now);
		endTime.setMinutes(now.getMinutes() + 15);
		
		// Use the same getBookings method but with a very narrow time window
		const result = await this.getBookings({
			status: 'active',
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			useCache: false // Always fresh data for current bookings
		});
		
		// Filter to only include bookings that are happening right now
		if (result && result.bookings) {
			return result.bookings.filter(booking => {
				const bookingStart = new Date(booking.start_time);
				const bookingEnd = new Date(booking.end_time);
				return bookingStart <= now && bookingEnd >= now;
			});
		}
		
		return [];
	}
	
	/**
	 * Clear service cache, optionally by specific status
	 */
	static clearCache(status = null) {
		if (status && this.bookingsCache[status]) {
			this.bookingsCache[status].timestamp = 0;
		} else {
			Object.keys(this.bookingsCache).forEach(key => {
				this.bookingsCache[key].timestamp = 0;
			});
		}
	}

	/**
	 * Handle timezone conversion for displaying bookings
	 */
	static handleTimezoneConversion(bookings) {
		if (!bookings || !Array.isArray(bookings)) return [];
		
		// Get stored timezone or default to browser
		const userTimezone = storage.get('user.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
		
		return bookings.map(booking => {
			try {
				// Extract date and time parts from ISO string
				// Server format: "2025-04-21 05:30:00"
				const [datePart, timePart] = booking.start_time.split(' ');
				const [endDatePart, endTimePart] = booking.end_time.split(' ');
				
				// Parse as UTC to preserve the exact time point
				// This is critical - we treat server time as UTC
				const serverDate = new Date(`${datePart}T${timePart}Z`);
				const serverEndDate = new Date(`${endDatePart}T${endTimePart}Z`);
				
				// Format both time and date in user's timezone
				// The formatter will handle day boundary changes automatically
				const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
					timeZone: userTimezone
				});
				
				const userDateFormatter = new Intl.DateTimeFormat('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					weekday: 'long',
					timeZone: userTimezone
				});
				
				// These are properly localized to user's timezone
				const formattedStart = userTimeFormatter.format(serverDate);
				const formattedEnd = userTimeFormatter.format(serverEndDate);
				const dateKey = userDateFormatter.format(serverDate);
				
				return {
					...booking,
					formattedStart,
					formattedEnd,
					dateKey,
					// Keep original dates for reference
					originalStartTime: booking.start_time,
					originalEndTime: booking.end_time
				};
			} catch (error) {
				console.error('Error in timezone conversion:', error, booking);
				// Fallback to raw values
				return {
					...booking,
					formattedStart: booking.start_time.split(' ')[1].substring(0, 5),
					formattedEnd: booking.end_time.split(' ')[1].substring(0, 5),
					dateKey: booking.start_time.split(' ')[0]
				};
			}
		});
	}
}