if (!process.env.TZ)
	console.error("Please include a TZ environment variable, e.g. America/Los_Angeles");

const intlOpts = Intl.DateTimeFormat().resolvedOptions();
const tz = process.env.TZ ?? intlOpts.timeZone;
const formattedDate = new Intl.DateTimeFormat(intlOpts.locale, {
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "numeric",
	minute: "numeric",
	second: "numeric",
	hour12: false,
	timeZone: tz,
}).format(new Date());

export const log = (output: any) => console.log(`[${formattedDate}] `, output);
export const error = (output: any) => console.log(`\x1b[31m[${formattedDate}] `, output);
