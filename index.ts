import { reposter } from "./src/reposter";

Bun.serve({
    async fetch( req ) : Promise<Response> {
        if( req.method === "GET") {
            const url = new URL(req.url)
            const sourceUrl = url.searchParams.get("url");
            if( ! sourceUrl ) return new Response("False");
            const response = await reposter(sourceUrl)
            return new Response(String(response))
        } else return new Response("Not found", {
            status: 404
        })
    },
    port: 3000,
    idleTimeout: 255
})

console.log("Listening on port 3000")