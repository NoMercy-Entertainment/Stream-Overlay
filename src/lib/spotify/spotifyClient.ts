import { watch } from 'vue';
import SpotifyWebApi from 'spotify-web-api-node';

import type { SpotifyState } from '@/types/spotify/state';
import type { SpotifyQueue } from '@/types/spotify/queue';

import {
	spotifyAccessToken,
	spotifyClientId,
	spotifyClientSecret,
	spotifyExpiresAt,
	spotifyExpiresIn,
	spotifyRedirectUri,
	spotifyRefreshToken,
	spotifyUserId,
} from '@/store/auth';
import { setSpotifyMe, setSpotifyQueue, setSpotifyState, spotifyState } from '@/store/spotify';

class SpotifyClient {
	private spotifyApi: SpotifyWebApi;
	private static instance: SpotifyClient;
	private maxAttempts: number = 5;
	private attempts: number = 0;

	private constructor() {
		this.spotifyApi = new SpotifyWebApi({
			clientId: spotifyClientId.value,
			clientSecret: spotifyClientSecret.value,
			redirectUri: spotifyRedirectUri.value,
			accessToken: spotifyAccessToken.value,
			refreshToken: spotifyRefreshToken.value,
		});

		this.init().then();
	}

	private async init(): Promise<void> {
		await this.refreshToken();

		const me = await this.spotifyApi.getMe();
		if (me) {
			setSpotifyMe(me.body);
			spotifyUserId.value = me.body.id;
		}

		const state = await this.getPlayerState();
		if (state) {
			setSpotifyState(state);
		}

		const response = await this.getQueue();
		if (response && response.queue) {
			setSpotifyQueue(response.queue);
		}

		watch(spotifyState, async () => {
			const response = await this.getQueue();
			if (response && response.queue) {
				setSpotifyQueue(response.queue);
			}
		});
	}

	public static getInstance(): SpotifyClient {
		if (!SpotifyClient.instance) {
			SpotifyClient.instance = new SpotifyClient();
		}
		return SpotifyClient.instance;
	}

	private async refreshToken() {
		if (this.attempts >= this.maxAttempts)
			return false; // prevent infinite loop

		// return if will not expire within 5 minutes
		if (Date.now() <= spotifyExpiresAt.value - 300000)
			return;

		try {
			const response = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Basic ${btoa(`${spotifyClientId.value}:${spotifyClientSecret.value}`)}`,
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: spotifyRefreshToken.value,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			spotifyAccessToken.value = data.access_token;
			spotifyRefreshToken.value = data.refresh_token;
			spotifyExpiresIn.value = data.expires_in;
			spotifyExpiresAt.value = Date.now() + data.expires_in * 1000;

			this.spotifyApi.setAccessToken(data.access_token);
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error refreshing token:', error);
			throw error;
		}
	}

	public async addToQueue(trackUrl: string) {
		if (this.attempts >= this.maxAttempts)
			return false;
		try {
			await this.refreshToken();

			const trackId = trackUrl.split('/').pop()?.split('?')[0];
			if (!trackId)
				throw new Error('Invalid Spotify URL');

			const track = await this.spotifyApi.getTrack(trackId);

			await this.spotifyApi.addToQueue(`spotify:track:${trackId}`);

			return track;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error adding track to queue:', error);
			return false;
		}
	}

	public async getQueue(): Promise<SpotifyQueue | null> {
		if (this.attempts >= this.maxAttempts)
			return null;
		try {
			await this.refreshToken();

			const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
				headers: {
					Authorization: `Bearer ${this.spotifyApi.getAccessToken()}`,
				},
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data as SpotifyQueue;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error getting queue:', error);
			return null;
		}
	}

	public async getCurrentlyPlaying(): Promise<SpotifyApi.CurrentlyPlayingResponse | null> {
		if (this.attempts >= this.maxAttempts)
			return null;
		try {
			await this.refreshToken();

			const response = await this.spotifyApi.getMyCurrentPlayingTrack();
			return response.body;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error getting currently playing track:', error);
			return null;
		}
	}

	public async addToPlaylist(trackUri: string): Promise<boolean> {
		if (this.attempts >= this.maxAttempts)
			return false;
		try {
			await this.refreshToken();

			const playlistId = import.meta.env.VITE_SPOTIFY_BANGER_PLAYLIST_URI.includes('open.spotify.com/playlist/')
				? import.meta.env.VITE_SPOTIFY_BANGER_PLAYLIST_URI.split('/').pop()?.split('?').at(0)
				: import.meta.env.VITE_SPOTIFY_BANGER_PLAYLIST_URI.split(':').pop();
			if (!playlistId)
				throw new Error('Invalid playlist URI');

			await this.spotifyApi.addTracksToPlaylist(playlistId, [trackUri]);
			return true;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error adding track to playlist:', error);
			return false;
		}
	}

	public async getPlayerState(): Promise<SpotifyState | null> {
		if (this.attempts >= this.maxAttempts)
			return null;
		try {
			await this.refreshToken();

			const response = await fetch('https://api.spotify.com/v1/me/player?additional_types=track%2Cepisode', {
				headers: {
					Authorization: `Bearer ${this.spotifyApi.getAccessToken()}`,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			if (response.status === 204)
				return null;

			return (await response.json()) as SpotifyState;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error fetching player state:', error);
			return null;
		}
	}

	public async getUserPlaylists(): Promise<SpotifyApi.ListOfCurrentUsersPlaylistsResponse | null> {
		if (this.attempts >= this.maxAttempts)
			return null;
		try {
			await this.refreshToken();

			const response = await fetch('https://api.spotify.com/v1/me/playlists', {
				headers: {
					Authorization: `Bearer ${this.spotifyApi.getAccessToken()}`,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return (await response.json()) as SpotifyApi.ListOfCurrentUsersPlaylistsResponse;
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error fetching user playlists:', error);
			return null;
		}
	}

	public async initializeConnection(connection_id: string, accessToken: string): Promise<void> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			const params = new URLSearchParams({
				connection_id,
			});

			const response = await fetch(`https://api.spotify.com/v1/me/notifications/player?${params}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const data = await response.json();

			if (data.message !== 'Subscription created') {
				throw new Error(`Error creating subscription: ${data.message}`);
			}

			console.log('Connection initialized:', data);
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error initializing connection:', error);
		}
	}

	public async nextTrack(): Promise<void> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			await this.spotifyApi.skipToNext();
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error skipping to next track:', error);
		}
	}

	public async previousTrack(): Promise<void> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			await this.spotifyApi.skipToPrevious();
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error skipping to previous track:', error);
		}
	}

	public async pausePlayback(): Promise<void> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			await this.spotifyApi.pause();
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error pausing playback:', error);
		}
	}

	public async resumePlayback(): Promise<void> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			await this.spotifyApi.play();
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error resuming playback:', error);
		}
	}

	public async volume(volume?: number): Promise<void | number> {
		if (this.attempts >= this.maxAttempts)
			return;
		try {
			await this.refreshToken();

			if (volume === undefined) {
				const state = await this.getPlayerState();
				if (state && state.device && state.device.volume_percent !== undefined) {
					volume = state.device.volume_percent;
				}
				else {
					throw new Error('Volume not specified and no current player state found');
				}
			}

			if (volume < 0 || volume > 100) {
				throw new Error('Volume must be between 0 and 100');
			}

			await this.spotifyApi.setVolume(volume);
		}
		catch (error) {
			this.attempts += 1;
			console.error('Error setting volume:', error);
		}
	}
}

export const spotifyClient = SpotifyClient.getInstance();
