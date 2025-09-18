import { decode } from "https://deno.land/x/pngs@0.1.1/mod.ts";

async function getFaceColors(uuid: string): Promise<string[]> {
  const profileRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  const profile = await profileRes.json();
  const texturesValue = profile.properties.find((p: any) => p.name === "textures").value;
  const texturesJson = JSON.parse(atob(texturesValue));
  const skinUrl = texturesJson.textures.SKIN.url;

  const skinPng = await fetch(skinUrl).then(r => r.arrayBuffer());
  const { width, height, pixels } = decode(new Uint8Array(skinPng)); // pixels = Uint8Array RGBA

  // helper to read a pixel
  function getPixel(x: number, y: number): [number,number,number,number] {
    const idx = (y * width + x) * 4;
    return [
      pixels[idx],
      pixels[idx+1],
      pixels[idx+2],
      pixels[idx+3],
    ];
  }

  const colors: string[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // face pixel
      const [fr,fg,fb,fa] = getPixel(8+x,8+y);
      // helmet pixel
      const [hr,hg,hb,ha] = getPixel(40+x,8+y);

      // alpha-blend helmet over face
      const aH = ha/255;
      const aF = fa/255;
      const r = Math.round(hr*aH + fr*(1-aH));
      const g = Math.round(hg*aH + fg*(1-aH));
      const b = Math.round(hb*aH + fb*(1-aH));

      colors.push(`#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`);
    }
  }
  return colors;
}


Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    if (!uuid) return new Response(JSON.stringify({error:"Missing uuid"}),{status:400});
    const colors = await getFaceColors(uuid);
    return new Response(JSON.stringify(colors),{headers:{"Content-Type":"application/json"}});
  } catch(e){
    return new Response(JSON.stringify({error:e.message}),{status:500});
  }
});
