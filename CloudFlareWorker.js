const Repo = "Roblox-API-Dump"
const Path = "API-Dump.json"
const Owner = "ManlyTorch"

const GithubAPIUrl = "https://api.github.com/"

const CommitURL = `${GithubAPIUrl}repos/${Owner}/${Repo}/commits?path=${Path}`;
const UpdateUrl = `${GithubAPIUrl}repos/${Owner}/${Repo}/contents/${Path}`;

const RobloxAPIUrl = 'https://setup.rbxcdn.com/';
const VersionURL = 'https://clientsettingscdn.roblox.com/v2/client-version/WindowsStudio64';

async function SafeFetch(Url, Args) {
  const Resp = await fetch(Url, Args)

  if (!Resp.ok) {
    return new Response(`Failed to fetch ${Url} MessagE: ${JSON.stringify(Resp.json())} Status: ${Resp.status}`, {status: 500})
  } else {
    return Resp
  }
}

async function GetDumpVersion() {
  return (await (await SafeFetch(VersionURL, {method: "GET"})).json()).clientVersionUpload
}

async function GetAPIDump(Version) {
  const Response = await SafeFetch(`${RobloxAPIUrl}${Version}-API-Dump.json`);
  const JSONData = await Response.json();
  const JSONDump = JSON.stringify(JSONData, null, 2);
  return btoa(JSONDump);
}

async function GetLatestCommit(Token) {
  const Resp = await SafeFetch(CommitURL, {
    method: 'GET',
    headers: {
      'Authorization': `token ${Token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cloudflare-Worker',
    },
  })

  const CommitData = await Resp.json();  
  const CommitMessage = CommitData[0]?.commit?.message || '';

  return CommitMessage;
}

async function Getsha(Token) {
  const Resp = await SafeFetch(UpdateUrl, {
    method: 'GET',
    headers: {
      Authorization: `token ${Token}`,
      Accept: "application/vnd.github.v3+json",
      'User-Agent': 'Cloudflare-Worker',
    }
  })

  const JSONData = await Resp.json();
  return JSONData.sha
}

async function UpdateRepo(Dump, Version, Token) {
  const sha = await Getsha(Token);
  await SafeFetch(UpdateUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${Token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      'User-Agent': 'Cloudflare-Worker',
    },
    body: JSON.stringify({
      owner: "ManlyTorch",
      repo: Repo,
      path: Path,
      message: Version,
      content: Dump,
      sha: sha,
    })
  })
}

export default {
  async fetch(request, env) {
    const Token = env.GithubAPIKey // API Key
    try {
      const LatestCommit = await GetLatestCommit(Token);
      const Version = await GetDumpVersion();
      if (LatestCommit !== Version) {
        const Dump = await GetAPIDump(Version);
        await UpdateRepo(Dump, Version, Token)
        return new Response(`Succesfully updated to ${Version}`)
      } else {
        return new Response('Already Latest Version')
      }
    } catch (error) {
      return new Response(error.message)
    }
  }
};
