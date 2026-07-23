import { WebClient } from "@slack/web-api";

let slackClient: WebClient | null = null;

function getSlackClient(): WebClient {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  if (!slackClient) {
    slackClient = new WebClient(token);
  }

  return slackClient;
}

/**
 * Looks up a Slack user by email and sends them a private direct message.
 * Requires a Slack bot token with `users:read.email` and `chat:write` scopes.
 */
export async function sendPrivateSlackDM(
  employeeEmail: string,
  message: string
): Promise<void> {
  const client = getSlackClient();

  const lookup = await client.users.lookupByEmail({
    email: employeeEmail,
  });

  const slackUserId = lookup.user?.id;

  if (!slackUserId) {
    throw new Error(`No Slack user found for email: ${employeeEmail}`);
  }

  const conversation = await client.conversations.open({
    users: slackUserId,
  });

  const channelId = conversation.channel?.id;

  if (!channelId) {
    throw new Error(`Could not open DM channel for ${employeeEmail}`);
  }

  await client.chat.postMessage({
    channel: channelId,
    text: message,
  });
}
