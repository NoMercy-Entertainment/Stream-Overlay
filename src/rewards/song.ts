import type { Ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';

import type { Reward, UserRecord } from '@/types/chat';

import chatClient from '@/lib/twitch/chatClient';
import { spotifyClient } from '@/lib/spotify/spotifyClient';

const reward: Reward<{ songs: Ref<UserRecord[]> }> = {
	name: 'song',
	id: 'e2135712-d108-4923-8e9f-f28e63622465',
	storage: {
		songs: useLocalStorage<UserRecord[]>('songs', []),
	},
	init: () => {},
	callback: async ({ channel, message }) => {
		if (!message.plainText.includes('spotify.com') && !message.plainText.includes('track/')) {
			const text = `@${message.userInfo.displayName} Failed to add song to queue. Make sure you provided a valid Spotify track URL!`;
			await chatClient.say(channel, text);
			return;
		}

		const songs = reward.storage.songs;
		const user = songs.value.find(song => song.userId === message.userInfo.userId)!;
		if (user) {
			user.count += 1;
			user.dates.push(new Date());
			songs.value = [...songs.value!.filter(song => song.userId !== message.userInfo.userId), user];
		}
		else {
			const user = {
				userId: message.userInfo.userId,
				displayName: message.userInfo.displayName,
				count: 1,
				dates: [new Date()],
			};
			songs.value = [...songs.value.filter(song => song.userId !== message.userInfo.userId), user];
		}

		const trackId = message.plainText.includes('spotify.com') && message.plainText.includes('track/')
			? message.plainText.split('/').pop()?.split('?').at(0)
			: message.plainText.split(':').pop();

		const queueResponse = await spotifyClient.addToQueue(trackId!);

		if (queueResponse && 'body' in queueResponse && queueResponse.statusCode === 200) {
			const text = `${queueResponse.body.name} by ${queueResponse.body.artists.at(0)?.name} has been added to the queue!`;
			await chatClient.say(channel, text);
		}
		else {
			const text = `@${message.userInfo.displayName} Failed to add song to queue. Make sure you provided a valid Spotify track URL!`;
			await chatClient.say(channel, text);
		}
	},
};

export default reward;
