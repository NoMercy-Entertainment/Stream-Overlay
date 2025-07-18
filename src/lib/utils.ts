import type { Message } from '@/types/chat';

/**
 * Determines whether the given element should have a marquee effect.
 *
 * Sets the `aniate-marquee` class on the child with `data-marquee='scroller'`.
 * @param {HTMLElement} el - The element to check.
 */
export function shouldMarquee(el: HTMLElement) {
	const scroller = el.querySelector<HTMLElement>('[data-marquee="scroller"]')!;
	scroller.style.removeProperty('--marquee-width');
	scroller.classList.remove('animate-marquee');

	const containerWidth = el.getBoundingClientRect()?.width ?? 0;
	const scrollerWidth = scroller.getBoundingClientRect()?.width ?? 0;

	if (containerWidth < scrollerWidth) {
		scroller.style.setProperty('--marquee-width', `${containerWidth}px`);
		scroller.classList.add('animate-marquee');
	}
	else {
		scroller.style.removeProperty('--marquee-width');
		scroller.classList.remove('animate-marquee');
	}
}

export function replaceTemplatePlaceholders(template: string, message: Message, isLive?: boolean, gameInfo?: { gameName?: string; title?: string }): string {
	let result = template.replace(/\{name\}/gu, message.userInfo.displayName);

	const subjectPronoun = message.userInfo.pronoun?.subject || 'They';
	const objectPronoun = message.userInfo.pronoun?.object || 'them';

	const beVerb = (() => {
		switch (subjectPronoun.toLowerCase()) {
			case 'he':
			case 'she':
				return 'is';
			case 'they':
				return 'are';
			default:
				return 'is';
		}
	})();

	const wasVerb = (() => {
		switch (subjectPronoun.toLowerCase()) {
			case 'he':
			case 'she':
				return 'was';
			case 'they':
				return 'were';
			default:
				return 'was';
		}
	})();

	result = result.replace(/\{presentTense\}/gu, beVerb.toLowerCase());
	result = result.replace(/\{PresentTense\}/gu, beVerb);
	result = result.replace(/\{pastTense\}/gu, wasVerb.toLowerCase());
	result = result.replace(/\{PastTense\}/gu, wasVerb);
	result = result.replace(/\{tense\}/gu, isLive ? beVerb.toLowerCase() : wasVerb.toLowerCase());
	result = result.replace(/\{Tense\}/gu, isLive ? beVerb : wasVerb);

	result = result.replace(/\{subject\}/gu, subjectPronoun.toLowerCase());
	result = result.replace(/\{Subject\}/gu, subjectPronoun);
	result = result.replace(/\{object\}/gu, objectPronoun.toLowerCase());
	result = result.replace(/\{Object\}/gu, objectPronoun.charAt(0).toUpperCase() + objectPronoun.slice(1));

	result = result.replace(/\{game\}/gu, gameInfo?.gameName || '');
	result = result.replace(/\{title\}/gu, gameInfo?.title || '');

	result = result.replace(/\{link\}/gu, `https://www.twitch.tv/${message.userInfo.userName}`);
	result = result.replace(/\{username\}/gu, message.userInfo.userName);
	result = result.replace(/\{displayname\}/gu, message.userInfo.displayName);
	result = result.replace(/\{id\}/gu, message.userInfo.id);
	result = result.replace(/\{status\}/gu, isLive ? 'live' : 'offline');
	result = result.replace(/\{Status\}/gu, isLive ? 'Live' : 'Offline');

	return result;
}
