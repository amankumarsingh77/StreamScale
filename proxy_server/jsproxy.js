// Cloudflare Worker script

// Configure these variables
const ANALYTICS_KV_NAMESPACE = 'streamscale-analytics'
const R2_BUCKET_NAME = 'video-transcoder'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path.endsWith('master.m3u8')) {
    return handleMasterM3u8(request)
  } else if (path.endsWith('.m3u8')) {
    return handlePlaylistM3u8(request)
  } else if (path.endsWith('.ts')) {
    await incrementViewCount(path)
    // For .ts files, we just increment the count and pass through the request
    return fetch(request)
  }

  // For all other requests, pass through
  return fetch(request)
}

async function handleMasterM3u8(request) {
  const response = await fetch(request)
  const content = await response.text()

  const modifiedContent = content.replace(
    /^(.+\.m3u8.*)$/gm,
    (match, p1) => `${p1}?analytics=true`
  )

  return new Response(modifiedContent, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache'
    }
  })
}

async function handlePlaylistM3u8(request) {
  const url = new URL(request.url)
  
  // Only process if the analytics flag is set
  if (url.searchParams.get('analytics') === 'true') {
    await incrementViewCount(url.pathname)
    
    const response = await fetch(request)
    const content = await response.text()

    // Here we're not modifying the content, just counting the view
    // If you want to modify segment URLs, you can do it here

    return new Response(content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache'
      }
    })
  }

  // If no analytics flag, pass through the request
  return fetch(request)
}

async function incrementViewCount(path) {
  const parts = path.split('/')
  if (parts.length < 3) return // Ensure we have enough parts

  const userId = parts[1]
  const videoName = parts[2]
  const key = `views:${userId}:${videoName}`

  let views = await ANALYTICS_KV_NAMESPACE.get(key)
  views = views ? parseInt(views) + 1 : 1
  await ANALYTICS_KV_NAMESPACE.put(key, views.toString())
}

// Additional Worker for analytics retrieval
addEventListener('fetch', event => {
  event.respondWith(handleAnalyticsRequest(event.request))
})

async function handleAnalyticsRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path.startsWith('/analytics/')) {
    const parts = path.split('/')
    if (parts.length < 4) {
      return new Response('Invalid request', { status: 400 })
    }

    const userId = parts[2]
    const videoName = parts[3]
    const key = `views:${userId}:${videoName}`

    const views = await ANALYTICS_KV_NAMESPACE.get(key)

    return new Response(JSON.stringify({ userId, videoName, views: views || 0 }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response('Not Found', { status: 404 })
}