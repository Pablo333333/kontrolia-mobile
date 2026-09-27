# CONECTA Mobile

Field client for **CONECTA**, an operations and institutional communications platform. Operators and supervisors use it to open a work group, send a topic, follow replies, attach evidence from the site, and see where work sits on a map. Rules such as who may change a state, and what a reply does to the workflow, are enforced by the API. This app encodes how a message is composed before it is sent.

## Who uses it

| Role | In the app |
| --- | --- |
| **ADMIN** and **SUPERVISOR** | Managers. The home dashboard includes a 7-day trend. They can update the active group's identity. Creating groups, editing the full catalog, and the analytics workspace stay on the web app. |
| **OPERARIO** | Field user. Same create, reply, map, and close flows. The home screen points them at the operational inbox. |

Any signed-in user can create a topic, comment, attach files, close with "OK fin", and open the map. The app does not hide those actions by role. The API rejects what the role is not allowed to do.

## Work context

After login, the user works inside an **active work group**. Switching groups changes the catalog and the team identity shown in settings. A message with no recipient is addressed to the whole group. The user can store a WhatsApp number so the backend can send urgent alerts and the daily summary to that phone.

## Screens

**Home.** Overdue alerts, counts by state, and breakdowns by type, priority, and category. Managers also see how volume moved over the last seven days. From here the user starts a new topic or opens the inbox.

**Tracking.** The inbox of communication topics, split into active work and history (closed or archived). Search from this screen is semantic.

**Topic detail.** Opening a topic calls the API's open action, which moves a brand-new topic into in progress. The detail hosts the living document.

**Living document.** The working surface of a topic:

- An AI summary of the thread.
- Chat, files, and status history, updated live over Socket.IO.
- **OK fin**, which asks for confirmation and then closes the topic.
- **Continue topic**, which starts a new message linked to this one, with a `Re:` title.
- Photo, video, or file attachments. Files are limited to 50 MB. Videos picked from the gallery are limited to 120 seconds.

**Map.** Topics that have coordinates, filtered by workflow state. The default map center is Lima when nothing is plotted. A marker opens the same living document.

**New topic.** A new chain, or a continuation of an existing one. The user classifies the message, chooses how soon a response is needed, and may set a recipient, a voice note, GPS, or a photo that the API reads to suggest title and description.

**Smart drafting.** The API drafts a formal document. The user reviews and edits it, then saves it onto the topic thread or exports a PDF. Saving posts the text as a comment, so the API's reply rules apply.

**Settings.** Switch the active group, set the WhatsApp number, and choose inbox and search preferences. Managers can sync the group's display identity. Catalog editing is read-only here.

## How a new topic is built

The user writes a title and picks what kind of message it is:

- Coordination
- Paperwork (`TRAMITE`), which also requires a subtype: letter, official notice, or request
- Technical documents
- Agreements

The app matches that choice to a category and subcategory in the group's catalog by name, and falls back to the first entry when nothing matches. The title sent to the API is composed as `Category — Subcategory: user title` when that prefix is useful. New topics are created in the workflow state named `NUEVO`.

The user does not pick priority or a due date directly. They pick how soon they need a response, and the app derives both:

| Response window | Priority | Due |
| --- | --- | --- |
| Right now | Urgent | Now |
| Today | Urgent | End of today |
| Within two days | Medium | End of the day, two days out |
| More than two days | Low | End of the day, three days out |

If location permission is granted, the device coordinates are sent with the message so it can appear on the map.

## Notifications and offline use

On login the app registers an Expo push token. Tapping a notification that points at a topic opens that topic.

If the session check fails because the network is down, the signed-in session is kept. A local queue is sketched for creating a topic and changing its state while offline, but the on-device database is not wired up, so that queue does not persist. Search preference can be saved as literal or semantic; the inbox search still always calls semantic search.

## Stack

Expo and React Native, with Expo Router, TypeScript, TanStack Query, and Axios against the CONECTA API. Secure storage for the session, Expo location, camera, audio, and notifications, react-native-maps, and a Socket.IO client for the living document.
