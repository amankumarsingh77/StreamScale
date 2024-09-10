export class ViewCounterWorker {
	constructor(state, env) {
		this.state = state;
		this.env = env;
	}

	async initialize() {
		let storedLastFlush = await this.state.storage.get('lastFlush');
		if (!storedLastFlush) {
			storedLastFlush = Date.now();
			await this.state.storage.put('lastFlush', storedLastFlush);
		}
		this.lastFlush = storedLastFlush;
	}

	async fetch(request) {
		if (!this.lastFlush) {
			await this.initialize();
		}

		const url = new URL(request.url);
		const uploadIdRegex = /\/([a-f0-9]{32})\//;

		if (url.pathname.endsWith('master.m3u8')) {
			const uploadId = url.pathname.match(uploadIdRegex)[1];
			await this.incrementView(uploadId);

			const now = Date.now();
			if (now - this.lastFlush >= 60 * 1000) {
				await this.flushToMongoDB();
			}
			return new Response('OK');
		} else if (url.pathname === '/views') {
			const allViews = await this.getAllViews();
			return new Response(JSON.stringify(allViews), {
				headers: { 'Content-Type': 'application/json' },
			});
		} else if (url.pathname.startsWith('/views/')) {
			url.pathname = url.pathname.slice(7);
			const uploadId = url.pathname.match(uploadIdRegex)[1];
			const views = await this.getViews(uploadId);
			return new Response(JSON.stringify({ uploadId, views }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('OK');
	}

	async incrementView(uploadId) {
		let views = (await this.state.storage.get(uploadId)) || 0;
		views++;
		await this.state.storage.put(uploadId, views);
	}

	async getViews(uploadId) {
		const views = (await this.state.storage.get(uploadId)) || 0;
		return views;
	}

	async getAllViews() {
		const allViews = await this.state.storage.list();
		const result = {};
		for (const [uploadId, views] of allViews) {
			if (uploadId !== 'lastFlush') {
				result[uploadId] = views;
			}
		}
		return result;
	}

	async flushToMongoDB() {
		const allViews = await this.state.storage.list();
		for (const [uploadId, views] of allViews) {
			if (uploadId === 'lastFlush') continue;
			if (views > 1) {
				try {
					const response = await fetch('https://ap-south-1.aws.data.mongodb-api.com/app/data-xuasubh/endpoint/data/v1/action/updateOne', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Request-Headers': '*',
							'api-key': this.env.MONGODB_API_KEY,
						},
						body: JSON.stringify({
							dataSource: 'Cluster0',
							database: 'video-transcoder',
							collection: 'files',
							filter: { uploadId },
							update: { $inc: { views: views } },
						}),
					});
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					await this.state.storage.delete(uploadId);
				} catch (error) {
					console.error(`Failed to update views for video ${uploadId}: ${error.message}`);
				}
			}
		}

		this.lastFlush = Date.now();
		await this.state.storage.put('lastFlush', this.lastFlush);
		console.log(`Flush completed. New last flush time: ${new Date(this.lastFlush).toISOString()}`);
	}
}

// Worker
export default {
	async fetch(request, env, ctx) {
		const id = env.COUNTER.idFromName('A');
		const obj = env.COUNTER.get(id);
		return obj.fetch(request);
	},
};
