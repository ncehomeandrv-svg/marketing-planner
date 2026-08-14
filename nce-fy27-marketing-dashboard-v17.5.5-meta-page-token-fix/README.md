# NCE FY27 Marketing Dashboard V16

Adds Outlook notification delivery through Microsoft Graph while preserving in-app notifications, comments, change requests, publishing-failure management, Melbourne-time scheduling, Dotdigital, Meta, LinkedIn, QStash, password protection, shared drafts and previews.

## Outlook setup

Set these variables in Vercel and redeploy:

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=https://nce-marketing-planner.vercel.app/api/microsoft/callback
JENNA_NOTIFICATION_EMAIL=jhall@nce.com.au
KIEREN_NOTIFICATION_EMAIL=kbinion@nce.com.au
```

Open the dashboard and click **Connect Outlook**. Sign in with the mailbox that should send the notifications and approve `User.Read` and `Mail.Send`. The refresh token is stored in the connected Vercel KV database. In-app notifications continue if Outlook is disconnected or temporarily unavailable.

## V16.1 compile fix

Corrected the Outlook connection component so its React effect does not return a Promise. The status request now runs inside a synchronous effect callback using `void load()`.


## V16.2 header typography
- Standardised all header controls to the same Lexend size, weight and height.
- Removed the Outlook link underline and normalised icon sizing and spacing.
- Preserved the larger dashboard title and supporting subtitle hierarchy.

## V16.3 — Outlook diagnostics

- Adds a Send test email control to the Outlook connection panel.
- Shows the exact Microsoft Graph success or failure response.
- Stores a server-side Outlook delivery log in Vercel KV.
- Records failed automatic Outlook notifications in Publishing issues.
- Fixes notification drawer text contrast on the white background.


## V16.4 Outlook OAuth diagnostics

Microsoft callback failures now preserve and display the exact safe OAuth stage and error description, including consent, redirect URI, client secret, tenant, state-cookie and token-exchange failures. Secrets and tokens are never included in the browser message.


## Rich Outlook emails
Workflow emails now include the campaign title, channel, segment, workflow stage, approval status, planned date, scope and a deep link that opens the exact calendar item.


## V16.8.2 notification rules

Recurring Blog items do not send Outlook workflow emails. LinkedIn workflow emails are enabled: Jenna owns the brief and approval, Kieren is the automatic asset creator, and Jenna remains the publisher. Blog items remain owned by Kieren and use `Not required` approval.


## V17 campaign controls
- Fixed bottom-right New Campaign button
- Removed New Ticket button
- Duplicate any calendar item
- Remove calendar items with confirmation
- Uploaded assets are stored in shared KV and can be downloaded across browsers


## QStash destination URL
The scheduler normalises APP_URL, NEXT_PUBLIC_APP_URL, VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL into an absolute HTTPS origin before creating Meta and LinkedIn callback URLs. Recommended production variable: `APP_URL=https://nce-marketing-planner.vercel.app`.


## V17.2 QStash destination correction

QStash publish destinations are now appended as raw absolute HTTPS URLs, matching the QStash REST API path format. The previous URL encoding caused QStash to see `https%3A%2F%2F...` as a scheme-less destination. QSTASH_URL is also normalised when Vercel stores it without a scheme.

## V17.3 long-range Meta scheduling

Meta posts can now be planned more than seven days ahead without upgrading QStash. Long-range posts are stored in Vercel KV. A QStash schedule calls `/api/meta/dispatcher` every 15 minutes; when a post is within six days of its Melbourne publish time, the dispatcher queues the exact publish message using `Upstash-Not-Before`.

The Meta panel displays Planned, Queued, Published or Failed status and includes an Unschedule button. Unscheduling removes a long-range job from KV or cancels its pending QStash message before clearing the schedule from the calendar item.

## V17.4.1 ticket type fix
- New Ticket — Ad Hoc now opens and saves as `type: ticket`.
- The create form includes Campaign, Ad hoc ticket and Important date as real type options.
- Ticket-specific title and scope placeholders are shown.


## V17.5 B2B blog cadence

- Adds two Commercial website blogs per month.
- Adds two Trade / OEM website blogs per month.
- All four are owned, briefed, created and published by Kieren with no approval required.
- Default dates are the first through fourth Mondays and remain draggable.


## V17.5.1

- Removed the two monthly Trade / OEM blog cards.
- Retained two Commercial blogs per month and the existing weekly retail blogs.
- Legacy Trade / OEM blog cards are removed from browser and shared saved data on load.


## V17.5.2 workflow email reliability
Workflow notification emails are triggered server-side after a successful shared draft save. This covers Brief Ready, Ready for Review, Changes Required/Changes requested, and Approved. LinkedIn follows the same workflow; recurring blog workflow emails remain suppressed.


## V17.5.3 LinkedIn workflow
LinkedIn workflow emails are enabled. Jenna is the brief owner, approver and publisher. Kieren is automatically assigned as the asset creator and card owner. Existing saved LinkedIn cards are normalised to this ownership model on load.

## V17.5.4 Meta media upload fix
- Sends Facebook and Instagram media creation fields as form-encoded Graph API requests.
- Validates that every scheduled media URL is publicly reachable over HTTPS and served with an image/video content type.
- Waits for Instagram image and carousel child containers to finish processing before publishing.
- Returns clearer asset errors instead of Meta error `(#324) Requires upload file`.


## V17.5.5 Meta Page identity fix
Facebook publishing now verifies that the configured token authenticates as the configured Page. If the supplied token is a user or system-user token, the app attempts to resolve the Page access token before creating unpublished carousel media and the final Page post.
