function objectNotFound(objectName) {
	return new Response(`<html><body>R2 object "<b>${objectName}</b>" not found</body></html>`, {
		status: 404,
		headers: {
			'content-type': 'text/html; charset=UTF-8',
			'Access-Control-Allow-Origin': '*', // Allow all origins
		},
	});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const objectName = url.pathname.slice(1);

		console.log(`${request.method} object ${objectName}: ${request.url}`);

		if (request.method === 'GET' || request.method === 'HEAD') {
			if (objectName === '') {
				if (request.method == 'HEAD') {
					return new Response(undefined, {
						status: 400,
						headers: {
							'Access-Control-Allow-Origin': '*',
						},
					});
				}

				const options = {
					prefix: url.searchParams.get('prefix') ?? undefined,
					delimiter: url.searchParams.get('delimiter') ?? undefined,
					cursor: url.searchParams.get('cursor') ?? undefined,
					include: ['customMetadata', 'httpMetadata'],
				};
				console.log(JSON.stringify(options));

				const listing = await env.MY_BUCKET.list(options);
				return new Response(JSON.stringify(listing), {
					headers: {
						'content-type': 'application/json; charset=UTF-8',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			if (request.method === 'GET') {
				if (objectName.endsWith('master.m3u8')) {
					env.ANALYTICS_WORKER.fetch(request);
				}
				const object = await env.MY_BUCKET.get(objectName, {
					range: request.headers,
					onlyIf: request.headers,
				});

				if (object === null) {
					return objectNotFound(objectName);
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set('etag', object.httpEtag);
				headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
				if (object.range) {
					headers.set('content-range', `bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`);
				}
				const status = object.body ? (request.headers.get('range') !== null ? 206 : 200) : 304;
				return new Response(object.body, {
					headers,
					status,
				});
			}

			const object = await env.MY_BUCKET.head(objectName);

			if (object === null) {
				return objectNotFound(objectName);
			}

			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set('etag', object.httpEtag);
			headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
			return new Response(null, {
				headers,
			});
		}
		if (request.method === 'PUT' || request.method == 'POST') {
			const object = await env.MY_BUCKET.put(objectName, request.body, {
				httpMetadata: request.headers,
			});
			return new Response(null, {
				headers: {
					etag: object.httpEtag,
					'Access-Control-Allow-Origin': '*', // Allow all origins
				},
			});
		}
		if (request.method === 'DELETE') {
			await env.MY_BUCKET.delete(url.pathname.slice(1));
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*', // Allow all origins
				},
			});
		}

		return new Response(`Unsupported method`, {
			status: 400,
			headers: {
				'Access-Control-Allow-Origin': '*', // Allow all origins
			},
		});
	},
};
