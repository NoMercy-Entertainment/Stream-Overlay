<script setup lang="ts">
import { ref } from 'vue';

import '@/lib/twitch/authClient';
import '@/lib/spotify/spotifyClient';
import '@/lib/spotify/spotifySocketClient';

import { botUser, user } from '@/store/auth';
import { spotifyVisible } from '@/store/visibility';

import Badge from '@/components/Badge.vue';
import Chat from '@/components/Chat.vue';
import NowPlaying from '@/components/NowPlaying.vue';
import VideoElement from '@/components/VideoElement.vue';
import ListsRotator from '@/components/ListsRotator.vue';

const chatWindow = ref<HTMLDivElement>();
const mainWindow = ref<HTMLDivElement>();
</script>

<template>
	<div class="w-screen h-auto max-h-screen aspect-video flex justify-between relative overflow-hidden p-6">
		<Badge v-if="botUser" />

		<div ref="mainWindow" class="relative flex flex-col w-available h-available justify-center -ml-6 mr-[5%] text-lg">
			<!--      <NextInQueue v-if="user && spotifyVisible" /> -->
			<NowPlaying v-if="user && spotifyVisible" />

			<VideoElement />

			<div class="top-[calc(100%/8)] flex flex-col gap-4 fixed left-10 card">
				<ListsRotator v-if="botUser && user" direction="left" />
				<!-- dev only, lists all reward ids -->
				<!--				<RewardsList v-if="botUser && user" /> -->
			</div>
		</div>

		<div ref="chatWindow" class="absolute top-0 right-0 flex flex-col w-1/4 h-available mb-16 mr-6 mt-6">
			<Chat v-if="user" />
		</div>
	</div>
</template>
