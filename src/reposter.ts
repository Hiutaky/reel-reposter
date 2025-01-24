import { randomUUIDv7 } from "bun"

const fetchCloudflare = async (prompt: string) => (await(await fetch(`${process.env.CLOUDFLARE_ENDPOINT}?type=text&prompt=${prompt}`)).text()).replaceAll('"', "")

export const reposter = async (sourceUrl: string) => {
    try {
        const response = await fetch(sourceUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
            }
        })
        const textResponse = await response.text()
        // @ts-ignore
        const videoVersions = JSON.parse( textResponse.match(/"video_versions":(\[[^\]]+\])/)[1]! as string )
        const captionMatch = textResponse.match(/"caption":{"text":"([^"]+)"/)
        const caption = captionMatch ? captionMatch[1] : null
        console.log("Reposing:", caption,  "\n")
        const videoResponse = await fetch(videoVersions.at(0).url)
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoId = randomUUIDv7();
        await Bun.write(
            Bun.file(`./videos/${videoId}.mp4`),
            videoBuffer
        )
        
        const titlePrompt = `
            Generate a title for a youtube short video, MAX 100 CHARS, DONT INCLUDE ANY HASHTAG,
            DON'T INCLUDE ANY INTRODUCTION TEXT LIKE: HERE'S THE TITLE OR SIMILAR,
            Starting title is: ${caption}
        `
        const descriptionPrompt = `
            Generate a description for a youtube short video, MAX 300 CHARS, DONT INCLUDE ANY HASHTAG,
            Don't include any introduction text like: Here's the decription or similar
            Starting topic is: ${caption}
        `
        
        let title = await fetchCloudflare(titlePrompt);
        if( title.length <= 80 )
            title = `${title} #shorts #shortsvideo`
        
        console.log('Title:', title,  "\n");

        const description = await fetchCloudflare(descriptionPrompt);
        console.log('Description:', description, "\n");
        
        const cmd = [
            "python3", "publish.py",
            "--profile", process.env.FIREFOX_PROFILE,
            "--id", videoId,
            "--title", `"${title}"`,
            "--description", `"${description}"`
        ] as string[]
        
        console.log("cmd:", cmd.join(" "), "\n")
        
        const { stdout, stderr } = Bun.spawnSync(cmd, {
            cwd: "./scripts"
        })
        Bun.spawnSync(["rm", `./videos/${videoId}.mp4`]);
        const stdoutFormat = stdout.toString()
        console.log(stdoutFormat);
        console.error(stderr?.toString())
        console.log( "\n")
        if( stdoutFormat.search("youtube") )
            return stdout.toString();
        else throw "Error during upload"
    } catch ( e ) {
        console.error(e)
        return e;
    }
}