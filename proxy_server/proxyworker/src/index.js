class CDNForwarderWorker {
  constructor(env) {
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const newUrl = new URL(url.pathname, this.env.CDN_URL);
    // const headers = new Headers(request.headers);
    if(url.pathname.endsWith("master.m3u8")){
      await this.env.ANALYTICS_WORKER.fetch(request);
    }
    // const object = await this.env.MY_BUCKET.get(url.pathname);
    // if(object === null){
    //   return new Response(JSON.stringify({message:"Object not foound", status:404}))
    // }
    // const headers = new Headers();
    // object.writeHttpMetadata(headers);
    // headers.set("etag",object.httpEtag);
    // return new Response(object.body, {
    //   headers
    // })
    const headers = new Headers(request.headers);
    headers.delete("Host");
    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers,
      body: request.body
    });
    return fetch(newRequest);
  }
}

export default {
  async fetch(request, env) {
    const forwarder = new CDNForwarderWorker(env);
    return forwarder.fetch(request);
  }
};