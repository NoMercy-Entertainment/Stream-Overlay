<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { shouldMarquee } from '@/lib/utils';

const props = defineProps({
	text: {
		type: String,
		required: false,
	},
	playing: {
		type: Boolean,
		required: false,
		default: false,
	},
});

const marquee = ref<HTMLElement | null>();

watch(props, () => {
	setTimeout(() => {
		if (!marquee.value)
			return;
		shouldMarquee(marquee.value);
	}, 500);
});

onMounted(() => {
	setTimeout(() => {
		if (!marquee.value)
			return;
		shouldMarquee(marquee.value);
	}, 500);
});
</script>

<template>
	<div ref="marquee" class="w-available relative flex flex-grow flex-col items-start justify-start gap-2"
		data-marquee="container"
	>
		<div class="flex-shrink-0 flex-grow-0 self-stretch line-clamp-1 w-fit whitespace-nowrap" data-marquee="scroller">
			{{ text }}
			<slot />
		</div>
	</div>
</template>
