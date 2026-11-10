# ItsYourBoi
- A Study Extension for Chromium based browsers to help you focus, with a gamified feel.

## Pomodoro timer

Open **Pomodoro Timer** from the extension popup. Start with 25 minutes of focus,
a 5-minute short break, and a 15-minute long break after every four completed
focus sessions. Each next session waits for you to press Start.

- Pause, resume, reset, skip, or switch session types.
- Adjust each length from 1 to 120 whole minutes in Settings. Saving resets the current timer.
- Track finished focus sessions and focused minutes, and keep a small task list.
- The timer continues when the popup closes. A browser notification announces completion.
- Progress is saved locally on your device; it is not shared with other users.
- Skipped and reset sessions do not earn progress. Statistics are lifetime totals.

### Try it locally

1. Download or clone this branch.
2. Open `chrome://extensions` (or `edge://extensions`) and enable Developer mode.
3. Choose **Load unpacked** and select the repository folder containing `manifest.json`.
4. Open the extension, then **Pomodoro Timer**. Use **Open in tab** for a larger view.
5. After pulling changes, click **Reload** on the extension card.

The extension needs only `storage`, `alarms`, and `notifications` permissions.
No host permissions, accounts, or build step are required. Browser/OS notification
settings may suppress alerts. Alarms can arrive late during sleep or browser shutdown;
on return the expired session completes once and the next session waits to start.
See [Chrome's alarm behavior](https://developer.chrome.com/docs/extensions/reference/api/alarms).

For a web preview, run `python3 -m http.server 8000` in the repository and open
`http://localhost:8000/src/pomodoro.html`. Preview mode uses local storage and needs
an open tab to display completion; background notifications require the extension.

### Tests

With Node.js 22 or later, run `npm test`. No dependencies need installing.
The suite covers timer transitions and a mocked extension worker including alarm
recovery, popup closure, persistence, notifications, and simultaneous messages.

Manual extension check: set focus to 1 minute, start, close the popup, and reopen
after a minute. Check that exactly one focus session is credited, the short break
is ready but paused, and a completion notification appears if notifications are allowed.
Also check pause/resume, resetting, all session modes, task persistence, and a long
break after four focus sessions.

## Helpful Resources

### JavaScript

[Importing classes from external JavaScript files](https://bobbyhadz.com/blog/javascript-import-class-from-another-file#import-a-class-from-another-file-using-javascript)

[Creating an HTML element using JavaScript](https://www.w3schools.com/jsref/met_document_createelement.asp)

[Adding an HTML class to an HTML element with JavaScript](https://www.w3schools.com/howto/howto_js_add_class.asp)