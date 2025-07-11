import type { Command } from '@/types/chat';
import chatClient from '@/lib/twitch/chatClient';

interface OverlayStorage extends Record<string, unknown> {
}

const command: Command<OverlayStorage> = {
	name: 'overlay',
	permission: 'everyone',
	type: 'command',
	storage: {},
	init: () => {},
	callback: async ({ channel }) => {
		const text = `What started as a codepen from @jeroenvanwissen turned into full overlay.
		Now we are sharing code back and forth to improve it, so you may recognise it from his stream.
		You can find the code on GitHub: https://github.com/StoneyEagle/Stream-Overlay 
		If you have any ideas or suggestions, feel free to tell us!`;

		await chatClient.say(channel, text);
	},
};

export default command;
