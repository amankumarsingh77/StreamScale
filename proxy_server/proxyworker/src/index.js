addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	const { instance } = await WebAssembly.instantiateStreaming(fetch('main.wasm'));

	// Assuming your Go code exports a 'handle' function
	const result = instance.exports.handle();

	return new Response(`Result from Go: ${result}`);
}
