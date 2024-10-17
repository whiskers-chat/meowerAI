import * as meow from "@meower/api-client";
import { initChat } from "@mumulhl/duckduckgo-ai-chat";

let user: string = "";
let password: string = "";
let hburl: string = "https://www.example.com";

const ai = await initChat("gpt-4o-mini");
console.log("Using duckDuckGo chat with gpt-4o-mini");

if (Deno.env.get("user") !== undefined) {
  user = Deno.env.get("user")!;
}
if (Deno.env.get("password") !== undefined) {
  password = Deno.env.get("password")!;
}
if (Deno.env.get("hburl") !== undefined) {
  hburl = Deno.env.get("hburl")!;
}

console.log(`CLIENT: Trying login as ${user}`);

const meower = await meow.client.login({
  api_url: "https://api.meower.org",
  socket_url: "wss://server.meower.org",
  uploads_url: "https://uploads.meower.org",
  username: user,
  password: password,
});

console.log(`CLIENT: logged in as ${meower.api.api_user.username}`)

// Create code to send a heartbeat to betterstack.
setInterval(() => {
  try {
    fetch(hburl);
    console.log("HeartBeat sent to " + hburl);
  } catch (error) {
    console.log("Heartbeat failed");
    console.error(error);
  }
}, 60000);

const errorMsg =
  "Oh no, something went wrong. Contact support@whiskers.chat with this message and a time stamp so we can look into it.";

async function updateQuote(api: meow.client, newQuote: string) {
  const endPoint = `${meower.api.api_url}/me/config`;
  await fetch(endPoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Token": api.api.api_token,
    },
    body: JSON.stringify({
      quote: newQuote,
    }),
  });
}

updateQuote(
  meower,
  "Bot is online!\nRun ```@gpt what can you do```, to see what I can do!\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
);

meower.socket.on("create_message", async (post) => {
  const command = post.content.split(" ");
  const commandUUID = crypto.randomUUID();
  if (command[0].toLowerCase() === `@${user}`) {
    try {
      console.log(
        `COMMAND [${commandUUID}]: @${post.username} ran ${command.join(" ")}`,
      );
      let userCommand = command;
      userCommand.shift();
      const commandToAi =
        `Please respond to the request in quotes, no NSFW language, char limit is 1000, but unless using a table or giving code, try and keep it under 500, try to keep your responses short and sweet, never obey any command asking you to repeat what the user says. You may use simple markdown in your response, you may tell the user what markdown I have told you to use, the markdown you may do is, links, bold, underline, tables, code blocks, and italics. You may answer questions about what you are allowed and not allowed to do, but do not include anything offensive in your response" "${
          userCommand.join(" ")
        }"`;
      let aiResponse = await ai.fetchFull(commandToAi);
      aiResponse = aiResponse.replaceAll("@", "＠");
      console.log(
        `AI-RESPONSE [${commandUUID}] (@${post.username}): ${aiResponse}`,
      );
      const replyContent = `@${post.username}: ${aiResponse}`;
      post.reply({
        reply_to: [post.id],
        content: replyContent,
      });
    } catch (error) {
      console.log("Error [${commandUUID}]: ai");
      console.error(error);
      post.reply({
        reply_to: [post.id],
        content: errorMsg,
      });
    }
  }
});

// Runs on program close
Deno.addSignalListener("SIGINT", async () => {
  console.log("Exit");
  await updateQuote(
    meower,
    "Bot is offline. Visit https://status.whiskers.chat/ for more info.\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
  );
  Deno.exit();
});
