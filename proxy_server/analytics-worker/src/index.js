export class ViewCounterWorker {
	constructor(state, env) {
		this.state = state;
		this.env = env;
		this.views = new Map();
		this.lastFlush = Date.now();
	  }
	  async fetch(request) {
		const url = new URL(request.url);
		if (url.pathname.endsWith("master.m3u8")) {
		  await this.incrementView(url.pathname);
		}
		if (url.pathname.startsWith("/views/")) {
		  const videoId = url.pathname.split("/")[2];
		  const views = await this.getViews(videoId);
		  return new Response(JSON.stringify({ videoId, views }), {
			headers: { "Content-Type": "application/json" }
		  });
		}
		if (Date.now() - this.lastFlush >= 1 * 60 * 1000) {
		  await this.flushToMongoDB();
		}
		return new Response('OK')
		// return await this.forwardRequest(request);
	  }
	  async incrementView(videoPath) {
		const videoId = videoPath.split("/")[1];
		const currentViews = this.views.get(videoId) || 0;
		this.views.set(videoId, currentViews + 1);
		console.log(Date.now() - this.lastFlush);
	  }
	  async getViews(videoId) {
		let views = this.views.get(videoId) || 0;
		// if (views === 0) {
		//   views = await this.fetchViewsFromMongoDB(videoId);
		// }
		return views;
	  }
	  async flushToMongoDB() {
		for (const [videoId, views] of this.views.entries()) {
		  const response = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/data-xuasubh/endpoint/data/v1/action/updateOne", {
			method: "POST",
			headers: {
			  "Content-Type": "application/json",
			  "Access-Control-Request-Headers": "*",
			  "api-key": this.env.MONGODB_API_KEY
			},
			body: JSON.stringify({
			  dataSource: "Cluster0",
			  database: "video-transcoder",
			  collection: "views",
			  filter: { uploadId: videoId },
			  update: { $inc: { views } },
			  upsert: true
			})
		  });
		  if (!response.ok) {
			console.error(`Failed to update views for video ${videoId}`);
		  }
		}
		console.log(`Flushed ${this.views.size} view counts to database`);
		this.views.clear();
		this.lastFlush = Date.now();
	  }

	//   async forwardRequest(request) {
	// 	const url = new URL(request.url);
	// 	const newUrl = new URL(url.pathname, this.env.CDN_URL);
	// 	const headers = new Headers(request.headers);
	// 	headers.delete("Host");
	// 	const newRequest = new Request(newUrl.toString(), {
	// 	  method: request.method,
	// 	  headers,
	// 	  body: request.body
	// 	});
	// 	return fetch(newRequest);
	//   }
  }
  
  export default {
	async fetch(request, env) {
		const id = env.COUNTER.idFromName("A");
		const obj = env.COUNTER.get(id);
		return obj.fetch(request);
	  }
  };