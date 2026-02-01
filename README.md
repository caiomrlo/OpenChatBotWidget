# OpenChatBotWidget

OpenChatBotWidget is a drop-in chat bubble that lets you embed an n8n-powered conversation flow on any website. The widget is fully customizable, ships with a ready-to-use CSS/JS bundle, and knows how to ask the user for structured data (email, phone, name) whenever your automation requests it.

## Features
- Lightweight widget written in vanilla JS/CSS and delivered via CDN.
- Inline configuration for webhook endpoints, branding, theme, and speech bubble behaviour.
- Built-in onboarding view with predefined quick-reply buttons and optional proactive bubble ping.
- Dynamically renders custom inputs when the backend requests specific fields (`email`, `phone`, `name`).
- Emits simple analytics events (`chatWidgetNewChat`, `chatWidgetUserMessage`) and notification sounds when the bot replies.

## Repository Layout
- `src/script.js` – widget logic, DOM rendering, field handling, webhook communication.
- `src/style.css` – layout, animations, and theme variables for both desktop and mobile.
- `src/example.html` – minimal usage example with inline configuration for local testing.

## Quick Start
1. Expose an HTTP endpoint (n8n Chat Trigger is recommended) capable of handling the payloads described below.
2. Paste the widget assets into your page. **The inline configuration must come before the script tag**, so the widget can read `window.OpenChatBotWidgetConfig` on load.

```html
<link rel="stylesheet" href="/style.css">

<script>
window.OpenChatBotWidgetConfig = {
  webhook: {
    url: 'https://your-n8n-endpoint',
    route: 'general'
  },
  branding: {
    logo: 'https://yourcdn/logo.png',
    name: 'My Support',
    welcomeText: 'Hey there!',
    responseTimeText: 'We usually reply in a few minutes.',
    newChatButtonText: { text: 'Start chat', enabled: true },
    poweredBy: { text: 'by OpenChatBotWidget', link: 'https://github.com/caiomrlo' }
  },
  style: {
    primaryColor: '#215dff',
    secondaryColor: '#218eff',
    backgroundColor: '#ffffff',
    fontColor: '#333333',
    position: 'right'
  },
  speechBubble: { enabled: true, text: 'Need help?' },
  predefinedMessages: [
    'I want to talk to sales',
    'I need support'
  ]
};
</script>

<script src="/script.js" defer></script>
```

3. Deploy your page. The widget automatically injects the DOM, toggles the bubble, and handles the chat UI.

## Configuration Reference
| Key | Description |
| --- | --- |
| `webhook.url` | HTTP endpoint that receives widget payloads (ideal for an n8n Webhook/Chat Trigger). |
| `webhook.route` | Custom route/queue name forwarded to the backend alongside each message. |
| `branding.logo`, `branding.name` | Logo URL and visible title in the header card. |
| `branding.welcomeText`, `branding.responseTimeText` | Text used on the opening screen before the chat starts. |
| `branding.newChatButtonText` | `{ text, enabled }` to customize/hide the "Start chat" CTA. |
| `branding.poweredBy` | `{ text, link }` displayed in the footer for attribution. |
| `style.primaryColor`, `style.secondaryColor` | Accent colors applied to the UI and send button. |
| `style.backgroundColor`, `style.fontColor` | Base bubble background/font colors via CSS variables. |
| `style.position` | `'right'` (default) or `'left'` – controls which side the widget docks on. |
| `speechBubble.enabled`, `speechBubble.text` | Enables the proactive speech bubble and its label. |
| `predefinedMessages` | Array of strings rendered as quick-reply buttons on the welcome card. |

## Webhook Contract
The widget talks to your backend via POST requests to `webhook.url`.

- **Start conversation (`loadPreviousSession`)**
  ```json
  [{
    "action": "loadPreviousSession",
    "sessionId": "<uuid>",
    "route": "general",
    "metadata": { "userId": "" }
  }]
  ```
- **Send message (`sendMessage`)**
  ```json
  {
    "action": "sendMessage",
    "sessionId": "<uuid>",
    "route": "general",
    "chatInput": "user text or field/name data",
    "metadata": {
      "userId": "",
      "currentUrl": "https://page-where-widget-runs"
    }
  }
  ```

### Expected response format
Return JSON containing any of the following keys:
- `output`, `output2`, `output3`, ... – rendered sequentially as bot messages (supports `**bold**` and `\n` line breaks).
- `button1`, `button2`, ... – optional quick-reply buttons shown under the latest bot response.
- `field` – asks the widget to display a custom input. Accepted values: `email` (`type="email"`), `phone` (`type="tel"`), `name` (`type="text"`). When the user submits, the widget sends `field/<fieldName>:<value>` back to the webhook.

Example payload to collect an email address:
```json
{
  "output": "What's your email address?",
  "field": "email"
}
```

## Recommended n8n Usage
1. Create a workflow with the **Chat Trigger** (or HTTP Webhook) node. This node will receive the payloads shown above.
2. Build your conversation logic inside n8n. Emit the JSON response with `output`, `button`, and `field` keys to drive the widget.
3. Optionally store `sessionId`-scoped state so future `loadPreviousSession` calls can restore context.
4. Because the widget only requires a standard POST endpoint, you can also plug it into other backends or serverless functions if they follow the same contract.

## Local Testing
1. Open `src/example.html` directly in a browser or via a simple HTTP server.
2. Update the inline `OpenChatBotWidgetConfig` to point at your staging webhook.
3. Modify `src/style.css` or `src/script.js` while watching the browser console for logs (`Webhook Error` will be printed when the endpoint is unreachable).

## Contributing
Bug reports and improvements are welcome. Fork the repo, run your changes locally (no build step required), and open a pull request describing the fix or enhancement.
