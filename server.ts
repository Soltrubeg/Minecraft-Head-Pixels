// import dependencies
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.1/mod.ts";

// helper to get face colors
async function getFaceColors(uuid: string): Promise<string[]> {
  // 1. Mojang session profile
  const profileRes = await fetch(
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
  );
  if (!profileRes.ok) throw new Error("Invalid UUID");
  const profile = await profileRes.json();

  // 2. base64 decode 'value'
  const texturesValue = profile.properties.find(
    (p: any) => p.name === "textures"
  ).value;
  const texturesJson = JSON.parse(atob(texturesValue));

  // 3. SKIN texture URL
  const skinUrl = texturesJson.textures.SKIN.url;
  const skinImg = await loadImage(skinUrl);

  // 4. draw face + helmet
  const canvas = createCanvas(8, 8);
  const ctx = canvas.getContext("2d");
  // face region
  ctx.drawImage(skinImg, 8, 8, 8, 8, 0, 0, 8, 8);
  // helmet overlay
  ctx.drawImage(skinImg, 40, 8, 8, 8, 0, 0, 8, 8);

  // 5. extract pixel data
  const imgData = ctx.getImageData(0, 0, 8, 8).data;
  const colors: string[] = [];
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    // ignore alpha for now
    colors.push(
      `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
    );
  }

  return colors;
}

// serve endpoint
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    if (!uuid) {
      return new Response(JSON.stringify({ error: "Missing uuid" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const colors = await getFaceColors(uuid);

    return new Response(JSON.stringify(colors), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
// run with: deno run --allow-net server.ts